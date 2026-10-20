# Project management Rev growth — Design Taste & UI/UX Guide

_Discovered 2026-10-10 from the repo (`src/styles/*`, `src/core/constants.js`, `src/core/theme.js`, `index.html`, `docs/preview.png`). Everything here is **[DISCOVERED]**: it describes what the code does today. Confirm or correct it, then treat it as the rule for new UI._

---

## 1. The taste in one paragraph

**Calm, warm, dense, quiet.** It sits in the Linear / Things / Height family: a near-white _warm_ canvas (not blue-grey), hairline borders instead of shadows, one restrained indigo accent, small 13.5px type set in Geist, and colour reserved for _meaning_ (status, priority, overdue, labels). Chrome recedes so the work (tasks, projects, dates) is the loudest thing on screen. Motion is short, eased and one-shot: things rise in once, never loop, never replay on re-render. Nothing is decorative: no gradients, no illustrations, no glassmorphism, no big hero type.

**Five words to test any new screen against:** calm · structured · dense · warm · honest.

---

## 2. Principles (how decisions get made)

1. **Content over chrome.** Borders are 1px and low-contrast (`--border #e9e7e2`). Panels are flat surfaces, not floating cards. Shadows exist only for things that are truly above the page (popovers, modals, drags).
2. **Colour means something.** The accent marks _the one primary action_, the current selection and focus. Semantic colours mark status, priority, overdue and labels. Everything else is neutral.
3. **One content edge.** Breadcrumb, page header, toolbars, lists, tables and boards all start at `var(--gutter)` (24px; 16px under 900px). Never invent another left edge.
4. **Dense but breathable.** 40px rows (34px compact), 30px controls, 4pt spacing scale. Information density of a pro tool, with enough air that it never feels like a spreadsheet.
5. **Dark mode is redesigned, not inverted.** Dark tokens are hand-picked (warm charcoal `#1a1a19`, lifted semantic colours, shadows replaced by borders).
6. **Motion confirms, it doesn't entertain.** Every animation answers "what just happened?" (navigated, completed, moved, created). Motion flags are consumed once per render.
7. **Keyboard first.** ⌘K palette, `g` chords, `n`/`p`/`/`/`?`/`e`. Every clickable thing is focusable; focus survives re-render.
8. **Plain, friendly, specific copy.** "Moved "Create homepage wireframes" to Review", not "Success!".

---

## 3. Typography

| Token | Value | Use |
|---|---|---|
| `--font` | **Geist**, then system sans | All UI |
| `--mono` | **Geist Mono**, then system mono | Task keys (`WEB-201`), `kbd`, error codes, numbers in code-ish contexts |
| Loading | Google Fonts, weights **400 / 500 / 600** only (+ Mono 400), `display=swap`, non-blocking `media="print"` swap | Do not add 300/700 weights without a decision |
| Features | `font-feature-settings: 'ss01', 'cv11'` on `body`; `-webkit-font-smoothing: antialiased` | Gives Geist its cleaner alternates |

**Type scale (`tokens.css`)** — deliberately small, half-pixel steps:

| Token | px | Typical use |
|---|---|---|
| `--fs-2xs` | 11 | Section labels (uppercase), tiny meta, `kbd` |
| `--fs-xs` | 12 | Table headers, badges, chips, stat captions |
| `--fs-sm` | 12.5 | Buttons, tabs, toasts, secondary text |
| `--fs` | **13.5** | Body / default UI text, sidebar items |
| `--fs-md` | 14.5 | Empty-state headings, emphasised rows |
| `--fs-lg` | 16 | Sub-headings, drawer title areas |
| `--fs-xl` | 19 | Mobile page title |
| `--fs-2xl` | 23 | Page title (`.ph h1`) |
| (stat value) | 22 | Big numbers in `.stats` |

**Rules**
- Weights: **400** text, **450** sidebar items, **500** controls/labels, **600** headings and numbers. One stray 700 exists; avoid it.
- Headings get **negative tracking** (`-0.022em` on h1, `-0.02em` on stat numbers). Uppercase micro-labels get **positive tracking** (`0.06em`).
- Body `line-height: 1.45`; headings `1.2` with `text-wrap: balance`.
- Numbers that change or align use `font-variant-numeric: tabular-nums` (`.num`, `.stat .v`).
- Hierarchy comes from **weight and colour** (`--text` → `--text-2` → `--text-3` → `--text-4`), not from size jumps.

---

## 4. Colour

### 4.1 Neutrals (light) — warm paper, not cool grey
| Role | Token | Light | Dark |
|---|---|---|---|
| App background | `--bg` | `#fbfaf8` | `#1a1a19` |
| Sidebar | `--bg-side` | `#f4f3f0` | `#151514` |
| Main / panels | `--surface` | `#ffffff` | `#1d1d1c` |
| Hover / subtle fill | `--surface-2` | `#f6f5f2` | `#252524` |
| Pressed / tracks | `--surface-3` | `#eeede9` | `#2d2d2b` |
| Board columns | `--sunken` | `#f7f6f3` | `#181817` |
| Border | `--border` | `#e9e7e2` | `#2c2b29` |
| Strong border (inputs, secondary btn) | `--border-strong` | `#dad7d0` | `#3a3936` |
| Row separators | `--divider` | `#f0eeea` | `#252523` |
| Text 1→4 | `--text … --text-4` | `#1d1c1a` `#57544e` `#6b6760` `#8c8880` | `#eceae5` `#b5b2ab` `#9a968f` `#6f6c66` |

### 4.2 Accent (one at a time, user-swappable)
Default **indigo** `#4b5bd6` (dark `#8e9af3`). Variants via `data-accent`: blue, violet, teal, rose, graphite. Derived tints are always `color-mix`: `--accent-soft` (10%) for fills/selection, `--accent-line` (38%) for outlines. **Never hard-code the accent hex**: use `var(--accent)` so the user's choice applies.

Accent is used for: the primary button, focus ring, progress bars, unread dots/counts, selected chips, text selection, caret. Not for headings, icons at rest or decoration.

### 4.3 Semantic & domain colours
- **Semantic:** green `#25754b`, amber `#8f5e0e`, red `#b23c30`, blue, violet, teal, rose, orange, gray — darker/earthier in light mode for AA text contrast, lifted in dark. `*-soft` tints at 10–12%.
- **Task status:** backlog `#a29e96` → todo `#7c7870` → progress `#c88a14` (amber) → review `#7652c2` (violet) → done `#2e8456` (green). Shown as a small status glyph (`stIcon`), not a big coloured pill.
- **Project status (`PSTAT`):** Planning gray · In Progress blue · At Risk red · On Hold amber · Completed green — rendered as a neutral badge with a 6px coloured dot.
- **Labels (`LABELS`):** design violet, frontend blue, backend teal, research amber, content rose, bug red, qa green, growth orange.
- **Project colours (`PCOLORS`):** indigo, blue, violet, teal, rose, amber, green, slate — used as a tinted square behind the project icon and as a small dot in lists.
- **Avatars:** initials on `color-mix(member colour 17%, surface)` with text at 55% — soft, never saturated discs.
- **Overdue / due today:** red / amber text only, no backgrounds.

---

## 5. Surfaces, borders, elevation, radius

- **Flat by default.** Panels: `--surface` + 1px `--border` + `--r-lg`. No shadow.
- **Elevation ladder** (only these four):
  - `--shadow-sm`: secondary buttons
  - `--shadow-card`: kanban cards (1px ring + whisper shadow)
  - `--shadow-pop`: popovers, modals, palette, toasts, mobile sidebar
  - `--shadow-drag`: the card being dragged / "land" animation
- In dark mode shadows collapse to border rings: depth comes from surface steps.
- **Radius scale:** `--r-xs 4` (checkbox, focus) · `--r-sm 6` (buttons, inputs, sidebar items, chips) · `--r 8` (kanban cards, toasts) · `--r-lg 10` (panels, board columns, popovers) · 12px (modals, palette) · `--r-full` (avatars, dots). Small, consistent, never pill-shaped buttons.
- Overlays dim with a warm `--overlay` (28% in light, 55% in dark), no blur.

---

## 6. Spacing & layout

- **4pt scale:** `--s-1 … --s-12` = 4, 8, 12, 16, 20, 24, 32, 40, 48.
- **Control heights:** `--h-xs 22` · `--h-sm 26` · `--h-md 30` (default button/input/icon button) · `--h-lg 36`.
- **Shell:** CSS grid `--side-w 252px | 1fr`; collapses to a 52px icon rail. Topbar `--topbar-h 46px` with breadcrumb left, search (⌘K) / bell / "New" / avatar right.
- **Sidebar:** `--bg-side`, rows `--side-row 30px` (26 compact), weight 450, `--text-2`, active row = white surface. Groups: personal (Home, Inbox, My Tasks, Favorites, Notifications) → WORKSPACE → PROJECTS (expandable to tabs) → footer (Help, Settings, user).
- **Page:** `.page` max-width **1160px**, centred, padding `28px var(--gutter) 72px`. `.page.wide` removes the cap (boards, timeline, tables).
- **Page header (`.ph`):** h1 23/600 + one muted sub-line, actions right-aligned: secondary buttons first, **one** primary last.
- **Dashboard grid:** `.stats` = 4 equal cells in one bordered strip (internal dividers, not 4 cards). `.grid2` = 1.55fr / 1fr, 16px gap, stacks under 1100px.
- **Rows:** `--row-h 40px` (34 compact), separators only _between_ rows (`--divider`), never against the panel edge.
- **Board:** columns 284px wide on `--sunken` with `--divider` border; cards 10–12px padding, 8px internal gap; collapsed column = 44px strip.
- **Drawer (task detail):** right side, `min(620px, 100vw)`, can go full; modals 560px (420 small); palette 640px at 12vh.

---

## 7. Components (what "on-brand" looks like)

| Component | Taste notes |
|---|---|
| **Buttons** | 30px, 6px radius, 12.5/500, 6px icon gap. `primary` = accent + subtle inner bottom shadow; `secondary` = white + strong border + `shadow-sm`; `ghost` = text only; `danger` / `danger-ghost`. Press = `scale(0.97)`. Loading = spinner replaces label. One primary per view. |
| **Icon buttons** | 30px square, `--text-2`, hover fills `--surface-2`. |
| **Icons** | Lucide only, via `ic(name, size)`. Sizes: **14** default, 13/15 inline, 12 meta, 16 in nav-ish places, 20+ only for empty/full states. Stroke icons, never filled. |
| **Inputs / selects** | 30px, `--border-strong`, accent focus ring; `<select class="select">` enhanced by `ui/select.js` with a custom chevron. |
| **Checkbox** | 15px, 4px radius, 1.5px border; done = pop + strike-through animation. |
| **Toggle** | 30×18 track, spring knob. |
| **Badge** | 20px, 5px radius, neutral fill + border + 6px coloured dot. Status lives in the dot, not the fill. |
| **Chip** (filters) | 26px, accent-soft fill + accent-line border. |
| **Tabs** | 36px, 12.5/500, `--text-2` → `--text`, animated underline on the active tab; segmented variant for small filters ("Upcoming 6 · Overdue 1"). |
| **Progress** | 4px track on `--surface-3`, accent fill via `scaleX(var(--p))`, % in tabular nums beside it. |
| **Avatars** | 22px (20 small), soft tinted initials, overlapping stacks with "+N". |
| **Priority** | Signal-bar glyph (low→high), red `!` square for urgent. |
| **Toast** | Inverted (dark on light, light on dark), bottom-centre, 8px radius, spring in, optional Undo/Retry action. |
| **Popover / menu** | 10px radius, 4px inner padding, `shadow-pop`, quick 160ms pop-in from the trigger corner. |
| **kbd** | Geist Mono 11px, 1.5px bottom border (key-cap feel). |
| **Empty state** | 22px muted glyph, 14.5/600 heading, one 12.5 muted sentence (max 340px), one action. |
| **Skeleton** | Warm shimmer between `--surface-3` and `--surface-2`, 1.3s. |
| **Full-page state** (404, offline) | Centred box, max 420px, mono error code. |

---

## 8. Motion

- **Tokens:** `--dur 140ms` for hovers/colour; `--ease cubic-bezier(.23,1,.32,1)` (fast out, soft settle) for almost everything; `--spring cubic-bezier(.34,1.56,.64,1)` for small rewarding pops (checks, toggles, toasts, card landing); `--ease-drawer cubic-bezier(.32,.72,0,1)` for the drawer.
- **Vocabulary (one-shot, flag-gated via `S.ui.fx`):**
  - Route change: content `riseIn` 8px, 360ms, staggered 35ms per child (max ~100ms).
  - Tab change: 260ms rise; kanban cards stagger by column.
  - Complete: row wash green → transparent (1s), checkbox `popCheck`, title strike draws left→right.
  - Drop: card `land` from a slight tilt (-1.2°) + drag shadow into place.
  - Create: rise + accent wash/ring fading out over 1.4s.
  - Progress bars `growX` on first view.
  - Hover lift: project cards -2px, kanban cards -1px.
- **Rules:** durations 120–500ms (the only longer ones are fading washes). Nothing loops except skeleton shimmer and spinners. Never replay on re-render.
- **Reduced motion:** both `prefers-reduced-motion` and the user's `data-motion="reduce"` collapse everything to a 120ms fade (`fadeOnly`), remove transforms and hover lifts, and swap the animated strike for a plain line-through.

---

## 9. Responsive behaviour

| Breakpoint | Changes |
|---|---|
| ≤ 1100px | `.grid2` stacks; topbar search collapses to icon + no label/kbd |
| ≤ 900px | Sidebar becomes an off-canvas drawer (280px, scrim); `--gutter` → 16px; stats 2×2; settings nav becomes a horizontal scroller; timeline left column 170px |
| ≤ 640px | Bottom nav (48px targets, accent unread dot); topbar 50px; list/table rows become stacked bordered cards; drawer goes full-screen; modals become bottom sheets (14px top radius); calendar events shrink to colour bars; toasts span the width above the bottom nav; crumbs show only the current page; 40px minimum tap targets |

Safe-area insets are respected (`env(safe-area-inset-*)`).

---

## 10. Voice & copy

- **Sentence case** everywhere ("New project", "Upcoming deadlines"). Uppercase only for tiny sidebar section labels (WORKSPACE, PROJECTS).
- **Warm, short, specific.** Greeting by name and time of day ("Good afternoon, Tanjim"), date + one-line summary under it.
- Toasts say exactly what happened, in past tense, with the object named: "Moved "…" to Review", "Task duplicated", "Reconnected. All changes are synced." Offer Undo/Retry instead of confirm dialogs where possible.
- Validation teaches: "Enter a valid email address, like name@company.com".
- Empty states tell you how to fill them: "Open a task and click the star to add it here."
- Curly quotes and real ellipses (" " …). No exclamation marks, no emoji in UI chrome, no "Oops".
- Stat captions add meaning, coloured only when they need attention ("2 · need attention" in red, "9 · this week" in green).

---

## 11. Accessibility baseline

- Focus: 2px accent outline, 1px offset, only on `:focus-visible`. Skip-to-content link.
- Focus, selection and scroll are restored across every full re-render.
- Live regions: `#sr-live` for announcements, `#toasts` is `aria-live="polite"`.
- Light-mode semantic colours are darkened for text contrast; `--text-3` (`#6b6760`) is the lowest tier for readable text, `--text-4` is for icons/placeholders.
- Mobile tap targets ≥ 40px (48px in bottom nav).

---

## 12. User-tunable knobs (on `<html>`, via `core/theme.js`)

`data-theme` (light / dark / system) · `data-accent` (indigo default, blue, violet, teal, rose, graphite) · `data-side` (compact sidebar rows) · `data-density` (compact rows/cards) · `data-motion` (reduce). New components must look right in **all** combinations: always use tokens.

---

## 13. Do / Don't

**Do**
- Use tokens for every colour, size, radius, space, duration.
- Keep one primary button per view; everything else secondary or ghost.
- Show status with a glyph or dot; keep fills neutral.
- Put numbers in tabular nums and right-align them in tables.
- Add a one-shot `fx` flag for new "something happened" moments, with a reduced-motion fallback.

**Don't**
- Add gradients, glass/blur, drop-shadowed panels, pill-shaped buttons or saturated backgrounds.
- Introduce a second accent or a new brand colour.
- Use new font families or weights 300/700.
- Animate on every render, loop animations, or exceed ~500ms for UI motion.
- Use bigger type to create hierarchy where weight or colour would do.
- Center-align content pages (only auth, empty and full-page states are centred).

---

## 14. Drift found (small cleanup candidates)

- **Hard-coded font sizes outside tokens:** ten `font-size: 11px` (should be `--fs-2xs`) plus one-offs of 7.5px, 12px, 13px, 22px. Consider a `--fs-stat: 22px` token.
- **Raw radii:** 2, 3, 5, 7, 9, 12, 14px appear directly. 12px (modal/palette) and 14px (mobile sheet) deserve tokens (`--r-xl`, `--r-sheet`); 5px badges could move to `--r-xs`/`--r-sm`.
- **8 hex colours** in stylesheets outside `tokens.css`, and `PCOLORS` / `TEAMS_SEED` colours in `constants.js` are hex rather than token references (they don't adapt to dark mode the way semantic tokens do).
- `tokens.css` header still says **"QUIRE — DESIGN TOKENS"** (earlier codename); `docs/preview.png` still shows the "Gr8r Studio" brand.
- One `font-weight: 700` in the CSS; the font load only includes 400/500/600, so it renders as faux-bold.

---

## 15. Checklist for any new screen or component

- [ ] Starts at `var(--gutter)`; uses `.page` (or `.page.wide`) and `.ph` header pattern
- [ ] Only tokens from `src/styles/tokens.css` (colour, type, space, radius, shadow, motion)
- [ ] Looks right in light, dark, every accent, compact density
- [ ] One primary action; status shown by glyph/dot
- [ ] Lucide icons via `ic()` at 12–16px
- [ ] Empty, loading (skeleton) and error states designed
- [ ] Motion is one-shot via `fx`, with reduced-motion fallback
- [ ] Keyboard reachable, visible focus, announced via `#sr-live` if it changes state silently
- [ ] Works at 900px and 640px (stacked rows, bottom sheet, 40px targets)
- [ ] Copy is sentence case, specific, past tense for confirmations
