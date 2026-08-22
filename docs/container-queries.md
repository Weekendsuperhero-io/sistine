# Container queries

> **Status: implemented for the dialog family** (`dialog`, `alert-dialog`, `sheet`). The rest of the
> library still uses viewport breakpoints. See *Implementation notes* at the bottom for the two things
> that bit during the conversion.

Sistine's components mostly adapt to the **viewport**. For a drop-in component library they should adapt
to the **box they were placed in**. This note explains the difference, shows where it cost us, and
records how the dialog family was converted.

---

## The distinction

A media query asks *"how wide is the viewport?"* A container query asks *"how wide is my parent?"*

For an app you own end-to-end those usually coincide, so media queries are fine. For a **library**, they
routinely don't: the same `<Dialog>` might render at `max-w-lg` in the middle of a 1400px screen or at
`max-w-xs` because a consumer set `size="sm"`. The viewport says "wide"; the component is narrow. The
media query has no way to know, because it is asking about the wrong box.

```html
<!-- viewport-bound: switches at a 640px VIEWPORT, whatever the box is doing -->
<div class="flex flex-col sm:flex-row">…</div>

<!-- container-bound: switches when THIS CARD is ≥ 28rem, wherever it lives -->
<div class="@container">
  <div class="flex flex-col @md:flex-row">…</div>
</div>
```

Tailwind v4 ships this with no plugin: `@container` to mark one, `@sm:` / `@md:` / `@lg:` to respond,
`@min-[400px]:` for arbitrary widths, and `@container/name` + `@md/name:` to target a specific ancestor.
Browser support is universal (Safari 16, Chrome 105, Firefox 110).

---

## Where this already costs us

### 1. `alert-dialog` works around it with a prop

`AlertDialogContent` takes `size="sm"`, which sets `max-w-xs` (320px). The footer is:

```
flex flex-col-reverse gap-2
group-data-[size=sm]/alert-dialog-content:grid
group-data-[size=sm]/alert-dialog-content:grid-cols-2
sm:flex-row sm:justify-end
```

Read that carefully: `sm:flex-row` fires on a 640px **viewport**, so a 320px-wide alert dialog on a
desktop was laying its buttons out horizontally in a narrow box. The component had no way to know its
own width, so it was being *told*: through a `size` prop and a `group-data` selector.

(The `group-data-[size=sm]` grid itself is a deliberate two-column layout for small alert dialogs, not a
workaround, and it stayed. What went was the `sm:group-data-[size=default]/…` chains on the header,
title and media: literally "the viewport is wide AND someone told me I'm the wide variant." A container
query replaces both halves of that with a measurement.)

### 2. The same viewport-bound switch, repeated

| File | Line | Utility |
|---|---|---|
| `components/ui/dialog.tsx` | 121, 133 | `sm:text-left`, `sm:flex-row sm:justify-end` |
| `components/ui/sheet.tsx` | 110, 115 | `sm:text-left`, `sm:flex-row sm:justify-end` |
| `components/ui/alert-dialog.tsx` | 119 | `sm:flex-row sm:justify-end` |
| `components/ui/calendar.tsx` | 64 | `sm:flex-row` |

Every one is "stack when narrow, go horizontal when wide": a question about the element's own box,
answered with the viewport's.

### 3. `card.tsx` already has a container, and it should stay

`components/ui/card.tsx:65` declares `@container/card-header`, and nothing in this repo responds to it
(zero `@*/card-header:` variants).

**That is not a defect, and it must not be "cleaned up."** The whole `CardHeader` class string is verbatim
upstream shadcn, and upstream puts that container there as a deliberate **public extension point**: it
exists so *consumers* can write `@md/card-header:` in their own card markup. Removing it would diverge
from upstream in a library that positions itself as a drop-in replacement, and would silently break any
consumer already relying on it.

The one real cost is worth knowing: `@container` sets `container-type: inline-size`, so `CardHeader`
carries inline-axis size containment and can't be sized by its own contents in that direction. That is
upstream's tradeoff, not ours to reverse unilaterally.

Useful precedent, though: the primitive is already in the codebase and already shipping, so the
conversion below extends an existing pattern rather than introducing a new one.

---

## Proposed first step

Deliberately small: prove the pattern on one component family before touching 55.

1. ~~**Convert the dialog family footer/header**~~, **done.** Each content surface is now a named
   container (`@container/dialog-content`, `/alert-dialog-content`, `/sheet-content`) and the header and
   footer respond to it instead of the window.
2. **`drawer`**: converted the same way. `@xs` (320) here because the container is the content
   element itself, which carries no padding of its own (the `p-4` is on the header, inside it), so the
   queried box is the full drawer width: 384px for a desktop right drawer, 292px on mobile.
3. **`calendar`: cannot be converted, and this is the interesting one.** Its root is `w-fit`, and
   `container-type: inline-size` applies inline-axis size containment: a `fit-content` element that
   becomes a container measures **0**. Verified directly: `w-fit` alone renders 280px, `w-fit
   @container` renders 0px. Every surface that converted cleanly has an explicit width
   (`max-w-lg`, `w-3/4`, `inset-x-0`); calendar is sized by its contents, so it would need
   restructuring, not a class swap. Left viewport-bound with a note at the call site.

   This is the "size containment is the real hazard" risk in the Risks section, made concrete: the
   rule of thumb is **only make something a container if its width comes from outside it.**

### Implementation notes

**Container queries measure the CONTENT box, not the border box.** These surfaces carry `p-6`, so a
448px-wide dialog only presents ~398px to the query. The first pass used `@md` (28rem/448px) reasoning
from rendered widths and silently regressed the demo dialog's header from left- to centre-aligned.
Thresholds have to be picked against content width:

| Surface | Widths (border box) | Content box | Threshold |
|---|---|---|---|
| `dialog` | 320–512 | 270–462 | `@sm` (384) |
| `alert-dialog` | 320 (`size="sm"`) – 512 | 272–464 | `@sm` (384) |
| `sheet` | 292 (75vw mobile) – 384 (`max-w-sm`) | 244–336 | `@xs` (320) |

`sheet` needs the lower threshold precisely because a right/left sheet caps at `max-w-sm` (384px), at
`@sm` its footer would have stacked on desktop, a regression.

**The `size="sm"` grid is NOT a workaround and was left alone.** An earlier read of this file claimed the
`group-data-[size=sm]/alert-dialog-content:grid grid-cols-2` rules existed only to undo `sm:flex-row`.
They don't: they implement a deliberate two-column button layout for small alert dialogs. They stay.
What the container query *did* remove is the `sm:group-data-[size=default]/…` chains, which really were
"the viewport is wide AND someone told me I'm the wide variant": the exact thing a container query
answers by measuring.

Measured after conversion, on a 1400px viewport:

| Case | Border box | Content box | Header | Footer |
|---|---|---|---|---|
| dialog `max-w-md` | 448 | 398 | left | row |
| dialog `max-w-lg` | 512 | 462 | left | row |
| dialog forced to 320px | 320 | 270 | **centre** | **stacked** |

The last row is the whole point: same viewport, narrow box, correct layout. Under `sm:` it was row.

### Risks

- **Size containment is the real hazard.** Any element that relies on being sized by its contents in the
  inline direction will change behaviour when it becomes a container. This is the usual reason retrofits
  go wrong, and the reason to start with dialog surfaces, they already have an explicit `max-w-*`, so
  they aren't content-sized to begin with.
- **It's a visual change for consumers**, not just an internal refactor: a component in a narrow column
  that used to go horizontal will now stack. That is the *point*, but it belongs in a minor version with
  a changelog note, not a patch.
- **Named containers are worth the extra characters.** Bare `@md:` binds to the nearest container
  ancestor, which changes meaning if someone later wraps the component. `@md/dialog:` doesn't.

### Verification

Render each converted component at a fixed narrow width (a 320px wrapper) on a wide viewport, and at
full width, and confirm the layout follows the **box**. The current `sm:` behaviour fails that test by
construction, so it's a real before/after rather than a no-op check.

---

## Also deferred (recorded, not proposed)

Turned up in the same audit and explicitly deprioritized, listed so they aren't rediscovered as new:

- **Enter/exit motion under `prefers-reduced-motion`**: the looping animations are guarded; the
  triggered ones aren't (~20 `animate-in`/`animate-out`, 26 `zoom-*`, 48 `slide-*`).
- **`forced-colors` / Windows High Contrast**: zero handling. A library built on `backdrop-filter` and
  low-alpha borders is the case HCM most often flattens.
- **RTL**: effectively LTR-only (2 `rtl:` uses, 3 logical properties).
- **Print styles, explicit ≥44px touch targets**: zero of each.

---

See also: [`docs/glow.md`](./glow.md) · [`docs/color-tokens.md`](./color-tokens.md) ·
[Tailwind v4 container queries](https://tailwindcss.com/docs/responsive-design#container-queries)
