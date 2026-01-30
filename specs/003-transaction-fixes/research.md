# Research: Transaction Fixes - Currency, Void, and Display

**Feature**: 003-transaction-fixes | **Date**: 2026-01-30

## Research Tasks

This document consolidates research findings for all technical decisions in the implementation plan.

---

## 1. Currency Symbol Propagation

### Research Question
How should the currency symbol from Settings be propagated to the transactions UI?

### Decision
**Use a React Context hook (`useSettings`) that fetches settings once and provides the currency symbol to all components.**

### Rationale
- Settings are fetched once on page load, cached in state
- All `formatCurrency` calls receive the symbol from context
- Consistent pattern with existing codebase (React hooks + fetch)
- No additional dependencies required

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Server-side currency formatting | Requires API changes to return formatted strings; loses flexibility for client-side calculations |
| Global state (Redux/Zustand) | Overkill for a single settings value; adds unnecessary dependency |
| Inline fetch in `formatCurrency` | Would cause N+1 fetches; terrible performance |
| CSS/env variable | Not dynamic; requires deployment to change |

### Implementation Notes
- Extract `formatCurrency` to `src/lib/format-currency.ts` for testability
- Create `useSettings` hook in `src/hooks/use-settings.ts`
- Hook returns `{ currencySymbol, loading, error }`
- Default to "$" while loading or on error (backwards compatibility)

---

## 2. Void Endpoint Design

### Research Question
What HTTP method and URL pattern should the void endpoint use?

### Decision
**`PATCH /api/transactions/[id]/void`**

### Rationale
- `PATCH` is semantically correct for partial update (adding void metadata)
- Action-based sub-route (`/void`) clearly expresses intent
- Follows existing patterns in the codebase (e.g., `/api/transactions/[id]`)
- Idempotent - voiding an already-voided transaction returns success

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| `DELETE /api/transactions/[id]` | Semantic mismatch - we're not deleting, we're marking as voided |
| `PUT /api/transactions/[id]` | Implies full replacement; void only modifies a few fields |
| `POST /api/transactions/[id]/void` | POST isn't idempotent; PATCH better fits the operation |

### Implementation Notes
- Request body: `{ reason: string, customReason?: string }`
- Predefined reasons: "Wrong Items", "Test Transaction", "Customer Dispute", "Duplicate Entry", "Other"
- If reason is "Other", `customReason` is required

---

## 3. Void Time Window Validation

### Research Question
How should the 7-day void window be enforced?

### Decision
**Server-side validation comparing transaction `createdAt` to current timestamp.**

### Rationale
- Server-side ensures enforcement regardless of client behavior
- Simple date comparison (no complex logic)
- Clear error message returned to UI

### Implementation Notes
```typescript
const VOID_WINDOW_DAYS = 7
const transactionAge = Date.now() - new Date(transaction.createdAt).getTime()
const maxAgeMs = VOID_WINDOW_DAYS * 24 * 60 * 60 * 1000

if (transactionAge > maxAgeMs) {
  return { error: "Transaction is older than 7 days and cannot be voided" }
}
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Client-side only validation | Easily bypassed; security risk |
| Configurable time window in Settings | YAGNI - 7 days is a reasonable fixed default; can add later if needed |
| No time limit | Risk of voiding very old transactions, potentially for fraudulent purposes |

---

## 4. Permission Model for Void

### Research Question
Should void use an existing permission or get its own?

### Decision
**Create new `permVoid` permission, separate from `permTransactions`.**

### Rationale
- Spec explicitly requires: "Create new `permVoid` permission for stricter control"
- Void is a privileged operation (can remove revenue from records)
- Allows granular control - cashiers can view transactions but not void them

### Implementation Notes
- Add `permVoid Boolean @default(false) @map("perm_void")` to User model
- Admin migration: existing admins get `permVoid = true`
- Update user management UI to include this permission
- Check in void endpoint: `if (!session.user.permVoid) return 403`

---

## 5. Voided Transaction Display

### Research Question
How should voided transactions be visually distinguished?

### Decision
**Badge + muted row styling with strikethrough on the total.**

### Rationale
- Badge provides clear status indication (consistent with other statuses)
- Muted background (opacity reduction) signals "inactive" state
- Strikethrough on total reinforces that this amount is excluded from revenue
- Follows common POS and accounting software patterns

### Implementation Notes
```tsx
// In table row
<TableRow className={tx.isVoided ? "opacity-50 bg-muted/30" : ""}>

// Status badge
{tx.isVoided && <Badge variant="destructive">Voided</Badge>}

// Total with strikethrough if voided
<span className={tx.isVoided ? "line-through text-muted-foreground" : ""}>
  {formatCurrency(tx.total)}
</span>
```

---

## 6. Revenue Exclusion Logic

### Research Question
Where does revenue calculation happen and how to exclude voided transactions?

### Decision
**Add `isVoided: false` to WHERE clause in `/api/transactions/today` endpoint.**

### Rationale
- Today's summary endpoint aggregates revenue
- Single point of change for exclusion
- Existing query pattern easily extended

### Implementation Notes
```typescript
// In /api/transactions/today/route.ts
const transactions = await prisma.transaction.findMany({
  where: {
    createdAt: { gte: startOfDay, lt: endOfDay },
    status: 1, // completed
    isVoided: false, // exclude voided
  },
})
```

---

## 7. Void Reasons Data Structure

### Research Question
How should void reasons be stored and validated?

### Decision
**Store as plain string with validation against predefined list + "Other" with custom text.**

### Rationale
- Simple string storage - no join tables or enums
- Validation happens at API layer
- Custom reasons supported for edge cases

### Predefined Reasons
1. Wrong Items
2. Test Transaction
3. Customer Dispute
4. Duplicate Entry
5. Other (requires customReason)

### Implementation Notes
```typescript
const VALID_VOID_REASONS = [
  "Wrong Items",
  "Test Transaction",
  "Customer Dispute",
  "Duplicate Entry",
  "Other"
] as const

// Validation
if (!VALID_VOID_REASONS.includes(reason)) {
  return { error: "Invalid void reason" }
}
if (reason === "Other" && !customReason?.trim()) {
  return { error: "Custom reason required when selecting 'Other'" }
}

// Storage
const voidReason = reason === "Other" ? `Other: ${customReason}` : reason
```

---

## 8. Status Filter Enhancement

### Research Question
How should the status filter be enhanced to support voided transactions?

### Decision
**Add "Voided" as a new filter option that sets `includeVoided=true` and filters for `isVoided=true`.**

### Rationale
- Intuitive UI - voided appears alongside other statuses
- Requires minimal API changes (already has `includeVoided` param)
- Clear user mental model

### Implementation Notes
```tsx
// Filter options
<SelectItem value="voided">Voided</SelectItem>

// When "voided" selected, fetch with:
params.append("includeVoided", "true")
params.append("isVoided", "true")  // Only show voided ones
```

---

## Resolved Clarifications

All technical decisions have been made. No outstanding clarifications required.

| Question | Resolution |
|----------|------------|
| Should void require separate permission? | Yes, new `permVoid` permission |
| Time limit on voiding? | 7 days from transaction date |
| Stock restoration on void? | No - explicit design decision per spec |
| Currency symbol caching? | Via React Context, fetched once on page load |
