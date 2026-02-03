<!--
Sync Impact Report
==================
Version Change: N/A → 1.0.0 (Initial creation)

Added Sections:
- Principle I: Test-First Development
- Principle II: Security-First
- Principle III: Pragmatic Simplicity
- Principle IV: Data Integrity
- Principle V: RESTful API Standards
- Section: Technology Constraints
- Section: Development Workflow
- Section: Governance

Templates Status:
- .specify/templates/plan-template.md - Constitution Check section references principles ✅ compatible
- .specify/templates/spec-template.md - Requirements format aligns ✅ compatible
- .specify/templates/tasks-template.md - TDD workflow references align ✅ compatible

Deferred Items: None

Follow-up TODOs: None
==================
-->

# Store-POS Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

All new features and bug fixes MUST follow the Test-Driven Development workflow:
1. Write failing test(s) that define expected behavior
2. Run tests to confirm they fail (Red phase)
3. Implement minimal code to make tests pass (Green phase)
4. Refactor while keeping tests green (Refactor phase)

**Requirements:**
- Tests MUST exist before implementation code is written
- Tests MUST fail before implementation begins
- Red-Green-Refactor cycle is strictly enforced
- Integration tests are required for API endpoints
- Contract tests are required for cross-component communication

**Rationale:** Store-POS handles financial transactions where bugs can cause monetary loss.
TDD catches errors early and provides regression protection for critical business logic.

### II. Security-First

All code MUST adhere to security best practices appropriate for a system handling
financial transactions and customer data:

- **Input Validation:** All API endpoints MUST validate and sanitize input data
- **No Plaintext Credentials:** Passwords MUST be hashed; no secrets in code or logs
- **Audit Logging:** All transactions, authentication events, and admin actions MUST be logged
- **Authorization:** All protected routes MUST verify user permissions before processing
- **OWASP Compliance:** Code MUST not introduce OWASP Top 10 vulnerabilities
  (XSS, SQL/NoSQL injection, CSRF, etc.)

**Rationale:** POS systems handle money and customer data. Security failures can result in
financial loss, data breaches, and legal liability.

### III. Pragmatic Simplicity

Code SHOULD be as simple as possible while allowing reasonable forward-thinking architecture:

- **YAGNI:** Do not implement features until they are needed
- **DRY with Judgment:** Abstract when pattern appears 2-3 times, not preemptively
- **Delete Unused Code:** Remove dead code rather than commenting it out
- **Minimal Dependencies:** Justify new dependencies; prefer built-in solutions
- **Readable Over Clever:** Prefer clear, understandable code over "elegant" complexity

**Exceptions:** Reasonable architecture patterns (MVC, services layer) are permitted when they
improve maintainability without adding unnecessary abstraction layers.

**Rationale:** The existing codebase uses straightforward jQuery + Express patterns. Maintaining
simplicity reduces onboarding time and debugging complexity.

### IV. Data Integrity

Database operations for transactions and inventory MUST maintain data integrity:

- **Atomic Transactions:** Sales operations MUST complete fully or not at all;
  partial transaction states are not permitted
- **Inventory Consistency:** Stock quantities MUST accurately reflect completed transactions;
  inventory decrements MUST occur only after transaction confirmation
- **Referential Integrity:** Related records (transaction items, customer references)
  MUST maintain valid relationships
- **Backup Capability:** System MUST support data backup and recovery procedures

**Rationale:** Financial records and inventory counts are business-critical data.
Inconsistencies can cause revenue loss, audit failures, and operational problems.

### V. RESTful API Standards

All Express API routes MUST follow consistent conventions:

- **HTTP Methods:** Use appropriate verbs (GET=read, POST=create, PUT/PATCH=update, DELETE=remove)
- **Status Codes:** Return correct HTTP status codes (200 success, 201 created, 400 bad request,
  401 unauthorized, 404 not found, 500 server error)
- **Error Responses:** Return consistent error format: `{ error: true, message: string }`
- **Success Responses:** Return consistent success format with relevant data
- **Route Naming:** Use plural nouns for resources (`/api/users`, `/api/transactions`)

**Rationale:** Consistent API design reduces frontend integration bugs and makes the
codebase predictable for all developers.

## Technology Constraints

**Stack Requirements:**
- **Framework:** Next.js 16 with App Router
- **Frontend:** React 19, Tailwind CSS, Radix UI components
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js v5 with credentials provider
- **Testing:** Vitest (unit tests), Playwright (E2E tests)

**Architecture Boundaries:**
- API routes in `src/app/api/` handle all business logic
- Prisma client is the sole database access layer
- Authentication via NextAuth session checks on protected routes
- No direct SQL queries; use Prisma client exclusively

## Development Workflow

**Before Starting Work:**
1. Verify feature/fix aligns with constitution principles
2. For new features: Write specification with acceptance criteria
3. For bugs: Document reproduction steps and expected behavior

**During Development:**
1. Create feature branch from master
2. Write failing tests first (Principle I)
3. Implement minimal solution
4. Validate security implications (Principle II)
5. Review for unnecessary complexity (Principle III)
6. Verify data operations are safe (Principle IV)
7. Ensure API consistency (Principle V)

**Before Merge:**
1. All tests pass
2. No lint errors or warnings
3. Changes reviewed against constitution principles

## Governance

**Authority:** This constitution supersedes conflicting practices. All development decisions
MUST align with these principles.

**Amendments:**
- Amendments require documented justification
- Changes must include migration plan for affected code
- Version number increments per semantic versioning:
  - MAJOR: Principle removal or incompatible redefinition
  - MINOR: New principle or material expansion
  - PATCH: Clarifications and wording improvements

**Compliance:**
- All PRs MUST be verified against constitution principles
- Complexity beyond these guidelines MUST be documented with justification
- See CLAUDE.md for runtime development guidance specific to this codebase

**Version**: 1.0.0 | **Ratified**: 2025-01-26 | **Last Amended**: 2025-01-26
