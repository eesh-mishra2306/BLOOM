# Bloom Liquid Petal design system

Soft, glassy surfaces with petal-shaped corners, berry ink, and one confident pink. The tokens live in `src/app/globals.css` (Tailwind 4 `@theme`), and the shared components in `src/components/ui/`. `/design` shows everything in development. In production it's hidden unless `BLOOM_SHOW_DESIGN=1` is set.

## Colour

| Token | Value | Used for |
| --- | --- | --- |
| Bloom Pink `bloom` | #FF4F91 | brand, accents in dark mode |
| Rose Red `rose` | #E83F65 | roses, tulips, warm accents |
| Soft Blush `blush` | #FFF0F5 | soft fills |
| Cherry Coral `coral` | #FF667A | gradients, tulips |
| Petal Pink `petal` | #FFB8D0 | highlights, focus ring in dark mode |
| Cream White `cream` | #FFF9F7 | light background |
| Deep Berry `berry` | #66263F | headings, text on light, Shield sections |
| Lavender Mist `lavender` | #EADCF8 | calm surfaces |
| `pink-ink` | #D6246A (light) / #FF8FB6 (dark) | links and small pink text. The brand pinks fail 4.5:1 for small text, so this darker or lighter ink is used instead |
| `accent` | #D6246A (light) / #FF4F91 (dark) | primary buttons, selected states |
| `sos` / `sos-bg` | #C8102E (light) / #E01E37 (dark) | SOS only. Never used decoratively |
| `leaf` | soft green | Bloomverse, "arrived" |

Semantic tokens (`bg`, `fg`, `heading`, `muted`, `surface`, `surface-strong`, `line`, `accent-soft`, `calm`) switch between four themes, set on `<html>` by an inline script before first paint:

- **light**
- **dark** ("berry night", #1C0C14)
- **discreet**: neutral greys, no petals, no Mochi, the "Daybook" name and plain labels
- **high contrast**: works with light or dark

All of them pass WCAG 2.2 AA in the axe scan (`npm run test:a11y`).

## Type

- **Baloo 2** (variable, Ek Type): display and headings. Rounded, petal-like letterforms. Weight 650 for display, with slight negative tracking.
- **Mukta** (Ek Type): body text. Highly legible at small sizes.
- Both cover Devanagari, ready for a Hindi interface.
- Text size can be raised to 115% or 130% in Settings. Layouts use `rem` throughout, so everything scales.

## Shape, depth and surfaces

- `glass` / `glass-lite`: translucent surfaces with backdrop blur, a hairline border and a tinted shadow. `Glass` has three tiers: 1 for hero cards, 2 for standard sections, 3 for quiet notes.
- `petal` / `petal-flip`: one corner much rounder than the others, like a petal. Used sparingly on hero cards and speech bubbles.
- `emergency-surface`: the solid SOS red surface. Only for emergencies and missed check-ins.
- Radii: `--radius-card` for cards, `--radius-field` for inputs, fully round for buttons and chips.

## Components (`src/components/ui`)

| Component | Notes |
| --- | --- |
| `Button` | variants primary, secondary, soft, ghost, danger; sizes sm, md, lg, icon. Minimum 44 px touch target |
| `Glass` | tiers 1–3, optional petal corner |
| `InputField`, `TextareaField`, `SelectField` | labelled, with hint and error wired to `aria-describedby` |
| `SwitchRow` | label and description; the whole row explains what turning it on does |
| `Segmented` | radio group with a sliding pill (Motion `layoutId`) |
| `ChipToggle` | pressed or not pressed, for multi-select tags |
| `ProgressRing` | cycle day, journey progress |
| `Sheet` | Radix Dialog as a bottom sheet on phones |
| `EmptyState` | an invitation to act, not a mood |
| `toast` | polite live region |

## Motion

- Motion (`motion/react`) handles navigation, sheets and Mochi's dock. Durations are 180–320 ms with a soft "petal" ease.
- Motion respects the person's choice: Settings → Motion (Match device / Less / Full), applied as `data-motion` on `<html>` before paint. With less motion:
  - the breathing circle becomes a progress bar
  - Bloomverse stops auto-rotating and swaying
  - Mochi's frame rate drops to on-demand.
- Background petals are a 2D canvas capped at 30 fps and pause when the tab is hidden. They can be turned off.
- 3D Mochi renders on demand at the frame rate it needs, sleeps after inactivity, pauses with the tab, lowers quality on weak devices, and falls back to an SVG Mochi when WebGL isn't available or the context is lost.

## Mochi

Mochi is procedural, built in code from three.js primitives with no external models: a kitten, puppy, bunny or bear, with six fur colours and an optional flower or bow. Expressions (idle, happy, curious, sleepy, asleep, comforting, listening, thinking, talking) blend eyes, cheeks, ears, tail and head tilt with damped springs. `MochiFlat` is the matching SVG for fallbacks and small sizes.

## Writing

- Plain words from the person's side: "Check in", "I've arrived", "Send them the link".
- Errors say what happened and what to do next.
- Safety copy never overpromises. It says "got an alert", "delivered", "hasn't turned on alerts", and never "help is on the way".
- Health copy gives ranges and "may", names sources, and says when to see a doctor.
