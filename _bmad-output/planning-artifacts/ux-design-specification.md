---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - docs/plans/2025-01-25-inventory-employee-system-design.md
  - docs/plans/2025-01-26-phase1-foundation.md
  - docs/plans/2026-01-21-web-pos-phase2-implementation.md
  - docs/plans/2026-01-26-phase3-inventory-count.md
  - docs/plans/2026-02-03-unified-menu-page-design.md
  - docs/plans/2026-02-03-kitchen-order-board-design.md
  - docs/plans/2026-01-25-10-lever-financial-system-design.md
  - docs/plans/2026-02-03-unified-menu-page-implementation.md
  - docs/plans/2026-02-03-intuitive-unit-system-implementation.md
  - docs/plans/2026-02-03-kitchen-order-board-implementation.md
  - docs/plans/2025-01-26-phase4-pos-integration.md
  - docs/plans/2025-01-26-phase6-reporting-polish.md
  - docs/plans/2026-01-22-kitchen-line-financial-suite-design.md
  - CLAUDE.md
designDirection: Linear-inspired (monochromatic, density-with-breathing, typography-driven hierarchy)
currentGrade: C+
---

# UX Design Specification: Store-POS

**Author:** S0mebody
**Date:** 2026-02-12
**Design Direction:** Linear-inspired complete redesign
**Status:** Complete

---

## Executive Summary

### Project Vision

Store-POS is a tablet-first point-of-sale and kitchen management system for a food service operation. The current implementation is functionally complete but suffers from amateur UX — inconsistent visual hierarchy, ad-hoc spacing, hardcoded color decisions, and component patterns that feel assembled rather than designed. The redesign aims to achieve **SaaS-grade polish** inspired by Linear: monochromatic restraint, typography-driven hierarchy, surgical whitespace, and seamless interconnected navigation that creates flow state.

The goal is not to add features — it's to make the existing features feel like they were built by a team that obsesses over every pixel.

### Target Users

**Primary context:** Operators of a food service business using the system across roles — order-taking, kitchen coordination, inventory management, financial analysis. Users range in tech-savviness but share a common need: the system must be **instantly learnable on the surface** while revealing depth progressively.

**Device context:** Tablet-first (primary input device at the counter and in back-of-house), with phone compatibility for on-the-go checks. Touch is the primary input method. The environment is fast-paced food service — greasy fingers, noise, time pressure during peak hours.

**Emotional context:** The user is someone who uses modern SaaS products daily and has high design taste. The current UI feels like "it was made by a newbie" — functional but lacking the subtle craft that inspires trust and pride. The system is visible to customers at the counter, so it's also a brand statement.

### Key Design Challenges

1. **Tablet-first touch design in a hostile environment** — Large touch targets (44px minimum), forgiving tap areas, one-handed operation where possible. No tiny buttons, no hover-dependent interactions. Everything must work with a greasy thumb on a 10" screen.

2. **Progressive disclosure without hiding** — Simple surface for daily cashier operations (POS, kitchen board) but powerful depth for management tasks (recipe costing, 10-lever analytics, inventory counts). The complexity must be *available* without being *visible* until needed.

3. **Seamless interconnection between screens** — Products mentioned in transactions should link to their menu page. Customers in pay-later should link to their tab. Ingredients in recipes should link to inventory. Every data entity is a doorway, not a dead end. This is the "everything connects" feeling.

4. **Overcoming "AI slop" perception** — The current design suffers from inconsistent spacing, arbitrary color choices, mismatched component patterns, and no systematic visual language. Every design decision in the new system must feel *intentional* — because in Linear, nothing is accidental.

### Design Opportunities

1. **The "Linear for restaurants" positioning** — No POS system looks like Linear. Most POS UIs are either cluttered legacy software or oversimplified tablet apps. A POS that feels like a premium SaaS tool would be genuinely distinctive — both for the operator's daily experience and as a brand impression when customers see the screen.

2. **Contextual navigation as a superpower** — The app has rich data relationships (products → recipes → ingredients → costs → analytics). Building a navigation model where these connections are surfaced naturally (breadcrumbs, inline links, contextual panels) would transform the experience from "a collection of pages" into "an interconnected system."

3. **Density-with-breathing as a POS advantage** — Most POS systems either show too little (requiring many taps) or too much (visual overload). Linear's approach of information-dense layouts with intentional whitespace is perfect for a POS — show everything the operator needs, but give every element room to breathe.

4. **Dark mode as the primary kitchen experience** — Kitchen order boards and late-night operations benefit from a dark interface that reduces eye strain and glare. With the OKLCH color system already in place, a polished dark mode could be a genuine UX win, not just a checkbox feature.

## Core User Experience

### Defining Experience

The core loop of Store-POS is deceptively simple: **Customer approaches → Tap products → Pay → Next customer.** During a lunch rush, this loop repeats 50+ times in an hour. Every millisecond of friction multiplies by 50. Every unnecessary tap is a line that gets longer.

But the POS terminal isn't an island — it's the hub of a wheel with spokes reaching into inventory, kitchen, customers, and analytics. The defining experience is not just "fast checkout" — it's **contextual fluidity**: the ability to flow between any connected piece of information without ever feeling like you "left" where you were.

Think of it like this: In Linear, you click an issue → see its sub-issues → click a label → see all issues with that label → click a project → see the roadmap. You never feel lost. You never think "how do I get back?" The navigation *is* the product.

Store-POS should work the same way: Tap a product in the POS → see it's low stock → tap the stock badge → see which ingredient is short → tap the ingredient → restock it → back to POS. All without a single "go back to the menu and find the right page" moment.

### Platform Strategy

| Dimension | Decision | Rationale |
|-----------|----------|-----------|
| **Primary device** | 10" tablet (landscape) | Counter-mounted for POS, hand-held for inventory counts |
| **Secondary device** | Phone (portrait) | Quick checks, manager approvals on the go |
| **Input method** | Touch-first | No hover states as primary interactions. Every interactive element must have a 44px+ touch target. |
| **Orientation** | Responsive (landscape bias on tablet, portrait on phone) | POS benefits from horizontal space; phone users hold portrait |
| **Offline** | Critical path — daily lifeline | Offline queue is not a fallback, it's a core feature. POS must work without internet. Visual indicator must be clear but not alarming. |
| **Performance** | Optimistic updates everywhere | UI responds instantly to taps; server confirms in background. The app should never show a spinner for routine actions. |
| **Navigation model** | Sidebar + contextual panels | Linear-style: persistent sidebar for top-level nav, slide-in panels for detail views, breadcrumbs for context |

### Effortless Interactions

These are the interactions that must feel like they happen *before* you even finish thinking about them:

1. **Product → Cart** — Single tap. No confirmation. The cart count updates with a subtle animation. Tap again to increment. Done.

2. **Cart → Payment** — One tap on "Pay." The payment modal slides up with the total already calculated, the numpad ready, the most common denomination pre-suggested.

3. **Payment → Next Customer** — Success state auto-dismisses after 2 seconds (or tap to dismiss immediately). Cart clears. Ready for the next person. Zero dead time.

4. **Contextual drill-down** — Anywhere you see a product name, it's tappable. Anywhere you see a customer name, it's tappable. Anywhere you see an ingredient, it's tappable. Every data entity is a portal to its detail — appearing as a slide-in panel, not a full page navigation. You never lose your place.

5. **Search as a superpower** — A universal search (Linear's Cmd+K pattern) that finds products, customers, transactions, ingredients — anything. On tablet, this is a persistent search bar in the header. On phone, a search icon that expands.

6. **Status at a glance** — Low stock, pending kitchen orders, unpaid tabs, today's revenue — surfaced as subtle badges and indicators in the sidebar and headers. You never need to navigate to a page just to check a number.

7. **Inline editing** — Edit a product price? Don't navigate to an edit page. Tap the price, type the new value, tap away. Done. Like editing a cell in a spreadsheet.

8. **Smart defaults** — Payment modal defaults to cash with exact amount pre-filled. New product form pre-selects the most-used category. Restock dialog remembers the last vendor. The system learns your patterns.

9. **Gesture support on tablet** — Swipe a cart item to remove it. Pull-to-refresh on data tables. Swipe between tabs. The touchscreen should feel native, not like a website on a tablet.

10. **Real-time without thinking about it** — Kitchen board updates live. Stock levels update when a sale completes. No refresh buttons anywhere. The data is always current.

### Critical Success Moments

1. **The Rush Test** — 5 customers in line, kitchen is backed up, someone wants to split payment. The entire POS flow — product selection, cart management, payment — must complete in under 15 seconds per customer with zero cognitive load. If the cashier has to *think* about the UI, we've failed.

2. **The "Where Is It?" Test** — Manager wants to check why margins dropped this week. From any screen, they should reach the analytics insight in 3 taps or fewer. If they have to remember which page something is on, we've failed.

3. **The New Employee Test** — A new hire should be able to process their first sale within 60 seconds of seeing the POS screen, with zero training. The affordances should be that obvious.

4. **The Offline Recovery Test** — Internet drops mid-transaction. The sale completes seamlessly. When internet returns, the queue syncs silently. The cashier should never know it happened.

5. **The End-of-Day Test** — Closing time. Inventory count, waste log, daily pulse — the closing workflow should feel like checking off a list, not navigating a maze. Each task flows into the next.

### Experience Principles

These five principles govern every UX decision in the redesign:

| # | Principle | What It Means | The Test |
|---|-----------|---------------|----------|
| 1 | **Speed is a feature** | Every routine action completes in one tap. No confirmation dialogs for non-destructive actions. Optimistic updates everywhere. | Can a cashier process a cash sale in under 10 seconds? |
| 2 | **Everything connects** | Every data entity (product, customer, ingredient, transaction) is a tappable portal to its context. Navigation is exploration, not memorization. | Can you reach any related piece of information in 2 taps from anywhere? |
| 3 | **Show, don't navigate** | Use slide-in panels, inline expansion, and contextual popovers instead of full page navigations. The user's current context is sacred. | Does viewing a detail require losing your current view? If yes, redesign it. |
| 4 | **Quiet until important** | The default state is calm and monochromatic. Color appears only for status (stock levels, payment states, kitchen urgency). Alerts escalate visually: subtle badge → colored indicator → attention-demanding pulse. | Is color used for decoration anywhere? If yes, remove it. |
| 5 | **Tablet-native, not web-on-tablet** | Touch targets are generous (44px+). Gestures are supported. Spacing is comfortable for fingers, not cursors. The app feels like it was built for this device. | Can you use every feature with your thumb while holding the tablet in one hand? |

## Desired Emotional Response

### Primary Emotional Goals

| Emotion | When It Appears | What It Feels Like |
|---------|----------------|-------------------|
| **Confidence** | During peak rush, complex operations | "I've got this." The UI is a calm co-pilot — steady voice, clear information, no surprises. Even when the kitchen is backed up and there's a line out the door, the screen is serene. |
| **Pride** | When customers see the screen, when showing the system to someone new | "This is *mine*." The interface looks like it was designed by a studio that charges $500/hour. It's a brand statement, not just a tool. |
| **Competence** | Every interaction, especially new features | "I'm good at this." Every tap produces the expected result. The UI confirms your intent with subtle feedback. You never wonder "did that work?" |
| **Calm control** | Managing inventory, reviewing analytics, multi-tasking | "Everything is under control." Information-dense but never overwhelming. Like a well-organized cockpit — every gauge visible, nothing screaming unless it should be. |

### Emotional Journey Mapping

| Stage | Desired Emotion | Design Implication |
|-------|----------------|-------------------|
| **First launch** | "This is polished" → Immediate trust | Clean login, fast load, no setup friction. The first screen should look like a screenshot from a design portfolio. |
| **Learning the system** | "This is obvious" → Confidence building | Progressive disclosure. The POS screen is self-explanatory. Advanced features reveal themselves naturally, not through tutorials. |
| **Daily use (calm)** | "This just works" → Invisible efficiency | Routine tasks require zero thought. Muscle memory develops quickly. The UI disappears and you're just *working*. |
| **Daily use (rush)** | "I've got this" → Calm under pressure | Large touch targets, clear visual hierarchy, instant feedback. The interface stays calm even when you're not. No loading spinners, no lag, no ambiguity. |
| **Something goes wrong** | "It's handled" → Reassured, not alarmed | Errors are explained clearly and confidently. "Payment failed — saved to offline queue. Will sync automatically." Not red alerts and panic — calm, competent communication. |
| **Discovering depth** | "Oh, that's clever" → Delighted surprise | Contextual links that connect data unexpectedly. A shortcut you didn't know existed. A detail panel that shows exactly what you needed without asking. Moments that make you smile. |
| **Returning after time away** | "I remember how this works" → Effortless re-engagement | Consistent patterns across every screen. If you know how one page works, you know how they all work. No re-learning. |

### Micro-Emotions

**Confidence vs. Confusion** — *Critical.* Every interactive element must telegraph its purpose. Buttons look like buttons. Links look like links. Destructive actions look dangerous. Safe actions look inviting. No ambiguity, ever.

**Trust vs. Skepticism** — *Critical.* Data must feel accurate and current. Timestamps on everything. "Last updated 2 min ago." Numbers that add up visibly. When the system says stock is low, you believe it because it's always been right.

**Delight vs. Mere Satisfaction** — *Important.* Not fireworks — micro-moments. The satisfying snap of a card settling into the cart. The smooth slide of a panel opening. The subtle color shift when a payment succeeds. These are the details that separate "it works" from "I love using this."

**Accomplishment vs. Frustration** — *Important.* End-of-day closing should feel like checking off a satisfying list, not slogging through chores. Inventory count completion should feel like an achievement. The system should acknowledge milestones: "Today's revenue: ₱12,450 — your best Wednesday this month."

**Calm vs. Anxiety** — *Foundation.* The visual baseline is quiet. Warm grays, generous whitespace, gentle type. This calm is never broken except by genuinely urgent things (overdue kitchen orders, critically out-of-stock items). The hierarchy of urgency is: silent → subtle badge → colored indicator → pulsing attention. Most of the UI lives in "silent."

### Design Implications

Each emotional goal maps directly to concrete UX decisions:

| Emotional Goal | UX Decision |
|---------------|-------------|
| **Confidence during chaos** | Large touch targets (48px on POS, 44px elsewhere). Optimistic updates — tap responds instantly, server catches up. No confirmation dialogs for routine actions. Undo instead of "Are you sure?" |
| **Pride of ownership** | Monochromatic color palette. Premium typography (Inter or equivalent geometric sans). Consistent 8px spacing grid. Hairline borders. No gratuitous gradients, shadows, or color. The design should photograph well. |
| **Competence, not confusion** | Every action produces visible feedback — subtle animation, state change, toast confirmation. Empty states guide instead of dead-ending. Error messages explain *what to do*, not just what went wrong. |
| **Calm control** | Information hierarchy through typography weight, not color. Muted status indicators that don't compete for attention. Progressive disclosure — details available on tap, not cluttering the default view. |
| **Delight in the details** | Micro-animations: cart item count incrementing, payment success checkmark drawing, panel sliding in with spring physics. Never blocking, never slow — 150-250ms transitions that feel physical. |
| **Reassuring error handling** | Errors use a calm, confident tone. Blue/gray for informational, amber for warnings, red reserved for data-loss risk only. Offline mode is a feature, not an error — "Working offline. 3 transactions queued." |
| **Playful confidence** | Occasional moments of personality in empty states, achievement messages, and micro-copy. "No transactions yet — your first sale is going to feel great." Not forced humor — quiet wit. |

### Emotional Design Principles

1. **Calm is the canvas** — The default emotional state of every screen is serene. Warm neutrals, generous space, quiet typography. This calm baseline makes important things *actually stand out* instead of everything competing for attention.

2. **Feedback is a conversation** — Every user action gets a proportional response. Tap a product? Subtle ripple + cart count bump. Complete a payment? Satisfying checkmark animation + brief success state. Void a transaction? Deliberate confirmation with clear consequences. The UI talks back, but never shouts.

3. **Errors build trust** — When something goes wrong, the system's composure is what builds confidence. Clear explanation, clear next step, calm tone. "We saved your work" is more reassuring than a green checkmark. Every error is an opportunity to prove the system is reliable.

4. **Delight is earned, not forced** — Micro-animations and personality moments appear where they feel natural — never at the expense of speed, never blocking workflow, never in the critical path. A delightful payment confirmation animation that delays the next customer by 500ms is a failure, not a win.

5. **Consistency is comfort** — The same interaction pattern works the same way on every screen. If slide-in panels show details on the Menu page, they show details on the Transactions page too. If swipe-to-delete works in the cart, it works in lists. Consistency isn't boring — it's the foundation of "I know how this works."

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Linear — The Singular Reference**

Linear isn't just a project management tool — it's a *design philosophy* expressed as software. It consistently ranks among the best-designed SaaS products because every decision serves a unified vision. Here's what makes it exceptional, deconstructed:

**1. The Monochromatic Foundation**
Linear's UI is 95% grays. The background is a warm off-white. Text comes in 3-4 shades of gray. Borders are barely visible — 1px at ~5% opacity. The result? When color *does* appear — a purple label, a green status dot, an orange priority icon — it carries genuine information. Your eye goes exactly where it should. Nothing competes.

*Transfer to POS:* The current Store-POS uses color decoratively — orange badges, blue badges, green backgrounds, amber sections. Strip all of it. The default state is gray. Color appears only for: stock status, payment state, kitchen urgency, and interactive CTAs.

**2. Typography-Driven Hierarchy**
Linear uses a single typeface (Inter) at roughly 3 weights: Regular (400) for body, Medium (500) for labels and metadata, Semibold (600) for headings and emphasis. Size variation is minimal — maybe 13px, 14px, 16px, 20px. The hierarchy comes from *weight*, not size or color.

*Transfer to POS:* Replace the current ad-hoc font sizing with a strict 4-size type scale. Hierarchy through weight: Regular body → Medium labels → Semibold section heads → Bold page titles. On tablet, bump the base size to 15-16px for touch-distance readability.

**3. The 8px Spacing Grid**
Every margin, padding, and gap in Linear is a multiple of 4px (with 8px as the primary unit). This mathematical consistency is what creates the "everything feels right" sensation even if you can't articulate why.

*Transfer to POS:* Define a spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Every spacing value in every component must be from this scale. No mixing equivalent-but-different values on similar elements. On tablet, bias toward the larger end — 16px minimum padding in interactive areas.

**4. Sidebar Navigation**
Linear's sidebar is a persistent, collapsible navigation column. Sections are grouped logically. Items use icon + label. The active state is a subtle background fill — no loud highlight. Badge counts appear right-aligned for items that need attention.

*Transfer to POS:* The existing shadcn sidebar is a strong foundation. Refine it: consistent icon style (stroke-only, 20px), muted active state (background fill, not color change), right-aligned badge counts for kitchen orders and low-stock alerts. Collapsible on phone, persistent on tablet.

**5. Contextual Panels (The Detail View)**
When you click an issue in Linear, it doesn't navigate to a new page — it opens in a detail panel. The list stays visible on the left. You can click through issues without losing your place.

*Transfer to POS:* Menu page: click a product → slide-in panel with product details. Transactions page: click a transaction → slide-in panel with line items. Ingredients page: click an ingredient → panel with stock history, recipes that use it, vendor info. The list is always visible.

**6. Minimal, Functional Modals**
Linear's modals are clean: white card, subtle shadow, minimal chrome. The content is the hero. Metadata appears as compact pills/chips below the title.

*Transfer to POS:* Payment modal, customer forms, restock dialogs — all should follow this pattern. White card, rounded corners, subtle elevation shadow, content-first. No decorative borders or colored headers.

**7. Status as Visual Language**
Linear uses a consistent, minimal status system: circle icons for status, colored dots for priority and labels. The colors are muted — not neon. Status is communicated through shape + position, with color as reinforcement.

*Transfer to POS:* Build a unified status language. Stock: gray dot (ok) → amber dot (low) → red dot (critical) → empty ring (out). Kitchen: same progression for time urgency. Payment: green dot (paid) → amber dot (pending) → blue dot (tab). One system, every screen.

**8. Information Density Without Clutter**
Linear's list view is *dense* — 8+ data points per row. But it doesn't feel crowded because: consistent row height, generous horizontal padding, muted secondary information (gray text, small chips), and clear column alignment.

*Transfer to POS:* Tables should be information-rich but visually calm. Transaction list: order #, time, items count, total, payment type icon, status dot — all in one row. Product list: thumbnail, name, price, cost, margin, stock dot. Secondary info in muted gray, primary info in dark text.

### Transferable UX Patterns

**Navigation Patterns**

| Linear Pattern | Store-POS Application |
|---------------|----------------------|
| Persistent sidebar with grouped sections | Sales (POS, Orders, Transactions), Inventory (Menu, Ingredients), Analytics, Management (Customers, Users, Settings) |
| Breadcrumb trail in content header | POS → Transaction #1234 → Customer: Maria. Always know where you are. |
| Cmd+K command palette | Universal search: products, customers, transactions, ingredients. On tablet: persistent search in header bar. |
| Back navigation preserves list state | Click through transactions → back button returns to same scroll position, same filters. |

**Interaction Patterns**

| Linear Pattern | Store-POS Application |
|---------------|----------------------|
| Click list item → detail panel (no page nav) | Products, transactions, ingredients, customers — all use slide-in panels |
| Inline metadata editing | Tap a product price in the table → edit inline. Tap stock quantity → restock dialog. |
| Optimistic updates | Cart updates instantly on tap. Payment processes with immediate success UI. Server confirms in background. |
| Hover → subtle row highlight | On tablet: selected row gets subtle background. Active row gets slightly stronger background. |
| Compact chip/pill metadata | Payment type pills, status dots, category badges — small, muted, information-dense |

**Visual Patterns**

| Linear Pattern | Store-POS Application |
|---------------|----------------------|
| Monochromatic base + earned color | Gray UI foundation. Color only for: status indicators, active CTAs, urgent alerts. |
| 1px hairline borders at low opacity | All dividers, card borders, table rules — 1px, `border-color: oklch(0 0 0 / 0.06)` |
| Elevation through subtle shadow only on overlays | Cards are flat (no shadow). Modals, dropdowns, popovers get `shadow-lg`. Two levels only: flat and floating. |
| Consistent avatar/icon sizing | All icons: 16px (inline), 20px (navigation), 24px (headers). No variation. |
| Muted secondary text | Metadata, timestamps, helper text: `text-muted-foreground` at ~50% contrast. Primary text at ~90%. |

### Anti-Patterns to Avoid

| Anti-Pattern | Why It's Toxic | What to Do Instead |
|-------------|---------------|-------------------|
| **Modal fatigue** — Confirmation dialogs for every action | Destroys flow state. Slows rush-hour operations. Creates "click OK" muscle memory that negates the safety benefit. | Undo pattern for non-destructive actions. Confirm only for irreversible actions (void transaction, delete product). |
| **Color vomit** — Every status, category, and badge in a different bright color | Creates visual noise. Nothing stands out because everything screams. | Monochromatic base. Max 4 semantic colors: info (blue), success (green), warning (amber), critical (red). Everything else is gray. |
| **Card soup** — Dashboard pages as grids of equal-weight cards | No hierarchy. User can't tell what's important. Looks like a generic admin template. | Clear content hierarchy. Lead with the most important metric. Use typography weight to establish reading order. |
| **Hamburger everything** — Hiding navigation behind a menu icon on tablet | Tablets have enough space. Hiding nav adds taps and disorientation. | Persistent sidebar on tablet. Collapsible only on phone. The sidebar *is* the navigation — don't hide it. |
| **Faux-native** — Web apps that mimic iOS/Android UI patterns badly | Falls into uncanny valley. Neither native nor web — just weird. | Own the web aesthetic. Linear doesn't pretend to be a native app. It's a web app that's *better designed* than most native apps. |
| **Loading state chaos** — Different spinners, skeletons, and "Loading..." text on every page | Inconsistency erodes trust. Some pages feel fast, others feel broken. | One skeleton pattern everywhere. Content areas show skeleton placeholders. Data loads progressively. No spinner for <200ms loads. |
| **Oversized touch targets that waste space** — Making everything 56px+ "for touch" | Looks childish. Wastes precious screen real estate on tablet. | 44-48px targets in primary interaction zones (POS). 36-40px in management screens where density matters. Generous padding, not oversized elements. |

### Design Inspiration Strategy

**What to Adopt Directly:**

- Monochromatic color system with earned color (Linear's core principle)
- 8px spacing grid with strict adherence
- Typography hierarchy through weight (not size or color)
- Slide-in detail panels instead of page navigation
- Hairline borders and flat cards (shadow only on overlays)
- Compact status indicators (dots, small badges)
- Consistent component sizing (one size per context, no variation)

**What to Adapt for POS Context:**

- Linear's keyboard shortcuts → Touch gestures + prominent tap targets on tablet
- Linear's dense list rows → Slightly more generous row height (48px vs Linear's ~36px) for touch
- Linear's Cmd+K → Persistent search bar in header (tablet) / expandable search icon (phone)
- Linear's narrow sidebar → Slightly wider on tablet (240px vs Linear's ~220px) for touch-friendly nav items
- Linear's mouse hover states → Touch press states with subtle background fill + active scale

**What to Avoid from Linear:**

- Linear's extreme density on phone (too small for POS rush context)
- Linear's reliance on keyboard shortcuts (irrelevant for tablet-primary)
- Linear's text-heavy empty states (POS empty states should be action-oriented)
- Linear's minimal onboarding (POS needs slightly more affordance for new employees)

## Design System Foundation

### Design System Choice

**shadcn/ui — Clean Reinstall with Linear-Inspired Theme**

Rip out all existing shadcn components and reinstall fresh. Every component gets reinstalled from source via shadcn CLI, with proper implementation examples pulled via shadcn MCP before integration. The new design tokens (colors, typography, spacing, radii, shadows, elevation) are defined *first*, then every component inherits them automatically through Tailwind's theme system.

This is not a patch job. This is a ground-up rebuild using the same proven primitives (Radix UI for accessibility, Tailwind CSS for styling, shadcn for composition patterns) but with intentional, Linear-grade design discipline applied from the start.

### Rationale for Selection

| Factor | Decision | Why |
|--------|----------|-----|
| **Foundation** | Keep shadcn/ui + Radix + Tailwind | Same architectural approach as Linear. Headless accessible primitives + utility CSS. The best foundation in the React ecosystem for this aesthetic. |
| **Approach** | Clean reinstall, not patch | Existing components have accumulated inconsistent customizations, hardcoded colors, ad-hoc spacing. Patching 40+ components is more work than reinstalling cleanly. |
| **Implementation quality** | shadcn MCP for examples | Before implementing any component, pull the proper example from shadcn registry. No guessing at composition patterns. Every component follows the canonical structure. |
| **Design tokens** | Define first, install second | The theme (colors, type, spacing, radii, shadows) must be locked down in `globals.css` and Tailwind config *before* any component is installed. Components inherit the tokens — not the other way around. |
| **Customization** | Token-level, not component-level | All visual differentiation happens through CSS custom properties and Tailwind theme. Individual components should need minimal custom CSS. If a component needs a lot of overrides, the tokens are wrong. |

### Implementation Approach

**Phase 1: Design Token Foundation**

Define the complete token system before touching any components:

1. Color tokens (OKLCH) — monochromatic base + 4 semantic colors
2. Typography scale — 4 sizes, 3 weights, 1 typeface
3. Spacing scale — 4px grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
4. Border radius — tight (4px default, 6px cards, 8px modals)
5. Shadow system — flat default, shadow only on overlays (2 levels)
6. Border colors — hairline at 5-6% opacity
7. Animation tokens — 150ms micro, 250ms panel, spring physics for modals

**Phase 2: Component Reinstall Strategy**

For each component in the system:

1. Pull shadcn MCP example → understand canonical structure
2. Install fresh via shadcn CLI (--overwrite)
3. Verify component inherits design tokens correctly
4. Test in isolation
5. Integrate into application screen

**Phase 3: Screen-by-Screen Rebuild**

Apply the new components to each screen, prioritized by usage frequency:

- **Priority 1** (Daily use): POS, Kitchen Orders, Payment Modal
- **Priority 2** (Regular use): Menu Management, Transactions, Ingredients
- **Priority 3** (Periodic use): Customers, Analytics, Settings
- **Priority 4** (Infrequent): Users, Audit Log, Waste, Calendar

### Customization Strategy

**Token-Level Customization (globals.css + Tailwind config)**

All visual identity lives in design tokens:

- **Colors:** Redefine all CSS custom properties in OKLCH. Add semantic tokens: `--status-ok`, `--status-warning`, `--status-critical`, `--status-info`.
- **Typography:** Single typeface. 4-size scale with corresponding line heights. Weight hierarchy through Tailwind utilities.
- **Spacing:** 4px grid enforced. Only approved Tailwind spacing values.
- **Borders:** Hairline opacity. All components inherit.
- **Shadows:** Default is `shadow-none`. Only overlays use shadow.
- **Radii:** Tighten to 4px base, 6px cards, 8px modals.

**Component-Level Customization (minimal, intentional)**

Domain-specific components built on shadcn primitives:

- **Sidebar:** Custom width, grouped sections, badge positioning
- **Product Card (POS):** Image, price, stock indicator
- **Payment Modal:** Multi-step flow with tabs
- **Kitchen Order Card:** Kanban card with time-based urgency
- **Data Tables:** Row selection, inline actions, responsive columns
- **Status Badge:** Unified status → dot color + label mapping

**shadcn MCP Workflow**

For every component integration:

1. `search_items_in_registries` → find the component
2. `view_items_in_registries` → read source and dependencies
3. `get_item_examples_from_registries` → see proper usage patterns
4. `get_add_command_for_items` → get the install command
5. Install → customize tokens → integrate

## Defining Core Interaction

### The Defining Experience

**"Tap, pay, next — and everything connects."**

Store-POS has a dual-layer defining experience:

**Layer 1: The Core Loop (Speed)**
Customer approaches → tap products → pay → next customer. This loop must be so fast it becomes muscle memory within the first hour of use. Under 10 seconds for a simple cash sale. The cashier should be able to do this while having a conversation with the customer.

**Layer 2: The Connected System (Fluidity)**
Every piece of data in the system is a portal to related context. A product name is never just text — it's a link to its recipe, its cost breakdown, its sales history. A customer name leads to their tab, their visit history, their average spend. An ingredient connects to every product that uses it, every count discrepancy, every restock event. The system mirrors how a restaurant operator *thinks* — in relationships, not in pages.

The magic happens when these layers combine: during a checkout, you notice a product shows "Low Stock." You tap the stock badge — a panel slides in showing which ingredient is short. You tap the ingredient — see the par level, last restock date, vendor. You tap "Restock" — dialog opens, you enter the quantity, done. Close the panel — you're back at the POS, the customer is still deciding on their drink. Zero context loss. Zero navigation.

### User Mental Model

**How restaurant operators think:**

Restaurant operators don't think in "pages" or "modules." They think in *flows*:

- "I need to sell this → but wait, is it in stock? → what ingredient is missing? → can I get it today?"
- "This customer wants to pay their tab → how much do they owe? → which transactions? → settle it."
- "Why is my margin low this week? → which products are underperforming? → is it a cost issue or a pricing issue?"

Each of these is a chain of connected thoughts. The current UI breaks these chains by forcing navigation between unrelated pages. The redesigned UI should let these chains flow naturally through contextual panels and inline links.

**Mental model expectations:**

| What They Expect | What Currently Happens | What Should Happen |
|-----------------|----------------------|-------------------|
| Tap a product name → see its details | Navigate to Menu page, find the product | Slide-in panel with product details, from any screen |
| Tap a customer → see their history | Navigate to Customers page, search | Slide-in panel with customer profile + transactions |
| See low stock → fix it immediately | Navigate to Ingredients page, find item, restock | Tap stock badge → ingredient panel → restock dialog |
| Check today's numbers → understand why | Navigate to Analytics, then Transactions, then Menu | Dashboard with drill-down: revenue → transactions → products |

### Success Criteria

**The Core Loop (Layer 1):**

| Criterion | Target | How to Measure |
|-----------|--------|---------------|
| Simple cash sale (1 product) | < 8 seconds | Tap product → tap Pay → tap denomination → done |
| Multi-product cash sale (3 items) | < 15 seconds | 3 taps + pay + denomination |
| GCash payment | < 20 seconds | Products + pay + GCash tab + photo capture |
| Split payment | < 25 seconds | Products + pay + split tab + amounts + confirm |
| Pay Later (tab) | < 12 seconds | Products + Pay Later + select customer + confirm |
| Cart modification (remove item) | < 3 seconds | Swipe or tap remove → instant update |
| Category switch | < 1 second | Tap category pill → instant grid filter |

**The Connected System (Layer 2):**

| Criterion | Target | How to Measure |
|-----------|--------|---------------|
| Any entity → its detail panel | 1 tap | Tap product/customer/ingredient name → panel slides in |
| Detail panel → related entity | 1 tap from panel | In product panel, tap ingredient → ingredient panel replaces |
| Return to original context | 1 tap or swipe | Close panel → original screen exactly as left |
| Cross-module navigation depth | Max 3 taps to any related data | POS → product → ingredient → restock = 3 taps |
| Search → any entity | 2 actions | Open search → type → tap result |

### Novel UX Patterns

**Established Patterns (Use Directly):**

| Pattern | Source | Application |
|---------|--------|-------------|
| Persistent sidebar navigation | Linear, Notion, Slack | Main navigation for all modules |
| Slide-in detail panels | Linear, Gmail | Product details, transaction details, customer profiles |
| Tab bar for sub-views | Linear | Menu (Products/Categories), Transactions (List/Heatmap) |
| Compact status dots | Linear, GitHub | Stock status, payment status, kitchen order status |
| Optimistic UI updates | Linear, Figma | Cart updates, payment processing, stock changes |

**Adapted Patterns (Familiar + Our Twist):**

| Pattern | Inspiration | Our Adaptation |
|---------|------------|----------------|
| **Entity linking** | Notion's @mentions, Linear's issue references | Every data entity is tappable from any context — renders as a styled inline link |
| **Cascading panels** | macOS Finder column view | Tap entity in panel → new panel slides in beside (tablet) or replaces (phone). Breadcrumb tracks the chain. |
| **Universal search** | Linear's Cmd+K, Spotlight | Persistent search bar on tablet header. Searches all entity types. Results grouped by type. |
| **Contextual quick actions** | Linear's right-click menus | Long-press (tablet) on any entity → contextual menu with domain-specific actions |
| **Status escalation system** | Novel for POS | Silent → subtle badge → colored indicator → pulsing attention. Unified urgency across stock, kitchen, and alerts. |

### Experience Mechanics

**The Core Loop — Step by Step:**

1. **Initiation** — POS is the default landing page. Product grid immediately visible with categories. Search always accessible. Cart visible on right (tablet) or via toggle (phone).

2. **Product Selection** — Tap product → added to cart instantly (optimistic). Cart count bumps with scale animation. Tap again → quantity increments. Swipe cart item → remove with undo toast.

3. **Payment** — Tap "Pay" → modal slides up. Defaults to Cash with total displayed. Quick denomination buttons. Tap denomination → amount fills → change calculated. "Complete" activates when amount ≥ total.

4. **Completion** — Tap "Complete" → checkmark animation (200ms). Success shows total, paid, change. Auto-dismisses after 2 seconds. Cart clears. Kitchen order auto-created if applicable.

5. **Recovery** — Payment fails → "Saved to offline queue" toast. Network drops → subtle offline indicator. Wrong product → swipe to remove (with undo). Wrong amount → tap to re-enter.

**The Connected System — Navigation Mechanics:**

1. **Entity Recognition** — All entity names styled as tappable links (medium weight, subtle underline on press). Products, customers, ingredients, transactions — all tappable everywhere.

2. **Panel Activation** — Tap entity → slide-in panel from right (300ms, spring easing). Panel width: 400px tablet, full-width phone. Background dims slightly.

3. **Panel Navigation (Cascading)** — Tap entity in panel → new panel slides in. On tablet: panels stack up to 2 deep, then replace. On phone: always replace with back gesture. Breadcrumb updates.

4. **Panel Actions** — Contextual actions in panel header. Product: "Edit," "View Sales." Customer: "Settle Tab," "View Transactions." Ingredient: "Restock," "View History."

5. **Return to Context** — Tap X or swipe right → panel closes. Original screen exactly as left. If action was taken, original screen reflects the change via optimistic update.

## Visual Design Foundation

### Color System

**Philosophy: Monochromatic canvas, earned color.**

The UI is 95% neutral grays. Color is reserved exclusively for semantic meaning — status indicators, interactive elements, and urgent alerts. If a color doesn't carry information, it doesn't exist.

**Color Space:** OKLCH — perceptually uniform, excellent for generating consistent light/dark themes. Hue: 265 (cool blue-gray slate).

**Light Mode — Neutral Palette:**

| Token | OKLCH Value | Usage |
|-------|-------------|-------|
| `--background` | `oklch(0.985 0.002 265)` | Page background — near-white, barely warm |
| `--foreground` | `oklch(0.145 0.015 265)` | Primary text — near-black |
| `--card` | `oklch(1.0 0 0)` | Card/surface — pure white, lifts off background |
| `--card-foreground` | `oklch(0.145 0.015 265)` | Text on cards |
| `--muted` | `oklch(0.965 0.003 265)` | Subtle backgrounds, hover states |
| `--muted-foreground` | `oklch(0.556 0.01 265)` | Secondary text, timestamps — ~50% contrast |
| `--border` | `oklch(0.922 0.004 265)` | Hairline borders, dividers — barely there |
| `--input` | `oklch(0.922 0.004 265)` | Input field borders |
| `--ring` | `oklch(0.45 0.03 265)` | Focus ring |
| `--primary` | `oklch(0.205 0.015 265)` | Primary buttons, active nav — near-black, authoritative |
| `--primary-foreground` | `oklch(0.985 0.002 265)` | Text on primary — white |
| `--secondary` | `oklch(0.965 0.003 265)` | Secondary buttons |
| `--secondary-foreground` | `oklch(0.205 0.015 265)` | Text on secondary |
| `--accent` | `oklch(0.965 0.003 265)` | Hover/active backgrounds |
| `--accent-foreground` | `oklch(0.145 0.015 265)` | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.33)` | Delete, void, destructive actions — red |
| `--destructive-foreground` | `oklch(0.985 0.002 265)` | Text on destructive |

**Semantic Status Colors:**

| Token | OKLCH Value | Usage |
|-------|-------------|-------|
| `--status-ok` | `oklch(0.52 0.14 155)` | Stock OK, payment complete, kitchen served |
| `--status-warning` | `oklch(0.68 0.16 70)` | Low stock, kitchen delayed (5-9 min), pending |
| `--status-critical` | `oklch(0.577 0.245 27)` | Out of stock, overdue (10+ min), failed |
| `--status-info` | `oklch(0.55 0.12 250)` | Informational, tab/pay-later, GCash |

**Dark Mode — Neutral Palette:**

| Token | OKLCH Value | Usage |
|-------|-------------|-------|
| `--background` | `oklch(0.13 0.01 265)` | Page background — deep dark |
| `--foreground` | `oklch(0.93 0.005 265)` | Primary text — near-white |
| `--card` | `oklch(0.17 0.01 265)` | Card surfaces — slightly lifted |
| `--muted` | `oklch(0.21 0.01 265)` | Subtle backgrounds |
| `--muted-foreground` | `oklch(0.60 0.01 265)` | Secondary text |
| `--border` | `oklch(0.25 0.01 265)` | Hairline borders |
| `--primary` | `oklch(0.93 0.005 265)` | Primary buttons — inverted (white) |
| `--primary-foreground` | `oklch(0.13 0.01 265)` | Text on primary — dark |
| `--destructive` | `oklch(0.65 0.2 25)` | Brighter red for dark mode visibility |

**Sidebar Colors:**

| Token | Light | Dark |
|-------|-------|------|
| `--sidebar` | `oklch(0.975 0.003 265)` | `oklch(0.15 0.01 265)` |
| `--sidebar-foreground` | `oklch(0.145 0.015 265)` | `oklch(0.93 0.005 265)` |
| `--sidebar-border` | `oklch(0.922 0.004 265)` | `oklch(0.25 0.01 265)` |
| `--sidebar-accent` | `oklch(0.95 0.005 265)` | `oklch(0.22 0.01 265)` |
| `--sidebar-primary` | `oklch(0.205 0.015 265)` | `oklch(0.93 0.005 265)` |

### Typography System

**Typeface: Inter** — Geometric sans-serif designed for screens. Optimal at 12-16px. Variable font for precise weight control. The same typeface Linear uses.

**Monospace: JetBrains Mono** — For order numbers, transaction IDs, currency amounts.

**Type Scale:**

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 12px | 16px | 400-500 | Fine print, badges, timestamps |
| `text-sm` | 13px | 18px | 400-500 | Table cells, metadata, secondary info |
| `text-base` | 14px | 20px | 400 | Body text, form inputs, primary content |
| `text-lg` | 16px | 24px | 500-600 | Section headings, card titles |
| `text-xl` | 20px | 28px | 600 | Page subtitles |
| `text-2xl` | 24px | 32px | 700 | Page titles |

On tablet (≥768px): Bump `text-base` to 15px for arm's-length readability.

**Weight System:**

| Weight | Class | Usage |
|--------|-------|-------|
| 400 | `font-normal` | Body text, descriptions, form values |
| 500 | `font-medium` | Labels, table headers, nav items, metadata |
| 600 | `font-semibold` | Section headings, card titles, emphasis |
| 700 | `font-bold` | Page titles only. Nothing else. |

**Hierarchy Rule:** Increase weight first → then size → color is the last resort.

### Spacing & Layout Foundation

**Base Unit: 4px. Primary Rhythm: 8px.**

| Token | Value | Tailwind | Primary Usage |
|-------|-------|----------|---------------|
| `space-0.5` | 2px | `0.5` | Micro-gaps (icon-to-text in badges) |
| `space-1` | 4px | `1` | Tight padding (badge internal) |
| `space-2` | 8px | `2` | Standard gap between related elements |
| `space-3` | 12px | `3` | Sidebar item padding, form field gaps |
| `space-4` | 16px | `4` | Card padding, section spacing |
| `space-5` | 20px | `5` | Content area padding (mobile) |
| `space-6` | 24px | `6` | Content area padding (tablet), section gaps |
| `space-8` | 32px | `8` | Major section breaks |
| `space-10` | 40px | `10` | Page header spacing |
| `space-12` | 48px | `12` | Touch target minimum height |
| `space-16` | 64px | `16` | Hero spacing, major structural gaps |

**Border Radius Scale:**

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, small pills |
| `--radius` | 6px | Buttons, inputs, table cells |
| `--radius-md` | 8px | Cards, panels |
| `--radius-lg` | 12px | Modals, dialogs, sheets |
| `--radius-full` | 9999px | Avatars, round badges |

**Shadow System (Two Levels Only):**

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-none` | none | **Default for everything.** Cards, buttons, inputs — all flat. |
| `shadow-float` | `0 4px 12px oklch(0 0 0 / 0.08), 0 1px 3px oklch(0 0 0 / 0.06)` | Floating overlays only: modals, dropdowns, popovers. |

**Layout Grid:**

| Context | Structure |
|---------|-----------|
| **App shell** | Sidebar (240px) + Content (fluid) |
| **Content area** | `max-w-6xl mx-auto px-6` (tablet), `px-4` (phone) |
| **Page structure** | Header (title + breadcrumb + actions) → Body → Optional Footer |
| **Data pages** | Filters + Table/Grid + Pagination |
| **POS layout** | Product Grid (fluid) + Cart Sidebar (380px) — no max-width |
| **Detail panels** | Slide from right, 420px tablet, full-width phone |

**Touch Target Rules:**

| Context | Minimum | Comfortable |
|---------|---------|------------|
| POS product cards | 48px | 80-100px |
| POS action buttons | 48px | 48-56px |
| Navigation items | 40px | 44px |
| Table rows | 40px | 44-48px |
| Form inputs | 40px | 44px |
| Icon buttons | 36px | 40px |

### Accessibility Considerations

- **Color contrast:** All text meets WCAG 2.1 AA (4.5:1 body, 3:1 large text). Foreground on background: ~15:1. Muted-foreground on background: ~5.5:1.
- **Focus indicators:** 2px ring in `--ring` color, 2px offset. Visible in both modes.
- **Motion sensitivity:** All animations respect `prefers-reduced-motion`. Reduced = instant transitions.
- **Text scaling:** `rem` for all font sizes. Layout survives 200% zoom.
- **Touch targets:** ≥44px on touch devices via `@media (pointer: coarse)`.
- **Color independence:** Status never communicated by color alone — always paired with icon, label, or position.

## Design Direction Decision

### Design Direction Chosen

**Single Direction: Linear-Inspired Monochromatic POS**

Rather than exploring competing directions, we converged early on a singular, clear vision: Linear's design philosophy applied to a tablet-first POS system. The direction was validated through an interactive HTML mockup (`ux-design-directions.html`) showing 4 key screens.

### Design Direction Summary

The design is defined by five visual rules:

1. **Flat by default** — No shadows on cards, tables, or static elements. Only floating overlays (modals, panels, dropdowns) get elevation shadow. Everything else is defined by 1px hairline borders.
2. **Color is earned** — 95% of the UI is neutral gray. Color appears exclusively for: status indicators (stock, payment, kitchen urgency), the primary CTA button, and destructive actions. Nothing else.
3. **Typography is the hierarchy** — Weight (400→500→600→700) and size (12→13→14→16→20→24px) create all visual hierarchy. No color-based emphasis on text.
4. **Mathematical spacing** — Every value is a multiple of 4px. Primary rhythm is 8px. No exceptions. This creates the subconscious "everything feels right" sensation.
5. **Tight radii** — 6px on buttons/inputs, 8px on cards, 12px on modals. Professional and precise, not bubbly.

### Mockup Screens Validated

| Screen | Pattern Demonstrated | Status |
|--------|---------------------|--------|
| **POS Terminal** | Product grid + cart sidebar + category pills | Validated |
| **Transactions** | Data table + summary cards + filter pills + pagination | Validated |
| **Detail Panel** | Slide-in panel with entity details + activity timeline + actions | Validated |
| **Payment Modal** | Centered modal with tabs + denomination buttons + completion | Validated |
| **Dark Mode** | Full theme inversion across all screens | Validated |

### Implementation Notes

The validated mockup confirms these patterns will be reused across all remaining screens:

- **Product grid** pattern → POS product selection
- **Data table** pattern → Transactions, Ingredients, Customers, Users, Audit Log, Waste
- **Slide-in panel** pattern → All entity detail views (products, transactions, customers, ingredients)
- **Modal** pattern → Payment, forms, confirmations, restock dialogs
- **Summary cards** pattern → Transactions header, Analytics dashboard, Calendar
- **Filter pills** pattern → All filterable views
- **Status dots** pattern → Stock status, payment status, kitchen timing, task completion

Reference file: `_bmad-output/planning-artifacts/ux-design-directions.html`

## User Journey Flows

### Journey 1: Cash Sale (Core Loop)

**Frequency:** 50+ times/day | **Target time:** < 10 seconds | **Priority:** P0

**Entry Point:** POS screen (default landing page)

**Steps:** POS loaded → Browse/search products → Tap product card (instant cart add) → More items? → Tap "Pay ₱XXX" → Payment modal (Cash tab default) → Tap denomination (₱100/₱500/₱1000) or Exact → Change calculated → Tap "Complete Payment" → Checkmark animation (200ms) → Success state (2s auto-dismiss) → Cart clears → Ready for next customer

| Step | UI Component | Timing |
|------|-------------|--------|
| Product → cart | Card press scale(0.98) → cart badge bumps | Instant (optimistic) |
| Quantity adjust | Tap again to increment, or tap qty in cart for numpad | Instant |
| Remove item | Swipe left on cart row → "Undo" toast | 150ms slide, 5s undo |
| Open payment | "Pay" primary button 48px → modal slides up | 250ms |
| Select amount | Denomination buttons 2x2 grid, 44px | Instant fill |
| Complete | Primary full-width → disabled during processing | < 500ms |
| Success | Checkmark draws, totals displayed | 200ms animation |
| Reset | Modal slides down, cart clears | 250ms |

**Error Recovery:** Network down → offline queue toast. Wrong product → swipe remove + undo. Wrong qty → tap to edit. Insufficient amount → button disabled, "₱XX remaining" shown.

### Journey 2: GCash Payment

**Frequency:** 10-20 times/day | **Target time:** < 20 seconds | **Priority:** P0

**Entry Point:** Payment modal → GCash tab

**Steps:** Products in cart → Tap "Pay" → Tap "GCash" tab → Camera component loads → Take photo of GCash receipt (or skip) → Photo preview with retake option → Tap "Complete Payment" → Success → Cart clears

**Key UX:** Camera viewfinder in modal (aspect-ratio 4/3, border-radius 8px). 56px round capture button. "Skip photo" as `text-sm text-muted-foreground` link. Photo preview with retake/confirm options.

### Journey 3: Pay Later (Tab)

**Frequency:** 5-15 times/day | **Target time:** < 12 seconds | **Priority:** P0

**Entry Point:** POS cart → "Pay Later" button (secondary, beside "Pay")

**Steps:** Products in cart → Tap "Pay Later" → Modal opens → Search/select customer (recent shown first) → Or create new customer (inline form: name required) → Customer selected (existing tab balance shown) → Order summary → Tap "Add to Tab" → Success toast ("Added ₱505 to Maria's tab") → Cart clears → Kitchen order auto-created

**Cross-Entity:** Customer name in success toast is tappable → opens customer detail panel with full tab history.

### Journey 4: Kitchen Order Lifecycle

**Frequency:** Continuous during service | **Target time:** < 3 seconds per status change | **Priority:** P0

**Entry Point:** Kitchen Orders screen (auto-populated from POS payments)

**Steps:** Payment creates order → Order card appears in NEW column (sound notification) → Tap "Start" → Card moves to COOKING → Timer starts with urgency escalation (0-4m: normal, 5-9m: amber border, 10+m: red border + pulse) → Tap "Ready" → Card moves to READY → Tap "Served" → Card archived

**Layout:** 3-column kanban (NEW | COOKING | READY). Order cards show: order # (bold mono), items list (text-sm), time in status (text-xs, live updates), action button (full-width primary). Rush flag: lightning icon + amber card background. 5-second polling. Sound notifications configurable.

### Journey 5: Split Payment

**Frequency:** 3-8 times/day | **Target time:** < 25 seconds | **Priority:** P1

**Entry Point:** Payment modal → Split tab

**Steps:** Tap "Pay" → Tap "Split" tab → Two-section layout: Cash amount + GCash amount → Enter cash portion (numpad) → GCash auto-calculates remainder → Amounts validated (Cash + GCash ≥ Total) → Tap "Process Split" → Cash processed, change calculated → GCash camera loads for GCash portion → Capture photo → Success with split breakdown

**Key UX:** Auto-calculation is real-time (typing cash amount instantly updates GCash). Split summary always visible: "Cash: ₱300 + GCash: ₱225 = ₱525". Sequential processing but feels like one action.

### Journey 6: Tab Settlement

**Frequency:** 3-10 times/day | **Target time:** < 30 seconds | **Priority:** P1

**Entry Point:** Customers page → customer with tab balance OR customer panel from any screen

**Steps:** See customers with tab balances highlighted → Tap customer → Detail panel slides in → Tab section shows unpaid transactions → Select transactions to settle (all or specific) → Settlement total shown → Tap "Settle Tab" → Payment method selection (Cash/GCash/Split — same components as POS) → Process payment → Transactions marked paid → Tab balance updates to ₱0

**Cross-Entity:** Each unpaid transaction is tappable → transaction detail (cascading panel). Payment uses identical modal components as POS.

### Journey 7: Inventory Count

**Frequency:** Daily (end of day) | **Target time:** 10-30 minutes | **Priority:** P1

**Entry Point:** Ingredients page → "Start Count" OR sidebar shortcut

**Steps:** Tap "Start Count" → Check for existing draft (resume if exists) → Fetch all ingredients → Count screen with category sections → Progress bar at top (0/XX) → Expand category → For each ingredient: Quick Confirm (✓) if matches expected, OR Discrepancy (⚠️) → Discrepancy modal: actual count, select reason (Waste/Breakage/Theft/Miscount/Testing/Promo/Other), optional note → Save → Progress updates → Repeat → All counted → Submit → Confirmation → Quantities updated, history logged

**Key UX:** Auto-save draft every 30s. "Save Draft" for manual save (resume later). Sidebar badge: "Count in progress". Category sections collapse/expand. Completed categories show ✓. Discrepancies show amber badges with variance.

### Journey 8: Cross-Entity Navigation

**Frequency:** Continuous | **Priority:** P1 — The soul of the redesign

This is a universal pattern, not a linear journey. Three example chains:

**Chain A — POS → Stock → Ingredient → Restock:** See "Low Stock" badge on product → Tap badge → Product panel (recipe shows low ingredient) → Tap ingredient → Ingredient panel (qty, par, vendor) → Tap "Restock" → Dialog in panel → Confirm → Stock updated → Close panel → Back to POS (product now shows "In Stock")

**Chain B — Transactions → Customer → Tab → Settlement:** See customer name in transaction row → Tap name → Customer panel (tab balance ₱1,250) → Tap "Settle Tab" → Select transactions → Payment → Tab settled → Close panel → Transaction status updated

**Chain C — Menu → Product → Recipe → Cost Analysis:** See low margin on product → Tap row → Product panel (price/cost/margin) → See cost driver ingredient → Tap ingredient → Ingredient panel (cost history, vendor) → Insight gained → Close panels → Back to Menu

**Panel Mechanics:** Tablet: first panel 420px, second stacks beside (first shrinks to 200px), max 2 deep. Phone: full-width, always replaces. Breadcrumb tracks chain. Close restores previous. Original screen preserved (scroll, filters, selection). Optimistic updates reflected on close.

### Journey 9: Product + Recipe Management

**Frequency:** Weekly | **Target time:** 2-5 min/product | **Priority:** P2

**Entry Point:** Menu → Products tab → "Add Product" or tap existing

**Steps:** Tap product row → View panel slides in → Tap "Edit" → Panel switches to edit mode → Form: name, category (dropdown), image upload, selling price → Recipe Builder: search ingredients → Set qty + unit → Cost auto-calculates → Food Cost / Margin % / vs Target shown live → Margin acceptable? → Save → Panel switches to view mode → Table updates

**Key UX:** Recipe builder is inline in panel (search + add pattern). Cost summary on `var(--muted)` background. Margin color: green ≥65%, amber 50-65%, red <50%. Sticky save/cancel in panel footer.

### Journey 10: Ingredient Restock

**Frequency:** 5-15 times/week | **Target time:** < 15 seconds | **Priority:** P2

**Entry Points:** Sidebar badge → Ingredients page | POS stock badge → product panel → ingredient | Menu product panel → recipe → ingredient | Ingredients table → tap low-stock row

**Steps:** Reach ingredient (from any entry point) → Tap "Restock" → Dialog: quantity input (auto-focused), cost per unit (pre-filled last cost), vendor (pre-selected last vendor), optional note → Tap "Confirm Restock" → Stock updated, history logged → Panel reflects new quantity → Sidebar badge decreases

**Key UX:** Same dialog regardless of entry point. Smart defaults: last cost, last vendor. Descriptive button: "Add 8kg at ₱120/kg". Accessible from *any context* where an ingredient appears.

### Journey Patterns

**Navigation:** Slide-in panel (all entities), Cascading panels (cross-entity), Tab switching (payment, menu), Category sections (POS, inventory count), Quick filter pills (all filterable views).

**Actions:** Optimistic tap (cart, status changes), Confirmation dialog (void, delete, submit — irreversible only), Undo toast (cart remove, quick edits — 5s window), Inline form (restock, new customer), Sequential processing (split payment, inventory count).

**Feedback:** Status dots (8px circle + label, 4 colors), Progress bar (inventory count, multi-step), Success animation (checkmark, 200ms), Badge counts (sidebar, real-time), Time-based urgency (kitchen: normal → amber → red + pulse), Toast notifications (bottom-right, 3-5s auto-dismiss, optional undo).

### Flow Optimization Principles

1. **Minimize taps to value** — Cash sale: 3 taps minimum. If a flow takes >5 taps, question every intermediate step.
2. **Smart defaults eliminate decisions** — Payment defaults to Cash. Restock pre-fills last cost/vendor. Every default saved is a decision the user doesn't make.
3. **Progressive processing, not blocking** — Split processes sequentially but feels like one action. Count saves drafts continuously. Offline queues silently.
4. **Same component, same behavior, everywhere** — Restock dialog identical from POS, Menu, or Ingredients. Payment flow identical in POS and Tab Settlement.
5. **Error recovery > error prevention** — Undo after action instead of "Are you sure?" before. Reserve confirmation for truly irreversible actions only.

## Component Strategy

### shadcn Foundation Components (Reinstall Fresh)

32 components to reinstall with new design tokens:

| Component | Priority | Usage |
|-----------|----------|-------|
| Button, Input, Select, Label, Form, Textarea | P0-P1 | Every screen |
| Card, Badge, Avatar | P0-P2 | Cards, status, users |
| Dialog, Sheet, Drawer, Alert Dialog | P0-P1 | Modals, panels, confirmations |
| Table, Tabs, Pagination | P0-P2 | Data pages, sub-views |
| Dropdown Menu, Popover, Command | P1 | Context menus, search |
| Scroll Area, Separator, Breadcrumb | P0-P1 | Overflow, dividers, navigation |
| Skeleton, Sonner | P0 | Loading states, toasts |
| Sidebar, Collapsible | P0-P2 | App shell, expandable sections |
| Checkbox, Switch, Radio Group, Toggle Group | P1-P2 | Forms, settings, toggles |
| Progress | P2 | Inventory count, uploads |

### Custom Components

15 domain-specific components built on shadcn primitives:

**1. StatusDot** — Unified 8px status indicator. Variants: ok/warning/critical/info/neutral. Optional pulse for urgency. Always paired with text label. Replaces all hardcoded colored badges across the app.

**2. EntityLink** — Tappable entity name that opens a DetailPanel. Renders as font-medium inline text with hover underline. Variants per entity type (product/customer/ingredient/transaction). The "everything connects" building block.

**3. DetailPanel** — Slide-in contextual panel (composes shadcn Sheet, side=right). 420px tablet, full-width phone. View and edit modes. Supports cascading (2 deep tablet). Breadcrumb trail. Spring animation 300ms. Background dims 5%.

**4. ProductCard** — POS grid item (composes Card + Badge + StatusDot). Image area (4:3), name, price (mono), stock status. Tap to add to cart. Hover: accent bg. Pressed: scale(0.98). Disabled: opacity 0.5 for out-of-stock.

**5. CartSidebar** — POS order panel (composes Card + ScrollArea + Button). Header with count badge, scrollable item list with swipe-to-remove, summary section, action footer (Hold + Pay buttons). 380px width.

**6. PaymentFlow** — Multi-method payment modal (composes Dialog + Tabs). Sub-components: CashPayment (numpad + denominations), GCashPayment (camera), SplitPayment (dual inputs), PaymentSuccess (checkmark + summary). States: idle → processing → success (auto-dismiss 2s) → error (offline toast).

**7. Numpad** — Touch-friendly 3×4 numeric grid (composes Button grid). Keys: 1-9, dot, 0, backspace. Optional denomination row. Each key 56×48px minimum. Pressed: scale(0.95).

**8. KitchenOrderCard** — Kanban card (composes Card + Badge + Button + StatusDot). Order # (bold mono), items, time badge, action button. Urgency: normal → amber border (5-9m) → red border + pulse (10+m). Rush: lightning icon + amber tint.

**9. DataTable** — Enhanced table (composes Table + Checkbox + Pagination + Skeleton). Responsive column hiding, row click → DetailPanel, loading skeleton, empty state. 44px row height, hover accent bg. Reused across 6+ pages.

**10. FilterPills** — Horizontal scrollable quick-filter chips (composes Toggle Group). 28-32px height, radius-full. Active: primary bg. Inactive: secondary bg. Optional count badges.

**11. SummaryCard** — Standardized metric card (composes Card). Label (xs, muted, uppercase) + Value (xl, bold, mono) + Trend (xs, colored arrow). Reused on Transactions, Analytics, Calendar.

**12. RestockDialog** — Quick restock form (composes Dialog + Input + Select). Ingredient name + current qty header. Qty input (auto-focus), cost (pre-filled last), vendor (pre-selected last), optional note. Descriptive confirm: "Add 8kg at ₱120/kg". Accessible from any context.

**13. OfflineIndicator** — Subtle offline notification. Small bar in header: cloud-off icon + "Offline · 3 queued". States: hidden (online), visible (amber), syncing (pulse), synced (brief success then hide).

**14. UniversalSearch** — Cross-entity search (composes Command). Results grouped by type. Recent searches in localStorage. Tap result → DetailPanel. Persistent search bar on tablet, expandable icon on phone.

**15. EmptyState** — Redesigned empty state with personality. Icon (24px, muted) + title (lg, semibold) + description (sm, muted) + optional action button. Encouraging tone: "No transactions yet — your first sale is going to feel great."

### Component Implementation Roadmap

| Phase | Components | Screens Unblocked |
|-------|-----------|-------------------|
| **Phase 0** | Design tokens (globals.css + tailwind config), Inter font | All (foundation) |
| **Phase 1** | Sidebar, UniversalSearch, OfflineIndicator, Breadcrumb | App shell, navigation |
| **Phase 2** | ProductCard, FilterPills, CartSidebar, PaymentFlow, Numpad | POS terminal |
| **Phase 3** | DataTable, SummaryCard, StatusDot, EntityLink, DetailPanel | Transactions, Ingredients, Customers, Users, Audit Log, Waste |
| **Phase 4** | KitchenOrderCard, KitchenBoard layout | Kitchen Orders |
| **Phase 5** | RestockDialog, DiscrepancyModal, ProductForm, CustomerForm | Menu, Ingredients, Customers |
| **Phase 6** | Chart integration, LeverCard, Calendar grid | Analytics, Calendar |
| **Phase 7** | EmptyState (all pages), Skeleton states (all pages), dark mode validation | All (polish) |

**Per-Component Build Process:** Check shadcn MCP for example → Install fresh (--overwrite) → Verify token inheritance → Build domain wrapper → Test all states → Test accessibility → Test responsive → Integrate

## UX Consistency Patterns

### Button Hierarchy

**Four tiers. No exceptions.**

| Tier | Tailwind Classes | When to Use | Examples |
|------|-----------------|------------|---------|
| **Primary** | `bg-primary text-primary-foreground` | One per visible context. The single most important action. | "Pay ₱525", "Save Product", "Complete Payment", "Submit Count" |
| **Secondary** | `bg-secondary text-secondary-foreground border` | Supporting actions next to a primary. Never alone. | "Hold Order", "Pay Later", "Cancel", "Save Draft" |
| **Ghost** | `bg-transparent hover:bg-accent text-foreground` | Tertiary actions, toolbar buttons, navigation. | "Edit", "Restock", "View History", "Close" |
| **Destructive** | `bg-destructive text-destructive-foreground` | Irreversible data-loss actions only. | "Void Transaction", "Delete Product" |

**Button Rules:**
- Maximum one Primary button visible at a time per context (modal, card, page section)
- Destructive buttons never appear as Primary — always in a confirmation dialog
- Full-width buttons only inside modals and panel footers. Inline everywhere else
- Button height: 40px default, 48px for POS/payment context (`h-10` / `h-12`)
- Disabled state: `opacity-50 pointer-events-none`. No tooltip on touch — the why should be visible in context (e.g., "₱50 remaining" when Complete is disabled)
- Loading state: Button text replaced with subtle spinner, button stays disabled. Never show "Loading..." text
- Icon + text buttons: icon left, 4px gap (`gap-1`). Icon-only buttons: 40px square with `aria-label`

### Feedback Patterns

**Success Feedback:**

| Context | Pattern | Duration | Behavior |
|---------|---------|----------|----------|
| Payment complete | Checkmark animation replaces form content | 200ms draw, 2s display | Auto-dismiss → modal closes, cart clears |
| Save/create | Toast notification (bottom-right) | 3s auto-dismiss | "Product saved" / "Customer created" — tap to dismiss early |
| Status change | Optimistic inline update | Instant | Kitchen card moves columns. Cart item count updates. No toast needed. |
| Restock | Toast + panel update | 3s toast | "Added 8kg. Stock: 10kg" — panel reflects new quantity |

**Error Feedback:**

| Context | Pattern | Tone | Behavior |
|---------|---------|------|----------|
| Network failure | Toast notification (amber) | Calm, informative | "Saved to offline queue. Will sync when connected." — persistent until back online |
| Validation error | Inline field error | Direct, specific | Red border on field + `text-xs text-destructive` message below. "Price must be greater than 0" |
| API error | Toast notification (red) | Honest, actionable | "Couldn't save — please try again." With retry button in toast |
| Permission denied | Toast notification (gray) | Matter-of-fact | "You don't have permission for this action." No retry — just clarity |

**Warning Feedback:**

| Context | Pattern | Behavior |
|---------|---------|----------|
| Low stock alert | StatusDot (amber) + text label | Persistent on product card and ingredient row. No toast — not urgent enough |
| Unsaved changes | Blocking dialog on navigate | "You have unsaved changes. Discard or continue editing?" — only in edit mode |
| Approaching limit | Inline text (muted) | "3 of 5 ingredients counted" — informational, not alarming |

**Toast Notification Rules:**
- Position: bottom-right (desktop/tablet), bottom-center (phone)
- Stack: max 3 visible. Newest on bottom. Older ones collapse
- Duration: 3s (success), 5s (error with retry), persistent (offline status)
- Action button: optional. "Undo" (5s window) for removals. "Retry" for failures
- Never use toasts for validation errors — those are inline on the field
- No success toasts for optimistic actions (cart add, status changes) — the UI update *is* the feedback

### Form Patterns

**Form Layout Rules:**

| Rule | Specification |
|------|--------------|
| **Field spacing** | 16px between fields (`gap-4` or `space-y-4`) |
| **Label position** | Above input. Always. No inline labels, no floating labels |
| **Label style** | `text-sm font-medium` — terse, unambiguous. "Product Name" not "Enter the name of your product" |
| **Required fields** | No asterisks. All fields required unless marked "(optional)" |
| **Helper text** | Below field, `text-xs text-muted-foreground`. Only when non-obvious |
| **Error text** | Below field, replaces helper text, `text-xs text-destructive` |
| **Input height** | 40px (`h-10`). POS numpad context: 48px (`h-12`) |

**Validation Strategy:**

| When | What | How |
|------|------|-----|
| On blur | Single field validation | Show error immediately after leaving field |
| On submit | All fields | Scroll to first error, focus the field |
| On change (after error) | Clear error when valid | Field goes back to normal state as user types |
| Real-time | Calculated fields only | Cost/margin in recipe builder updates live. Currency formatting on blur |

**Form Action Placement:**

| Context | Layout | Behavior |
|---------|--------|----------|
| **In panel (edit mode)** | Sticky footer: "Cancel" (ghost, left) + "Save" (primary, right) | Always visible even when scrolling |
| **In modal** | Bottom of modal: "Cancel" (ghost) + "Submit" (primary) | Modal scrolls if content overflow |
| **Full page** | Top-right in page header: "Cancel" (ghost) + "Save" (primary) | Fixed in header |

**Smart Defaults:**
- Payment modal → Cash tab selected
- Category dropdown → most recently used category
- Restock cost → last purchase cost for this ingredient
- Restock vendor → last vendor for this ingredient
- Date fields → today
- Quantity fields → empty (not 0 — 0 looks like a value)

### Navigation Patterns

**Sidebar Navigation:**

| Behavior | Specification |
|----------|--------------|
| **Width** | 240px tablet, collapsible on phone |
| **Active state** | `bg-sidebar-accent` fill + `font-medium` text. No colored highlight |
| **Badge counts** | Right-aligned pill. Real-time updates. Max "99+" |
| **Grouping** | Logical sections: Sales, Inventory, Management. Separator between groups |
| **Tooltip** | Collapsed sidebar: icon hover shows label tooltip (tablet). Not needed on phone |
| **Keyboard** | Arrow keys navigate items. Enter activates |

**Page-Level Navigation:**

| Pattern | Component | When |
|---------|-----------|------|
| **Tab bar** | shadcn Tabs, `border-b` style | Sub-views within a page (Menu: Products/Categories) |
| **Filter pills** | FilterPills (custom) | Quick data filtering (Today/Yesterday/This Week, category filter) |
| **Breadcrumb** | shadcn Breadcrumb | Page header when deeper than top-level. "Menu > Chicken Adobo > Oxtail" |
| **Search** | UniversalSearch (custom) | Persistent in header bar. All-entity search with grouped results |

**Panel Navigation (The Connected System):**

| Behavior | Tablet (≥768px) | Phone (<768px) |
|----------|-----------------|----------------|
| **Open** | Slides from right, 420px, 300ms spring | Full-width, pushes content |
| **Second panel** | Stacks beside first (first shrinks to 200px) | Replaces first (back gesture available) |
| **Third panel** | Replaces second (max 2 visible) | Replaces second |
| **Breadcrumb** | "Menu > Kare-Kare > Oxtail" — full chain visible | Same, horizontally scrollable |
| **Close** | X button or tap dimmed background | X button or swipe right |
| **Context preservation** | Original screen scroll, filters, selection all preserved | Same |

**Back Navigation:**
- Browser back button: always works. Never break it
- Panel close → restore previous panel or original screen
- Page navigation → sidebar active state updates, scroll position resets
- No custom "Back" buttons — use breadcrumbs and panel close instead

### Modal & Overlay Patterns

**When to Use Each:**

| Overlay | Trigger | When | Width |
|---------|---------|------|-------|
| **Modal (Dialog)** | User-initiated action | Payment, confirmation, forms that need focus | 480px max, centered |
| **Panel (Sheet)** | Entity tap | Viewing/editing entity details | 420px, right side |
| **Popover** | Specific field interaction | Quantity editor, date picker | Content-sized, anchored to trigger |
| **Dropdown** | Menu trigger | Action menus, selects | Content-sized, anchored |
| **Toast** | System feedback | Success, error, offline status | 360px max, bottom-right |

**Modal Rules:**
- Always closable: X button + backdrop click + Escape key
- Never nested: a modal inside a modal = redesign needed
- Focus trapped inside while open
- Title always present (for screen readers even if visually hidden)
- Max height: 85vh with internal scroll for content overflow
- Backdrop: `oklch(0 0 0 / 0.4)` — dims content but still partially visible

**Panel vs Modal Decision Tree:**
- "Am I viewing/editing a specific entity?" → **Panel**
- "Am I performing a focused action (payment, confirmation)?" → **Modal**
- "Does the action benefit from seeing the underlying content?" → **Panel**
- "Does the action need full user attention?" → **Modal**

### Loading & Empty State Patterns

**Loading States:**

| Context | Pattern | Behavior |
|---------|---------|----------|
| **Page load** | Skeleton placeholder | Exact layout of content with `bg-muted animate-pulse` rectangles. No spinner |
| **Table data** | Skeleton rows (5 rows) | Table header visible, rows are skeleton. Column widths match real data |
| **Panel open** | Skeleton in panel | Panel shell visible immediately, content area shows skeleton |
| **Button action** | Button spinner | Button text replaced with 16px spinner, button disabled |
| **Quick actions (<200ms)** | Nothing | No loading indicator. Optimistic update is the feedback |

**Skeleton Rules:**
- Match the exact layout of the content being loaded. Users should recognize what's coming
- Never show a single centered spinner for page content
- Skeleton animation: `animate-pulse` (Tailwind default). Not shimmer — too decorative for our aesthetic
- Progressive loading: show content as it arrives. Don't wait for everything

**Empty States:**

| Context | Content | Action |
|---------|---------|--------|
| **No transactions** | "No transactions yet — your first sale is going to feel great." | "Go to POS" button |
| **No products** | "Add your menu items to start selling." | "Add Product" button |
| **No customers** | "Customers will appear here when they use tabs or make repeat visits." | None — auto-created |
| **Empty search** | "No results for '[query]'" | "Clear search" link |
| **Empty cart** | "Add products to start an order" | None — the product grid is the action |
| **No kitchen orders** | "Kitchen is clear — no pending orders." | None |
| **Empty filter result** | "No [items] match your filters" | "Clear filters" link |

**Empty State Rules:**
- Always include an icon (24px, `text-muted-foreground`). Lucide icons only
- Title: `text-lg font-semibold`. Description: `text-sm text-muted-foreground`
- Action button: only when there's a clear, single next step
- Tone: encouraging, not generic. Personality moments welcome here
- Never show an empty table — show the EmptyState component instead

### Search & Filter Patterns

**Universal Search:**

| Behavior | Specification |
|----------|--------------|
| **Trigger** | Persistent search bar in header (tablet). Search icon → expandable (phone). Cmd+K on desktop |
| **Debounce** | 300ms after last keystroke |
| **Results** | Grouped by type: Products, Customers, Ingredients, Transactions. Max 3 per group |
| **Result item** | Type icon + entity name + key metadata (price, phone, qty). Tappable → DetailPanel |
| **Empty result** | "No results for '[query]'" — inline in dropdown |
| **Recent** | Last 5 searches stored in localStorage. Shown when search focused with empty query |
| **Keyboard** | Arrow keys to navigate results. Enter to select. Escape to close |

**Filter Patterns:**

| Type | Component | Behavior |
|------|-----------|----------|
| **Quick filters** | FilterPills | Horizontal scrollable. One active at a time (radio). Tap active to deselect (show all) |
| **Multi-select filters** | Checkbox group in Popover | "Filter by status" → popover with checkbox options. Active count shown: "Status (2)" |
| **Date range** | Date picker Popover | Presets (Today, Yesterday, This Week, This Month) + custom range |
| **Search filter** | Input at top of table | Instant filter (debounce 200ms). Client-side for small datasets, server-side for paginated |
| **Active filter indication** | Badge count on filter trigger | Shows how many filters active. "Clear all" link when any filter active |

**Filter Persistence:**
- Page-level filters persist in URL query params (shareable, survives refresh)
- Panel filters are ephemeral (reset on close)
- Search query clears on navigation

### Animation & Transition Patterns

**Timing Tokens:**

| Token | Duration | Easing | When |
|-------|----------|--------|------|
| `duration-fast` | 100ms | `ease-out` | Micro-interactions: button press, toggle, checkbox |
| `duration-normal` | 200ms | `ease-in-out` | State changes: hover, focus, tab switch |
| `duration-slow` | 300ms | `cubic-bezier(0.32, 0.72, 0, 1)` (spring) | Panel open, modal appear |
| `duration-exit` | 250ms | `ease-out` | Panel close, modal dismiss, toast exit |

**Animation Rules:**
- All animations respect `prefers-reduced-motion`. Reduced = instant (0ms duration)
- Never animate during the critical path (adding to cart, processing payment). The UI update is the animation
- Spring easing for panels and modals (feels physical). Linear easing never (feels robotic)
- No animation for: loading skeletons appearing, data table rows populating, page navigation
- Subtle animation for: cart item count increment (scale bump), success checkmark (draw-in), toast appear (slide up)
- Never delay content for animation. If content is ready, show it. Animation is garnish, not the meal

**Specific Animations:**

| Element | Animation | Spec |
|---------|-----------|------|
| Cart badge count | Scale bump | `scale(1.2)` → `scale(1)`, 150ms, on increment |
| Product card press | Press scale | `scale(0.98)`, 100ms |
| Panel open | Slide + fade | `translateX(100%)` → `translateX(0)` + `opacity(0)` → `opacity(1)`, 300ms spring |
| Panel close | Slide out | `translateX(0)` → `translateX(100%)`, 250ms ease-out |
| Modal appear | Scale + fade | `scale(0.95) opacity(0)` → `scale(1) opacity(1)`, 200ms spring |
| Toast enter | Slide up | `translateY(16px) opacity(0)` → `translateY(0) opacity(1)`, 200ms |
| Success checkmark | SVG path draw | `stroke-dashoffset` animation, 200ms |
| Kitchen urgency pulse | Border pulse | `border-color` cycles between normal and `--status-critical`, 2s loop |

### Data Display Patterns

**Currency:**
- Format: `₱{amount}` with comma separators. `₱1,250.00`
- Font: `font-mono` (JetBrains Mono) for alignment in tables and summaries
- Negative amounts: `text-destructive`. "-₱150.00" (with minus, never parentheses)
- Zero: "₱0.00" (never "Free" or "—")

**Dates & Times:**
- Relative for recent: "Just now", "5m ago", "2h ago", "Yesterday"
- Absolute after 48h: "Feb 10" (same year), "Feb 10, 2025" (different year)
- Timestamps in tables: "2:45 PM" (time today), "Feb 10, 2:45 PM" (other days)
- All times in local timezone. No UTC display

**Numbers:**
- Quantities: whole numbers for countable ("5 items"), decimals for weight ("2.5 kg")
- Percentages: one decimal max. "65.2%". No trailing zeros: "65%" not "65.0%"
- Large numbers: comma-separated. "12,450" not "12450"
- Counts in badges: "9", "42", "99+" (cap at 99+)

**Tables:**
- Row height: 44px minimum (touch target)
- Hover: `bg-accent` on the full row
- Selected row: `bg-accent` persistent (when detail panel is open for that row)
- Header: `text-xs font-medium text-muted-foreground uppercase tracking-wider`
- Cell alignment: text left, numbers right, status center
- Truncation: ellipsis with full text on title attribute. Never wrap table cell text to 2 lines
- Responsive: priority-based column hiding. Define which columns hide at which breakpoints

## Responsive Design & Accessibility

### Responsive Strategy

**Device Hierarchy: Tablet → Phone → Desktop**

Store-POS is tablet-first. The 10" landscape tablet is the primary device. Phone is the secondary "on-the-go" device. Desktop is a bonus for back-office management.

| Device | Context | Design Priority |
|--------|---------|----------------|
| **Tablet (10" landscape)** | Counter-mounted POS, kitchen board, inventory counts | Primary. Every screen optimized for this first. |
| **Phone (portrait)** | Manager checks, quick lookups, approvals on the move | Secondary. Simplified views, critical data only. |
| **Desktop (large screen)** | Back-office analytics, user management, settings | Tertiary. Uses extra space for content density. |

**Tablet Layout (Primary):**
- Sidebar (240px, persistent) + Content area (fluid)
- POS: Product grid (fluid) + Cart sidebar (380px) — no max-width constraint
- Data pages: Full-width tables, summary cards in 2-4 column grid
- Panels: 420px from right, background dims
- Modals: Centered, 480px max-width

**Phone Layout (Adapted):**
- Sidebar: collapses to hamburger icon. Sheet overlay on tap.
- POS: Product grid full-width. Cart as bottom sheet (swipe up to expand).
- Data pages: Cards instead of table rows for key info. Single column.
- Panels: Full-width, replaces content (with back gesture).
- Modals: Full-width with bottom-sheet treatment (Drawer component).

**Desktop Layout (Enhanced):**
- Sidebar persistent (240px). Content area uses extra space.
- Tables show all columns (no responsive hiding needed).
- Panels and content coexist side-by-side without dimming.
- Summary cards in 4-column grid.
- No layout changes above 1440px — content max-width caps.

### Breakpoint Strategy

**Tailwind CSS 4 breakpoints (mobile-first):**

| Breakpoint | Min Width | Target | Key Layout Change |
|------------|-----------|--------|-------------------|
| Default | 0px | Phone portrait | Single column. Bottom sheet cart. No sidebar. |
| `sm` | 640px | Phone landscape / small tablet | Wider cards, 2-col product grid |
| `md` | 768px | **Tablet** (primary device) | Sidebar appears. POS dual-pane. Tables show. |
| `lg` | 1024px | Large tablet / small desktop | All table columns visible. 3-4 col summary cards. |
| `xl` | 1280px | Desktop | Maximum content density. Panel + content coexist. |

**Critical Breakpoint: `md` (768px)**

This is where the app transforms from "phone mode" to "tablet mode" — the primary operating context. Every component must have its `md:` variant thoughtfully designed.

**Per-Screen Responsive Behavior:**

| Screen | Phone (<768px) | Tablet (≥768px) | Desktop (≥1024px) |
|--------|---------------|-----------------|-------------------|
| **POS** | Grid: 2-col. Cart: bottom sheet toggle. Pay button: fixed bottom. | Grid: 3-4 col + Cart sidebar (380px). Full layout. | Same as tablet. Extra grid columns if space. |
| **Kitchen Orders** | Single column kanban. Swipe between NEW/COOKING/READY. | 3-column kanban. All columns visible. | Same as tablet. |
| **Transactions** | Card list (amount, status, time). Tap → full details. | Full table with sortable columns. Row tap → panel. | All columns visible. |
| **Menu (Products)** | Card list with thumbnail, name, price. | Full table with image, name, category, price, cost, margin, stock. | All columns + action column. |
| **Ingredients** | Card list with name, quantity, status. | Full table. | All columns. |
| **Customers** | Card list with name, tab balance. | Full table. | All columns. |
| **Analytics** | Stacked summary cards (1-col). Charts full-width. | 2-col summary cards. Charts with legends. | 4-col summary cards. Side-by-side charts. |
| **Settings** | Full-width form sections. | 2-column form layout where appropriate. | Same as tablet. |
| **Inventory Count** | Full-width category sections. Modal for discrepancy. | Same. Larger touch targets for Quick Confirm. | Same as tablet. |

**Responsive Column Hiding (DataTable):**

| Priority | Visible At | Example Columns |
|----------|-----------|-----------------|
| **P0 (always)** | All breakpoints | Name, primary value (price/amount), status |
| **P1 (tablet+)** | ≥768px | Category, date, payment method |
| **P2 (desktop)** | ≥1024px | Cost, margin, secondary counts |
| **P3 (wide desktop)** | ≥1280px | ID, timestamps, audit fields |

### Accessibility Strategy

**Target: WCAG 2.1 Level AA**

**Color & Contrast:**

| Requirement | Standard | Our Implementation |
|-------------|----------|-------------------|
| Body text contrast | 4.5:1 minimum | Foreground on background: ~15:1 |
| Large text contrast | 3:1 minimum | Page titles, section headings: ~15:1 |
| Muted text contrast | 4.5:1 minimum | Muted-foreground on background: ~5.5:1. Passes AA |
| Interactive element contrast | 3:1 against adjacent colors | Primary button: ~15:1. StatusDot always paired with label |
| Non-text contrast | 3:1 for UI components | Borders, icons, form controls all meet 3:1 |
| Color independence | Color never sole indicator | Status always has: dot + text label. Errors have: color + icon + message |

**Keyboard Navigation:**

| Pattern | Implementation |
|---------|---------------|
| **Tab order** | Logical flow: sidebar → header → main content → footer. No tab traps |
| **Focus indicators** | 2px ring in `--ring` color, 2px offset. Visible in both light and dark mode |
| **Skip links** | "Skip to main content" link visible on first Tab press. Jumps past sidebar |
| **Modal focus trap** | Focus cycles within modal/panel when open. Escape closes |
| **Roving tabindex** | Tab groups (sidebar items, table rows, numpad keys) use arrow keys internally |

**Screen Reader Support:**

| Element | ARIA Implementation |
|---------|-------------------|
| **Sidebar** | `<nav aria-label="Main navigation">`. Active item: `aria-current="page"` |
| **Product cards** | `role="button"` + `aria-label="Add Chicken Adobo, ₱145, In Stock"`. Disabled: `aria-disabled="true"` |
| **Status indicators** | StatusDot: `aria-hidden="true"` (decorative). Adjacent label carries meaning |
| **Panels** | `role="dialog"` + `aria-label="Product details panel"`. Close: `aria-label="Close panel"` |
| **Tables** | Semantic `<table>`, `<thead>`, `<tbody>`. Sortable columns: `aria-sort` |
| **Toasts** | `role="status"` + `aria-live="polite"`. Error toasts: `aria-live="assertive"` |
| **Forms** | `<label>` associated via `htmlFor`. Errors linked via `aria-describedby` |
| **Cart** | `aria-live="polite"` region. Announces "Item added" / "Item removed" on change |
| **Payment modal** | Tab names announced. Active tab: `aria-selected="true"`. Amount changes announced |

**Touch Accessibility:**

| Requirement | Spec |
|-------------|------|
| **Touch target size** | ≥44×44px on `@media (pointer: coarse)`. POS targets: 48px minimum |
| **Touch spacing** | ≥8px between adjacent touch targets. No overlapping tap areas |
| **Gesture alternatives** | Swipe-to-remove: also has explicit delete button. Drag in kanban: also has action button |
| **Long press** | Not relied upon for any primary action. Used only for optional context menus |
| **Pinch zoom** | Never disabled. Viewport does not set `user-scalable=no` |

**Motion & Cognitive Accessibility:**

| Requirement | Implementation |
|-------------|---------------|
| **Reduced motion** | `@media (prefers-reduced-motion: reduce)` → all transition durations set to 0ms |
| **Auto-dismiss** | Toasts have sufficient duration (3-5s). Payment success stays until dismissed on reduced-motion |
| **Cognitive load** | One primary action per context. Progressive disclosure. Smart defaults |
| **Reading level** | All UI copy at grade 8 reading level or below. Short, direct sentences |
| **Consistent navigation** | Sidebar order never changes. Same patterns across all pages |

### Testing Strategy

**Responsive Testing Matrix:**

| Device | OS | Browser | Priority |
|--------|-----|---------|----------|
| iPad 10th gen (10.9") | iPadOS | Safari | P0 — primary device |
| iPad Air (10.9") | iPadOS | Chrome | P0 |
| Galaxy Tab S9 (11") | Android | Chrome | P1 |
| iPhone 15 (6.1") | iOS | Safari | P1 |
| Pixel 8 (6.2") | Android | Chrome | P1 |
| Desktop (1440px) | macOS/Windows | Chrome, Firefox | P2 |

**Accessibility Testing Tools:**

| Tool | What It Tests | When |
|------|--------------|------|
| **axe-core** (Playwright integration) | WCAG violations, ARIA issues | Automated in E2E test suite |
| **Lighthouse** | Accessibility score, contrast, ARIA | CI pipeline on every build |
| **VoiceOver** (macOS/iOS) | Screen reader navigation flow | Manual — before each major release |
| **Keyboard-only navigation** | Tab order, focus indicators, skip links | Manual — each new screen |
| **Color contrast analyzer** | OKLCH contrast ratios in both modes | During design token changes |
| **Playwright `prefers-reduced-motion`** | Animation suppression | E2E test with `reducedMotion: 'reduce'` |

**Automated Accessibility Tests (Playwright):**
- Every page: axe-core scan for WCAG 2.1 AA violations
- Every modal/panel: focus trap verification
- Every form: label association, error announcement
- Navigation: tab order matches visual order
- Responsive: critical flows at 768px and 375px viewports

### Implementation Guidelines

**Responsive Development:**

| Guideline | How |
|-----------|-----|
| **Mobile-first CSS** | Write base styles for phone, add complexity with `md:`, `lg:` prefixes |
| **Fluid typography** | Use `rem` units. Base size: 14px (phone), 15px (tablet via media query) |
| **Flexible images** | `max-w-full h-auto` on all images. Product images: `aspect-ratio: 4/3` with `object-cover` |
| **Container queries** | Use for card components that appear in different contexts (sidebar vs main content) |
| **Touch adaptation** | `@media (pointer: coarse)` for larger touch targets on touch devices |
| **Viewport units** | Use `dvh` (dynamic viewport height) for mobile full-screen layouts, not `vh` |
| **No horizontal scroll** | Never on any page at any breakpoint. Test with content overflow |

**Accessibility Development:**

| Guideline | How |
|-----------|-----|
| **Semantic HTML** | Use `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`. No `<div>` soup |
| **Heading hierarchy** | One `<h1>` per page (page title). Logical `<h2>` → `<h3>` nesting. Never skip levels |
| **Form labels** | Every `<input>` has a `<label>` via `htmlFor`. No placeholder-only inputs |
| **Image alt text** | Product images: alt = product name. Decorative icons: `aria-hidden="true"` |
| **Link purpose** | Links describe destination. "View Chicken Adobo" not "Click here" |
| **Error identification** | Errors: red border + icon + text message + `aria-describedby` linking error to field |
| **Language** | `<html lang="en">`. Currency and number formatting via `Intl` API |
| **Dark mode** | Test all contrast ratios in dark mode separately. Dark mode is not just inverted |

**CSS Pattern for Responsive + Accessible Components:**

```css
/* Base (phone) */
.component { /* phone-first styles */ }

/* Tablet (primary device) */
@media (min-width: 768px) { .component { /* tablet layout */ } }

/* Touch devices — larger targets */
@media (pointer: coarse) { .component { min-height: 44px; } }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) { .component { transition: none; } }

/* High contrast */
@media (prefers-contrast: more) { .component { border-width: 2px; } }
```
