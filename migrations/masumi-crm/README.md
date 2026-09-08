# MASUMI CRM migrations

Cloudflare D1 migrations will be added in sequence beginning with `0001_initial.sql` during the database-schema step.

Rules:

- never store production prospect data in migration files;
- never reuse or renumber an applied migration;
- preview and production execute the same reviewed migrations;
- destructive migration requires a backup, rollback plan, and manual approval;
- seed data is limited to explicitly approved application users and must not contain secrets.
