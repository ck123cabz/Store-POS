# CSS Token Mapping Reference

**Feature**: 001-ui-refinement | **Date**: 2026-01-27

## Hardcoded Gray Classes → Semantic Token Replacements

This document maps all hardcoded Tailwind gray color classes to their semantic token equivalents based on the existing shadcn/ui design system.

### Background Colors

| Hardcoded Class | Semantic Token | Use Case |
|-----------------|----------------|----------|
| `bg-gray-50` | `bg-muted` or `bg-muted/50` | Light card backgrounds, section backgrounds |
| `bg-gray-100` | `bg-muted` | Container backgrounds, dashboard layout |
| `bg-gray-200` | `bg-accent` | Hover states, selected items, progress bars |

### Text Colors

| Hardcoded Class | Semantic Token | Use Case |
|-----------------|----------------|----------|
| `text-gray-400` | `text-muted-foreground` | Icons, disabled text, placeholder text |
| `text-gray-500` | `text-muted-foreground` | Secondary text, descriptions, empty states |
| `text-gray-600` | `text-muted-foreground` | Subdued text, timestamps, metadata |
| `text-gray-700` | `text-foreground` | Primary text (slightly subdued) |
| `text-gray-800` | `text-foreground` | Primary text |
| `text-gray-900` | `text-foreground` | Headings, strong emphasis |

### Interactive States

| Hardcoded Class | Semantic Token | Use Case |
|-----------------|----------------|----------|
| `hover:bg-gray-50` | `hover:bg-accent` | Hover on light backgrounds |
| `hover:bg-gray-100` | `hover:bg-accent` | Hover on cards, list items |
| `hover:text-gray-900` | `hover:text-foreground` | Text hover states |

### Border Colors

| Hardcoded Class | Semantic Token | Use Case |
|-----------------|----------------|----------|
| `border-gray-200` | `border-border` | Card borders, dividers |
| `border-gray-300` | `border-border` | Input borders |

---

## Files Requiring Updates

Based on audit (`grep -r "gray-" src/`):

### High Priority (P1 - Design System Compliance)

| File | Gray Classes Found | Priority |
|------|-------------------|----------|
| `src/app/(dashboard)/layout.tsx` | `bg-gray-100` | P1 |
| `src/components/layout/sidebar.tsx` | `bg-gray-50`, `bg-gray-200`, `text-gray-600`, `text-gray-900`, `hover:bg-gray-100` | P1 |
| `src/components/layout/header.tsx` | `text-gray-600` | P1 |
| `src/components/pos/product-card.tsx` | `bg-gray-100`, `text-gray-400` | P1 |
| `src/components/pos/payment-modal.tsx` | `bg-gray-50`, `text-gray-500` | P1 |
| `src/components/pos/cart.tsx` | `text-gray-500` | P1 |
| `src/components/pos/hold-modal.tsx` | `text-gray-400`, `text-gray-500` | P1 |
| `src/app/(dashboard)/settings/page.tsx` | `bg-gray-50` | P1 |

### Medium Priority (Other Dashboard Pages)

| File | Gray Classes Found | Priority |
|------|-------------------|----------|
| `src/app/(auth)/layout.tsx` | `bg-gray-100` | P2 |
| `src/app/(dashboard)/calendar/page.tsx` | `bg-gray-50`, `bg-gray-100`, `bg-gray-400` | P2 |
| `src/app/(dashboard)/audit-log/page.tsx` | `bg-gray-100`, `text-gray-800` | P2 |
| `src/app/(dashboard)/transactions/page.tsx` | `bg-gray-100` | P2 |
| `src/app/(dashboard)/pos/page.tsx` | `hover:bg-gray-50`, `text-gray-500` | P2 |
| `src/app/(dashboard)/employee/page.tsx` | `bg-gray-200`, `text-gray-400`, `border-gray-200`, `bg-gray-50`, `text-gray-700` | P2 |
| `src/components/onboarding/tour.tsx` | `bg-gray-200` | P2 |

---

## Verification Commands

```bash
# Count remaining gray classes after migration
grep -r "gray-" src/ --include="*.tsx" --include="*.ts" | wc -l

# Should be 0 after complete migration (excluding comments if any)
grep -r "gray-" src/ --include="*.tsx" --include="*.ts" | grep -v "//" | wc -l
```

---

## CSS Variable Verification

All required semantic tokens exist in `src/app/globals.css`:

- `--muted` ✓
- `--muted-foreground` ✓
- `--accent` ✓
- `--accent-foreground` ✓
- `--secondary` ✓
- `--secondary-foreground` ✓
- `--foreground` ✓
- `--background` ✓
- `--border` ✓

Both light (`:root`) and dark (`.dark`) variants are defined.
