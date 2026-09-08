# ADR-001 — Separate MASUMI Sales CRM cloud application

- **Status:** Accepted
- **Owner:** Samson
- **Decision date:** 2026-09-08
- **Requirements:** BUS-001–005, PRD-001–009, DAT-001–006, SEC-001–012 in Issue #53

## Context

The first CRM release stores data in `localStorage`. That design is appropriate for a local-only tool but cannot provide a shared, cross-device source of truth for multiple sales users. The data includes lead and PIC details, so the public Tools Hub must not become the trust boundary for CRM authorization.

## Decision drivers

- Shared data for Samson, Bu Lita, and Bu Mei.
- Server-side ownership enforcement.
- Isolation from public Tools and Google Contacts behavior.
- Independent deployment and rollback.
- Auditability and controlled migration.

## Decision

Run the operational CRM at `crm.samson.web.id` as a separate Worker application. Use Cloudflare Access OTP email for the outer access gate and application roles for authorization. Access D1 only through the CRM Worker. Keep the public Tools Hub card and route as the entry point.

The CRM uses separate preview and production resources. The existing local CRM remains available as the migration source until production verification succeeds.

## Options considered

1. **Keep localStorage-only:** rejected because it cannot provide shared persistence.
2. **Expose D1 directly to the browser:** rejected because database authorization must remain server-side.
3. **Add CRM endpoints to the existing public Worker:** rejected because it increases coupling and the impact of configuration mistakes.
4. **Separate CRM Worker and custom domain:** accepted for isolation and clearer security boundaries.

## Consequences

- A second Worker build/deployment pipeline is required.
- Access identity must map to an active application user.
- Database migrations and preview/production isolation become release gates.
- The Tools Hub can evolve independently of CRM operations.

## Supersession

Do not edit this accepted decision silently. A material change to hosting, identity, database, or trust boundaries requires a new ADR that supersedes ADR-001.
