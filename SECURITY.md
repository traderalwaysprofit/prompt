# Security Policy

## Supported version

Security fixes target the current `main` branch and the production deployments derived from it. Historical branches and superseded previews are not supported unless the repository owner explicitly reactivates them.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability reporting when it is available. If it is unavailable, contact `@traderalwaysprofit` through an existing private project channel before sharing technical details.

Include:

- affected route, component, or commit;
- impact and realistic attack conditions;
- minimal reproduction using synthetic data;
- whether production access or data may be affected;
- suggested mitigation, if known.

Do not include secrets, OTPs, Access assertions, API keys, real lead records, private contact data, or production exports. Do not perform destructive testing, persistence, privilege escalation beyond the minimum proof, denial-of-service testing, or data exfiltration.

## Response process

The maintainer will validate the report, classify severity, contain exposure when necessary, prepare a tested fix, and coordinate disclosure after remediation. Timing depends on severity and reproducibility; this project does not promise a public response-time SLA or bug bounty.

## Security boundaries

High-risk areas include:

- Cloudflare Workers, routes, DNS, Access, D1, and runtime secrets;
- authentication, authorization, role, and ownership enforcement;
- B2B provider gateways, rate limiting, URL validation, and anti-SSRF controls;
- CRM import/export, migrations, audit logs, and production data;
- GitHub Actions, dependency changes, rulesets, and deployment credentials.

A passing CI run does not authorize production deployment or data mutation. Follow `GOVERNANCE.md` for approval and rollback requirements.
