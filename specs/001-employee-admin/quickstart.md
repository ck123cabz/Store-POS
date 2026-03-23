# Quickstart: Employee Admin Dashboard Completion

**Feature**: 001-employee-admin
**Date**: 2026-03-24

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- `.env` configured with `DATABASE_URL`

## Setup

```bash
npm install
npx prisma migrate dev   # No new migrations for this feature
npx prisma db seed        # Seeds include employees, shifts, payments
npm run dev               # http://localhost:3000
```

Login: `admin` / `admin`

## Files to Modify

### New Files
| File | Purpose |
|------|---------|
| `src/lib/employee-status.ts` | Status transition map + validation function |
| `src/lib/role-presets.ts` | Role preset definitions (Cashier, Manager, Kitchen Staff) |
| `src/components/employees/employee-side-panel.tsx` | Sheet-based quick profile panel |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/auth.ts` | Add disabled account check in `authorize()` |
| `src/app/api/employees/stats/route.ts` | Add `hoursThisPeriod` + `payrollDue` aggregations |
| `src/app/api/employees/[id]/route.ts` | Add status transition validation + user account disable/enable |
| `src/app/api/employees/[id]/payments/route.ts` | Add `?from=&to=` query param support on GET |
| `src/app/(dashboard)/employees/page.tsx` | Add status filter, side panel, wire live summary cards |
| `src/app/(dashboard)/employees/[id]/page.tsx` | Add DateRangePicker for shifts, wire to hours summary |
| `src/app/(dashboard)/users/page.tsx` | Add role preset dropdown to permission section |

### Test Files
| File | Purpose |
|------|---------|
| `tests/unit/employee-status.test.ts` | Status transition validation tests |
| `tests/unit/role-presets.test.ts` | Role preset config tests |
| `tests/e2e/employee-admin.spec.ts` | E2E tests for dashboard, filters, side panel, date range |

## Key Patterns

- **Status transitions**: `src/lib/employee-status.ts` exports `VALID_TRANSITIONS` map and `isValidTransition(from, to)` function. Used in both API route (server validation) and form component (UI dropdown options).
- **Account disable**: On employee status change away from Active, set linked User.status = "Disabled". The `authorize()` function in auth.ts rejects disabled users.
- **Date range**: Existing `DateRangePicker` component from `src/components/ui/date-range-picker.tsx`. Presets from `src/lib/date-ranges.ts`.
- **Side panel**: shadcn `Sheet` component, responsive via `useIsMobile()`.
- **Audit logging**: Use existing `logAudit()` with action `"status_change"` and `changes` diff.

## Testing Commands

```bash
npm run test:unit                    # Unit tests
npm run test:e2e                     # E2E tests
npm run test -- employee-status      # Run specific test file
npm run test -- role-presets         # Run specific test file
```
