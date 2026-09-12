# MASUMI CRM staging provisioning

## Purpose

Provision the protected MASUMI CRM staging environment from GitHub without touching production resources.

Target resources:

- Worker: `samson-masumi-crm-preview`
- D1: `masumi-crm-preview`
- hostname: `crm-preview.samson.web.id`
- Access application: `MASUMI CRM Preview`
- Access policy: `MASUMI CRM Preview Allow`
- GitHub Environment: `masumi-crm-preview`

The provisioner refuses a hostname that is not a preview hostname under `samson.web.id`, and the generated Wrangler config leaves the production route `crm.samson.web.id` unchanged.

## GitHub Environment inputs

Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CRM_PREVIEW_ADMIN_EMAIL`

Optional variable:

- `CRM_STAGING_HOSTNAME` (defaults to `crm-preview.samson.web.id`)

Never commit the API token or user email to repository files.

## Required Cloudflare token scope

Keep the token restricted to the SAMSON Cloudflare account and `samson.web.id` zone. The staging workflow needs enough permission to:

- deploy Workers
- read/create/apply D1 preview migrations
- read/create/update Access applications and policies
- read the Zero Trust organization `auth_domain`
- attach the Worker custom domain for `crm-preview.samson.web.id`

Use least privilege and do not grant production-only resources to a preview-only token.

## Operation

The workflow `.github/workflows/masumi-crm-staging-provision.yml` is manual (`workflow_dispatch`) and uses the protected `masumi-crm-preview` GitHub Environment.

It performs:

1. input and credential validation
2. staging regression tests
3. idempotent D1 preview resolution
4. idempotent Access application/policy provisioning
5. Access audience and issuer resolution
6. protected preview Wrangler config generation
7. D1 migrations
8. CRM build and Worker deploy
9. Access gate verification

Existing staging Access resources are reused. The named allow policy is updated only when its configured preview Admin email differs.

## Security behavior

- staging deployment disables the `workers.dev` route in its generated Wrangler config
- Access is expected to return HTTP 302 or 403 to an anonymous staging health request
- production D1 and `crm.samson.web.id` are never configured by this workflow
- no production lead data is seeded or imported

## Manual gate before first run

Before the first staging provisioning run, an authorized repository/Cloudflare administrator must:

1. extend or replace the preview Cloudflare API token with the required staging permissions
2. save the resulting token in the existing `CLOUDFLARE_API_TOKEN` environment secret
3. add `CRM_PREVIEW_ADMIN_EMAIL` to the `masumi-crm-preview` GitHub Environment
4. optionally set `CRM_STAGING_HOSTNAME=crm-preview.samson.web.id`
5. approve the protected GitHub Environment when the workflow is dispatched, if environment approval is enabled

These bootstrap credential actions intentionally remain manual.
