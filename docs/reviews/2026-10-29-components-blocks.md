# Component and block review — 2026-10-29

> Subsequent comparison update: the separate mode controls and neutral preview document were removed at the user’s request. The current page renders all swatches directly over the selected site background and follows the page theme. The isolation-related findings and tradeoffs below describe the earlier reviewed version.

Full review within the requested demo-site scope: 57 UI component files and seven block files were covered by static checks, with targeted source review and regression tests for the interactions below. All seven block routes were loaded in Safari. This is a review of the checked contracts and flows, not a guarantee about every component configuration.

The complete material comparison is now a source-controlled demo page at `/comparison`, linked from the main and mobile navigation and the Colors page. `/lustre-comparison` preserves the earlier review URL. The chart includes every named picker preset and all six materials, using shared catalogues instead of a separate sample list. Its neutral preview document and local day/night controls prevent the site's active tint, opacity, and backdrop from changing the comparison.

Framework and conventions: Next.js/React, existing shadcn-based components, Tailwind, and the CSS material engine. Component composition was checked against the installed source and the official [Card](https://ui.shadcn.com/docs/components/base/card), [Calendar](https://ui.shadcn.com/docs/components/base/calendar), and [Toggle Group](https://ui.shadcn.com/docs/components/toggle-group) documentation. No additional styling system or UI dependency was introduced.

## Coverage

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | Comparison labels, input labels, copy-control names, calendar date labels | Missing accessible control names corrected; no broader typography redesign. |
| Surfaces | 114 comparison swatches in Safari, independent modes, neutral backdrop, mobile card/table/chart bounds | Comparison retained; overflow fixes verified. |
| Animations | Carousel source and active-slide/inert-state regressions | Changed state handling verified; animation timing and 10% speed playback not reviewed. |
| Icons | Icon-only copy controls and mobile navigation | Accessible names added where changed; icon artwork unchanged. |
| Performance | Shared catalogues, stable calendar component identities, clipboard timer cleanup, preview ResizeObserver lifecycle | Remount and timer issues fixed; no performance benchmark performed. |

## Findings and changes

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `components/ui/date-picker-input.tsx` | Dropped caller props and ref; advertised an input ref despite rendering a button; invalid dates threw during formatting | Forwards button props/ref, honors disabled and accessible labels, defaults to a non-submit trigger, and normalizes invalid selections | Interaction and accessibility contracts must describe the actual control. |
| MEDIUM | `components/ui/calendar.tsx` | Defined component functions during every Calendar render | Uses stable component identities, forwards root data attributes through DayPicker, and reads locale from its context | Controlled updates retain day nodes and keyboard focus. |
| MEDIUM | `components/blocks/calendar.tsx` | Seeded date-dependent output at module/build time | Initializes the calendar and sample events from the visitor's current day after hydration | A static deployment must not show stale build-day data or mismatched dates. |
| MEDIUM | `components/ui/carousel.tsx` | Removing the active last slide could leave all remaining slides inert and move beyond the content | Clamps the visible index and normalizes navigation/autoplay | Dynamic content always has a visible, usable slide. |
| MEDIUM | `components/ui/carousel.tsx` | Captured left/right keys inside editable fields and other keyboard controls | Leaves those keys with the nested control | Text editing and slider/combobox keyboard behavior remain usable. |
| MEDIUM | `components/blocks/{authentication,signup,forgot-password}.tsx` | Inert sign-in/reset links and a destination absent from the demo | Working demo routes, with configurable destinations for installed blocks | Navigation now reaches the intended form. |
| MEDIUM | `hooks/use-copy-to-clipboard.ts`; home, themes, installation instructions, block/component code views, getting-started page | Reported copied before the write resolved; rejected writes were unhandled; repeated timers overlapped | One shared hook awaits success, reports failure, and cleans up its reset timer | Feedback reflects the action that actually completed. |
| MEDIUM | `components/header.tsx` | Navigation and growing background controls could widen the page at smaller sizes | Responsive navigation, a contained background-control row, and internal horizontal scrolling | Header controls remain reachable without widening the document. |
| MEDIUM | `components/header.tsx` | Mobile Sheet had no dialog title or description | Named Navigation dialog with a description | Screen-reader users can identify the opened navigation. |
| MEDIUM | `components/ui/chart.tsx`; chart block | A fixed height could let aspect ratio impose an oversized width; chart tabs could outgrow narrow space | Chart fills its container width, permits shrinking, and tabs wrap | Fixed-height charts now fit mobile cards. |
| MEDIUM | `components/blocks/{dashboard,data-table,calendar}.tsx` | Tables or the calendar could spill beyond narrow cards | Scrollable tables and responsive calendar padding | Content stays within the viewport while retaining usable calendar cells. |
| MEDIUM | `components/blocks/data-table.tsx` | Empty results displayed Page 1 of 0; filter had no accessible label | Page 1 of 1 for the empty state and a named filter | Empty and filtering states remain understandable. |
| MEDIUM | `app/themes/page.tsx` | Native color inputs received OKLCH values; editor labels were not linked to text fields | Hex picker values with authored CSS preserved in the adjacent named text fields | The native picker represents built-in colors correctly and fields have usable names. |
| LOW | Home and copy controls | Install snippet was a mouse-only clickable div; copy icons lacked names; home mounted a second toaster | Keyboard-accessible install button, named copy controls, and the shared root toaster | Copying works through keyboard and assistive technology without duplicate notification hosts. |

All listed findings were fixed. Registry artifacts and dependencies were regenerated, including the calendar block's Skeleton dependency.

## Design tradeoffs

| Candidate | Decision |
| --- | --- |
| Keep the comparison as a generated file in `out` | Rejected: rebuilding would remove it and its stylesheet URLs could become stale. The permanent route ships with every export. |
| Render all swatches directly under the site's selected palette | Rejected: root preset knobs, foregrounds, and opacity could contaminate unrelated swatches. An isolated preview uses the production styles with neutral defaults. |
| Replace every bug fix with a broader component rewrite | Rejected: existing roles and public component patterns were sufficient for the demonstrated failures. |

The comparison/catalogue design scores 7/8 diagnostics, approximately 9/10, within this limited scope. The remaining shared knowledge is the palette's numerical inputs across TypeScript and CSS; invariant checks catch disagreement. Reaching 8/8 would require generating the base preset CSS from the catalogue, a broader engine change than this page needs.

## Verification

- `bun run test`: 345 tests across 43 files pass; theme/pattern invariants, gamut checks, 46 preset/mode contrast pairs, and the APCA oracle pass.
- `bun run registry:check`: 78 registry items pass import/dependency checks.
- `bun run build --webpack`: production build, TypeScript, and 86 static pages pass.
- Biome checks pass over the UI, block, app, and changed support files. The existing schema-version information message remains.
- `git diff --check`: passes.
- Safari: all seven block pages load without console warnings or errors during the smoke checks.
- Safari: comparison has 19 rows and 114 swatches; mode changes affect its document independently; Selenite and Onyx retain neutral behavior.
- Safari: comparison/header fit actual viewport widths 336, 768, 1024, and 1440. The requested 320 width was clamped by Safari to 336.
- Safari: dashboard, chart, calendar, and data-table blocks fit the 336-wide viewport after fixes. Wide table content scrolls inside its container.
- Safari: data-table filtering/empty state, pagination and sorting; adding events on two dates; reset-to-sign-in navigation; and mobile navigation to Compare all work.

Not verified: every prop/preset/material combination, other browser engines, backend authentication/reset integrations, full screen-reader sessions, or slowed motion playback. Authentication blocks remain UI integration examples; the audit did not add an authentication service.

Verdict: Approve for the reviewed scope, with the unverified boundaries above.
