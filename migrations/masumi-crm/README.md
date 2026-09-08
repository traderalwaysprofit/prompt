# MASUMI CRM migrations

Cloudflare D1 migrations are stored here and applied in filename order. `0001_initial.sql` creates the local schema for application users, leads, import jobs, and audit logs.

Rules:

- never store production prospect data in migration files;
- never reuse or renumber an applied migration;
- preview and production execute the same reviewed migrations;
- destructive migration requires a backup, rollback plan, and manual approval;
- migration files never contain prospect, sample, or production data;
- application-user provisioning is a separate approved operation and must not be committed here.

The base `wrangler.crm.jsonc` binding uses an all-zero local-only placeholder ID. Preview and production bindings are intentionally absent because Wrangler environment bindings are not inherited. Real database IDs may only be added after the corresponding manual infrastructure gate.
