## Outcome

<!-- State the user or operational result, not only the files changed. -->

## Scope

<!-- List included changes and explicit non-goals. -->

## Risk class

- [ ] Low — documentation or non-runtime metadata
- [ ] Standard — runtime code, UI, tests, or dependencies
- [ ] High — auth, security, infrastructure, DNS, secrets, migrations, or production data

## Verification

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:coverage`
- [ ] `npm run test:tools`
- [ ] Relevant build, Wrangler, and Browser E2E checks
- [ ] N/A items are explained below

Evidence / exceptions:

## Security and data

- [ ] No secret, credential, OTP, token, or real production/CRM data is included
- [ ] Authorization, ownership, input validation, logging, and dependency impact were considered
- [ ] Synthetic fixtures/screenshots are clearly marked `TEST-` or `E2E-`

## Deployment and rollback

<!-- State deployment steps, production verification, and rollback. Write "Not applicable" for non-runtime changes. -->

## Approval boundary

- [ ] No merge, deployment, external mutation, or production-data action was performed without explicit owner approval
- [ ] AI-assisted implementation, if material, has been human-reviewed
