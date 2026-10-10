# Pantrywood — Design Guide

A cozy, cottagecore home-pantry app built on top of a self-hosted Grocy.
Your kitchen becomes a tiny 3D life-sim scene: the fridge, freezer, shelves, boxes, baskets
and supply cabinets are real Grocy locations, filled with your real stock — food **and**
things you don't eat (tissue, shampoo, dish soap, 3D-printer filament).

> Keep this file in `docs/` and tell the AI to follow it in every prompt.

---

## 1. Personality

| We are | We are not |
|---|---|
| Warm, calm, homey | Corporate, cold, "enterprise dashboard" |
| Playful in small details | Childish or cluttered |
| Earthy and hand-made | Neon, glossy, glassy |
| Gently helpful ("the milk wants to be used soon") | Alarming ("WARNING: EXPIRED") |

**Mood words:** wooden shelves, linen, morning light, jam jars, kraft paper, potted herbs.

---

## 2. Color palette

### Base (light — "Morning Cottage")

| Token | Hex | Use |
|---|---|---|
| `--cream` | `#F6EFE2` | App background |
| `--paper` | `#FFFBF3` | Cards, panels, popovers |
| `--oat` | `#EADFC9` | Borders, dividers, muted surfaces |
| `--linen` | `#F1E7D4` | Hover, secondary buttons, inputs |
| `--bark` | `#4A3B2E` | Main text |
| `--bark-soft` | `#7A6654` | Secondary text, labels |
| `--sage` | `#8FA67A` | Primary brand, primary buttons |
| `--sage-deep` | `#5E7550` | Primary hover, active tab, links |
| `--terracotta` | `#C8755A` | Accent, low stock, scan button |
| `--honey` | `#E2B25C` | Expiring soon |
| `--berry` | `#A8533A` | Expired, destructive actions |
| `--frost` | `#A9C4C9` | Freezer, "opened" state, info |

### Status colors (always pair color with an icon + label, never color alone)

| State | Color | Icon idea | Copy |
|---|---|---|---|
| Fresh | sage | sprout | "Fresh" |
| Expiring soon (≤ 3 days) | honey | hourglass | "Use soon" |
| Expired | berry | wilted leaf | "Past its date" |
| Low stock | terracotta | basket | "Running low" |
| Opened | frost | jar-open | "Opened" |
| Stocked (supplies) | sage | sprout | "Stocked" |

### Food vs. supplies

| | Food | Supplies (tissue, shampoo, filament…) |
|---|---|---|
| Tracked by | Expiry date + amount | Amount only |
| Grocy setup | Normal best-before date | "Never expires" (default best-before = -1) + a min stock amount |
| Chips shown | Fresh · Use soon · Past its date · Opened | Stocked · Running low |
| Shown in "Use soon" | Yes | Never |
| Shown in "Running low" | Yes | Yes |
| Units | carton, pcs, g, bunch | roll, bottle, refill, g / spool (filament) |

Use Grocy **product groups** (e.g. *Dairy*, *Produce*, *Bathroom*, *Cleaning*, *Maker supplies*)
to color items and decide which rules apply.

### Dark ("Evening Cottage")

| Token | Hex |
|---|---|
| `--cream` (bg) | `#2B261F` |
| `--paper` (cards) | `#36302A` |
| `--oat` (borders) | `#4A4238` |
| `--linen` | `#3F382F` |
| `--bark` (text) | `#F3EADB` |
| `--bark-soft` | `#C2B39E` |
| `--sage` | `#9DB487` |
| `--terracotta` | `#D98B6F` |
| `--honey` | `#E9C077` |

---

## 3. Typography

| Role | Font (Google Fonts) | Notes |
|---|---|---|
| Headings | **DM Sans** 600, letter-spacing −0.02em | One minimal sans for the whole app — the cozy feel comes from color and the 3D room, not the type |
| Body / UI | **DM Sans** 400 / 500 / 600 | Clean and quiet; avoid weights above 600 |
| Thai text | **IBM Plex Sans Thai** (loopless) 400 / 500 / 600 | Fallback after DM Sans; minimal Thai that matches the Latin |
| Numbers | DM Sans with `font-variant-numeric: tabular-nums` | Quantities and dates line up |

**Scale (px):** 12 · 14 · 16 (body) · 20 · 24 · 32 · 44 (display)

`font-family: "DM Sans", "IBM Plex Sans Thai", sans-serif;`

---

## 4. Shape, depth, spacing

- **Radius:** 12px small (inputs, chips) · 20px cards · 28px panels/sheets · full pill for buttons
- **Borders:** 1.5px `--oat`. Cards feel like paper on a table, not glass.
- **Shadow (warm, soft):**
  `0 1px 0 rgba(74,59,46,.06), 0 10px 28px -8px rgba(74,59,46,.18)`
- **Spacing:** 4px base. Use 8 / 12 / 16 / 24 / 32.
- **Texture (optional):** very faint paper-grain noise on the background (≤ 4% opacity).
- No glassmorphism, no gradients except the soft sky behind the 3D scene.

---

## 5. Icons & illustration

- **Phosphor Icons, duotone weight** — rounded, and the duotone fill can use `--oat` / `--sage`.
- Small hand-drawn touches: washi-tape strip on cards, a sprout next to the logo, stitched dashed borders on empty states.
- Empty states get a tiny illustration + gentle copy: *"The snack box is empty. A good excuse for a market trip."*

---

## 6. Components (shadcn/ui, restyled)

| Component | Pantrywood style |
|---|---|
| Button (primary) | Sage pill, cream text, 2px darker bottom "press" shadow, slight squish on press |
| Button (scan) | Terracotta circle, barcode icon, floating bottom-right (bottom-center on mobile) |
| Card | Paper bg, oat border, 20px radius, optional washi-tape label |
| Stat card | Big DM Sans 600 number + small icon in a soft tinted circle + one-line hint |
| Chip / Badge | Pill, tinted bg (status color at 18%), text in the deep version of that color |
| Tabs | Linen track, selected tab is a paper "tile" with shadow |
| Side panel (desktop) / Bottom sheet (mobile) | 28px radius, paper bg, drag handle on mobile |
| Toast | Small paper note sliding up, with a pin icon |
| Item row | Product icon in a jar-shaped tile · name · qty + unit · expiry chip |

---

## 7. The 3D scene

**Concept:** a miniature **storage-room diorama** — a cut-away room on a thick wooden slab, like
the cozy isometric Blender dioramas on Pinterest. It should feel like a toy you could pick up.

**Diorama look**

- Base: cream and warm wood (like a cozy wooden dollhouse), with soft pastel accents —
  powder blue `#A9C9DA`, butter `#F2D27A`, blush pink `#E9A9A9`
- Room sits on a thick slab (wood sides `#8C6440` / `#7A5638`); floor is **checkered tile**, cream `#F3E7CF` and pale blue `#D3E2E6`
- Two walls only, cream (`#F7EFE1` → `#EFE3CC`), with a **small square-tile wainscot**, a wooden rail and baseboard
- **Chunky rounded wood caps** on top of both walls (`#B88A5F` top, `#8C6440` sides) — the signature diorama edge
- Soft, rounded, "clay-like" shapes: generous bevels, no sharp corners, slight sheen strip on big surfaces
- Life details: a red-rimmed wall clock, small picture frames, a window with **blue gingham curtains**,
  pastel jar lids, a round butter-and-blush rug with a sleeping cat, a basket of veggies — 1 cute detail per zone, not more
- Plain warm backdrop behind the diorama (soft radial cream), soft contact shadow underneath

| Grocy location | 3D object | Color |
|---|---|---|
| Fridge | Rounded retro fridge with notes and magnets on the door | cream `#F3EADB`, latte handles `#C9B79A` |
| Freezer | Chest freezer | frost `#C9DCE0` |
| Pantry shelf | Open wooden shelf | walnut `#A47551` |
| Snack crates | Stacked wooden crates + kraft box | `#C49770`, kraft `#C9A77C` |
| Maker shelf | Wall shelf of filament spools (spool = filament color) | walnut `#C49770` |
| Basket / other | Wicker basket | wicker `#B98B57` |
| Rice bin | Wooden barrel / tin | `#8C6A4A` |
| Home supplies | Open cabinet: tissue rolls, bottles, detergent | butter yellow `#E9C46E` outside, wood inside |
| Bathroom shelf / craft drawer (optional) | Small wall shelf or drawer unit | walnut `#A47551` |

**Layout:** pantry shelf in the back corner, fridge and chest freezer (under the window) along the
right wall, supplies cabinet + maker shelf + crates along the left wall, rice barrel, veggie basket
and a round rug on the floor.

**Rendering rules**

- Orthographic camera, isometric angle (~35° down, 45° around)
- Matte materials only (`roughness: 1`, no metal shine). Optional toon shading.
- Lights: warm hemisphere light + one soft "morning sun" directional light with soft shadows
- Items inside storage are tiny simple shapes: jar, can, carton, bag, box — colored by category.
  Supplies get their own shapes: roll (tissue), bottle (shampoo, soap), spool (filament, tinted by its color)
- **Instancing** for repeated items
- Hover: cream outline + object lifts 2–4 units. Click: sage outline + panel opens
- Floating labels (drei `Html`): small paper tags, e.g. `Fridge · 14 items · 2 use soon`
- Items expiring soon get a tiny honey dot above them; expired get a berry dot; running-low supplies get a terracotta dot
- Background: soft cream-to-peach sky gradient, no hard black void

**Performance:** target 60 FPS on a mid-range phone. Offer a "List view" toggle as a 2D fallback.

---

## 8. Layout

### Desktop

```
┌──────────────────────────────────────────────────────────────┐
│ 🌿 Pantrywood   [ Search pantry…        ]   Home ▾   🔔  (👤) │  top bar
├──────────────────────────────────────────────────────────────┤
│ [Use soon 4] [Running low 3] [In stock 128] [Added this wk 12]│  stat cards (Use soon = food only)
│                                                ┌────────────┐│
│                                                │ Inspect    ││
│              3D KITCHEN SCENE                  │ panel      ││
│                                                │ (storage / ││
│                                                │  item)     ││
│                                                └────────────┘│
│ ┌ Use these soon ─────────────────────────┐   ┌ Recent ─────┐│
│ │ milk · eggs · basil · tofu  →           │   │ receipts    ││
│ └─────────────────────────────────────────┘   └─────────────┘│
│                                                      ( scan ) │
└──────────────────────────────────────────────────────────────┘
```

### Mobile

- 3D scene full screen behind everything
- Stat cards become a horizontal scroll row
- Inspect panel becomes a bottom sheet
- Bottom nav: **Kitchen · Stock · (Scan) · Receipts · Fridge door** — Scan is the big terracotta center button

---

## 9. Screens

1. **Kitchen (home)** — 3D scene, stats, "use these soon" strip
2. **Storage panel** — items in the selected fridge/shelf/box, sorted by soonest expiry (supplies: sorted by lowest stock, with an "Add low items to shopping list" button)
3. **Item detail** — qty, unit, expiry, location, buttons: *Eat 1*, *Open*, *Move*, *Add more*
4. **Fridge door** — 2D cork/fridge-door view: items as sticky notes, magnets, polaroid receipts
5. **Scan** — camera viewfinder with rounded frame + "Waiting for your scanner…" hint for hardware scanners
6. **Receipt review** — photo on the left, matched lines on the right, each line has a product dropdown
7. **Receipt memories** — polaroid grid of past receipts with store + date written like handwriting
8. **Stock list** — 2D table/list fallback with filters

---

## 10. Motion

**Rule: every transition is smooth.** Nothing in Pantrywood appears, disappears, moves or changes
instantly — not screens, panels, items, numbers or the 3D camera.

**Timing**

| What | Duration | Easing |
|---|---|---|
| Hover, press, chip / toggle states | 150 ms | ease-out |
| Panels, bottom sheets, trays, toasts | 250–300 ms | gentle spring (Motion: stiffness 260, damping 26) |
| Page to page (room → item detail) | 300 ms | shared-element: the item picture flies into the detail header |
| 3D camera glide (room → storage piece) | 600 ms | ease-in-out, no overshoot |
| Door / lid / drawer opening | 450 ms | spring with a tiny settle |
| Drag & drop settle | 200 ms | spring; neighbours slide aside, never jump |

**Patterns**
- **Enter / exit:** fade + 8–12 px slide (or scale from 0.96); exits are a bit faster than enters
- **Lists:** items animate their position when sorted, filtered or removed (layout animation); no reflow jumps
- **Numbers:** amounts, fill bars, meters and expiry bars tween to the new value instead of snapping
- **Stock added:** item pops in with a small bounce; eaten: shrinks and fades
- **Shelves:** moving a shelf glides to the next notch; items on it move with it
- **Images:** fade in when loaded; placeholders are soft skeletons, never blank flashes
- **Never animate layout-shifting properties** (width/height/top) directly — use transform and opacity so it stays 60 FPS
- **Interruptible:** a new tap can start a new transition mid-way without waiting

**Reduced motion:** with `prefers-reduced-motion`, keep only short cross-fades (150 ms); no bounce, slide or camera fly — the camera cuts with a fade.

---

## 11. Copy voice

- Short, kind, a little whimsical
- "Use soon" instead of "Expiring"; "Running low" instead of "Low stock alert"
- Buttons are verbs: *Eat one*, *Add to pantry*, *Scan receipt*
- Thai and English product names both welcome — never truncate Thai mid-character

---

## 12. Accessibility

- Text contrast ≥ 4.5:1 (bark on cream/paper passes)
- Status always = color + icon + word
- Every 3D object is also reachable from the 2D Stock list
- Focus rings: 3px sage outline with 2px offset
- Tap targets ≥ 44px

---

## 13. Tailwind / shadcn tokens

```css
:root {
  --background: #F6EFE2;   /* cream */
  --card: #FFFBF3;         /* paper */
  --popover: #FFFBF3;
  --foreground: #4A3B2E;   /* bark */
  --muted: #F1E7D4;        /* linen */
  --muted-foreground: #7A6654;
  --border: #EADFC9;       /* oat */
  --input: #EADFC9;
  --primary: #8FA67A;      /* sage */
  --primary-foreground: #FFFBF3;
  --accent: #C8755A;       /* terracotta */
  --accent-foreground: #FFFBF3;
  --destructive: #A8533A;  /* berry */
  --ring: #5E7550;
  --radius: 1.25rem;

  --honey: #E2B25C;
  --frost: #A9C4C9;
}
```

---

## 14. Decorate mode

A life-sim style editor for the storage room. People can swap **storage furniture**, put
**shelf items** inside shelves, and change **wallpaper**, **floor** and **decor**.

**Rules**

- Every storage furniture piece is bound to one Grocy location. Swapping its style
  (e.g. retro fridge → oak-panel fridge) keeps the location and all stock in it.
- Shelf items, wallpaper, floor and decor are cosmetic only — they never touch Grocy data.
- Room layout is saved by Pantrywood itself (local storage in Phase 1–2, own server in Phase 3),
  not in Grocy.
- Placement on a floor grid (1 cell = 50 cm). Footprints: fridge 2×2, shelf 3×1, cabinet 1×2, rug 3×3…
- Currency: **leaves**, earned from XP (eating things before they expire, scanning receipts).
  Owned items show "Owned", placed items "In room".
- Selected piece gets a dashed honey outline and a floating toolbar: *Swap style · Rotate · Move · Put away*.
- **Room themes** apply wallpaper + floor + furniture style in one tap.

**Styles** (all style and item names are original and brand-free)

| Style | Feel | Materials & colors |
|---|---|---|
| Nordic | Bright, practical, modular | Birch, white, light oak, mint, sky |
| Natural minimal | Quiet, natural, no decoration | Pine, steel, linen, cork, plaster |
| Japandi | Calm, low, crafted | Oak, rattan, bamboo, washi, tatami, sage |
| Retro | Rounded, pastel, cheerful | Enamel, cream, butter, mint, blush, checker, gingham |

**Catalog (58 items)**

| Category | Items |
|---|---|
| Storage furniture (20) | Retro round-top fridge (cream / mint / butter), Slim white fridge, Oak-panel fridge, Chest freezer · sky, Walnut pantry shelf, Birch cube shelf, Pine open shelf, Steel unit shelf, Oak ladder shelf, Butter open cabinet, Rattan cabinet, Bamboo drawers, Mint rolling cart, Wooden crate stack, Rice barrel, Ceramic rice jar, Enamel bread bin, Wicker basket set |
| Shelf items (9) | Pastel jar set, Ceramic canisters, Glass spice rack, Linen storage bin, Seagrass basket, Enamel canister, Trailing pothos, Mini cactus pot, Filament spool set |
| Wallpaper (7) | Cream plaster, White shiplap, Washi grid, Sage limewash, Daisy dots, Blue gingham, Square tile wainscot |
| Floor (6) | Cream & blue checker, Light oak planks, Tatami, Cork, Terracotta tile, Walnut herringbone |
| Decor (8) | Butter & blush rug, Jute round rug, Striped cotton rug, Paper lantern, Mushroom lamp, Red-rim wall clock, Oak wall clock, Sleepy cat bed |
| Pegboard (8) | Oat / Sage / White / Walnut pegboard, Mini wood shelf, Wire basket, Pen cup, String lights |

---

## 15. Inside a storage piece (fridge, shelf, cabinet)

**Flow:** tap the fridge → it lifts and gets a sage outline → camera glides in (~600 ms, room fades)
→ door swings open on a soft spring and the inside light turns on → **Arrange** view.

**Inside view** — straight-on, like looking into a real open fridge:
- Light cream-grey cavity, top vent, side walls with **rail notches** where shelves sit
- Wire or glass shelves, two translucent crisper drawers at the bottom
- Tabs for **Main · Freezer · Door bins**
- Items are the item pictures **standing directly on the shelf**, upright and bottom-aligned to the shelf line
- **PNG:** keep its transparency — never draw a white box or border behind it; the soft drop shadow follows the PNG's shape
- **JPG / photos:** offer "Remove white background" so they also become transparent cut-outs
- **Fit to height:** each picture is scaled (contain) to fit the free height above its shelf, so a tall
  milk jug and a short egg carton both look right; width follows the aspect ratio
- The inside view itself fits the screen height (no scrolling to see the whole fridge)

**Managing items**
- Drag an item to another slot, shelf, drawer or door bin; the target slot shows a dashed sage outline
- The dragged item lifts higher (bigger shadow) and shows a dark tag: "Thai basil → Shelf 2 · slot 4"
- Tap an item → details panel with status chips, Eat one, Move to…
- **Item picture:** drop or upload a PNG (up to 2 MB). Optional "Remove white background" for photos/JPGs,
  and "Also save as the product picture in Grocy" (Grocy supports product pictures, so it syncs)
- Items without a picture fall back to a default **item icon**, picked from the Grocy product group and name:
  - Bottles: water, soy sauce, fish sauce, cooking oil, milk bottle, juice
  - Seasoning: salt shaker, pepper grinder, chili flakes, sugar jar, squeeze sauce, spice tin
  - Boxes: cereal, pasta, tea, egg carton, tissue box, milk carton
  - Bags: shopping tote, paper grocery bag, plastic shopping bag, rice sack, snack bag, frozen bag
  - Style: flat shapes, palette colors only, soft contact shadow, no brand names or logos

**Managing shelves** ("Items + shelves" mode)
- Each shelf has a grip handle on the left; drag it up/down to another rail notch
  (selected shelf: dashed honey outline)
- Floating shelf toolbar: move up · move down · type (wire, glass, half-width, drawer, door bin) · remove
- "+ Add shelf" puts a new shelf on the nearest free notch
- Items on a moved shelf move with it; removing a shelf moves its items to "Unsorted" first
- Every storage piece opens the same way, with one of two layouts:

| Piece | View | What you edit |
|---|---|---|
| Fridge | Front | Shelves on rail notches, crisper drawers, freezer and door bins (tabs) |
| Pantry shelf | Front | Tiers (drag by handle, add/remove) |
| Home supplies cabinet | Front | Shelves + hooks/bins on the open door |
| Maker shelf | Front (wall) | Wall boards; spools show grams left |
| Snack crates | Top-down | Dividers / compartments; tab between stacked crates |
| Wicker basket | Top-down | Loose items, grouped into net bags; no shelves |
| Chest freezer | Top-down | Wire baskets + the floor compartment |
| Rice bin | Top-down | A single item with a fill-level gauge; a scanned rice sack refills it |

**Where the data lives**
- Grocy knows only *which location* an item is in. Shelf layout and item slots are Pantrywood's own
  data (local first, own server in Phase 3). The item picture can be saved to Grocy.

---

## 16. Pegboard

A pegboard on the left wall of the room is home for **receipt slips, notes, photos and little
decorations**. Tap it in the 3D room (or "Open board") to open the board view.

**In the room:** oat pegboard with string lights, two pinned slips, two sticky notes, a polaroid,
a mini wooden shelf with a plant and pen cup, and a tote bag on a hook.

**Board view** (fits the screen height, like the fridge inside view)
- Hole grid; everything snaps to the pegs
- **Receipt slips** — white paper with a torn zig-zag bottom, held by a binder clip, push pin or washi tape.
  After scanning, a slip gets a sage stamp "ADDED · 6"; tap it to see which items it added to stock
- **Notes** — butter, blush, mint, sky or lined paper; held by a magnet, push pin, washi tape or clip.
  Editable text, and can be **linked to items** (a linked note shows in that item's details and ticks
  itself off when the item is restocked)
- **Checklists** — lined paper with checkboxes ("Restock: dish soap, eggs, sage PLA")
- **Photos / PNG** — polaroid frame for photos; PNGs keep transparency (same rule as section 15)
- Selected piece: sage outline, resize corner, floating toolbar *Edit text · Color · Pin style · Bring to front · Delete*
- **Add to board:** Note · Checklist · Scan slip · Photo / PNG

**Decorate the board**
- Board color: oat, sage, white, walnut
- Accessories: string lights, mini wood shelf, pen cup, tote hook, binder clips, wire basket, little clock,
  sticker sheet (daisy, strawberry, mushroom). Bought with leaves like other decor

**Data:** slips are the receipts from Prompt 5 (Pantrywood's own data, with the image kept as a memory).
Notes, checklists, board layout and decorations are Pantrywood's own data; only restock actions reach Grocy.

---

## 17. When it's full, and when the numbers are wrong

**The room and inside views never scroll.** A full storage piece is handled in this order:

1. **Stack duplicates** — same product shows once with a count badge ("×6"); tap to fan out
2. **Shrink sideways** — pictures narrow to fit, never below 70% of their size
3. **Back row** — items behind sit raised and faded (45%); "Peek behind" swaps rows;
   use-soon items are always moved to the front row
4. **"+N more" chip** — last slot of a still-full shelf; opens a tray under the shelf to drag items out
5. **Fill bar** — thin bar per shelf (sage under 75%, honey 75–90%, terracotta over 90%) and a % on the room tag
6. **Suggest space** — "The freezer has room for 2 bags · Move 3 items"

Only two places scroll: one zoomed shelf on a phone (swipe sideways) and the 2D List view.
Top-down pieces follow the same steps: stack, then layers, then "+N more" per compartment.

**"Full" is a hint, never a wall**

- **Never block a drop.** Any item can always be dropped on any shelf; the steps above make room.
  The fill bar may go past 100% (terracotta), but nothing is refused
- **Space comes from item size, not a fixed slot count.** A shelf has a width; each item takes
  space by size — small (spice jar), medium (milk carton), large (egg tray, big jug). The size is guessed
  from the item icon and can be changed in the item details
- **Shelf size setting** in shelf edit mode: *Roomy · Normal · Tight* — tells the app the real shelf
  holds more (or less) than it thinks
- **Tuck in front:** dropping a small item onto another offers "Tuck in front", so they overlap like real jars
- **Add shelf** is only for copying the real layout — never a workaround for a wrong "full"

**The 3D room is not a 1:1 copy of the real fridge.** Shelves follow your real layout; numbers are what matter.

**When stock drifts from real life**

- **Check stock** mode per storage piece: every item with − / + steppers; only changed rows are highlighted;
  "Save N changes" or "All correct". Saved with Grocy's **inventory** action (sets the real amount),
  never fake "consume" entries
- **Rough amounts** for things nobody counts (rice, sugar, oil, filament): Full · Half · Low · Empty,
  or a gauge, mapped to an approximate quantity
- **Gentle reminders**, one at a time: "Still have 6 eggs? Not touched in 9 days" → *Yes* / *Fix it*.
  Also when a slip shows a new purchase but the old item was never used up
- **Trust marker** on each storage piece: "checked today", "3 days ago", "3 weeks ago" (honey when old)
- **Fast logging** reduces drift: one-tap "Eat one", scanner can consume as well as add, receipts add automatically

---

## 18. Item detail

Two levels, so most actions stay inside the room:

1. **Quick peek** — tap an item: side panel (desktop) / bottom sheet (mobile) with picture, amount,
   status chips and *Eat one · Open · Move to… · Add more*, plus "See details"
2. **Full item detail page** — from "See details" or the List view

**Full page sections**
- **Header:** picture (change / upload PNG), name + Thai name, product group and Food/Supply chips,
  big amount with unit, status chip ("2 use soon · by 14 Oct"), min stock and last checked;
  actions *Eat one · Add more · Move to… · Add to shopping list*
- **Stock by batch:** one row per Grocy stock entry — amount, best-before, where/when bought, price each.
  Oldest batch is marked "Next to use" (honey) and is consumed first
- **Where it is:** mini picture of the storage piece with the item highlighted, "Fridge · Shelf 1 · slot 2",
  and **Show me** (opens the inside view and highlights it)
- **Product settings:** minimum stock, default shelf life (or "Never expires" for supplies), unit,
  item size on shelf (small / medium / large), barcodes (+ scan)
- **History:** timeline of added / ate / opened / moved / checked, with +/− amounts
- **Prices:** price per unit from receipts, lowest one highlighted
- **Linked:** pegboard notes and checklists, receipts it came from, shopping-list status

**Layout (desktop):** hero card on top (picture on a soft honey backdrop | info), then two columns —
main (stock by batch, history) and a sidebar (where it is, settings, prices, linked).

**Hero details**
- **Stock meter:** bar from 0 to a "full" amount, with a marker at the minimum stock
- **Usage summary:** three small tiles — next expiry, how fast you use it ("~4 a week"),
  and how long the stock lasts ("about 10 days"), calculated from the history
- One primary action (*Eat one*), one secondary (*+ Add more*), the rest as icon buttons (move, shopping list)

**Batches** show an **expiry bar** (days left out of the shelf life: honey when low, sage when fresh).
**History** is a vertical timeline with round icons (+ added, − eaten, ✓ checked).

**Mobile:** full-width picture on top, content sheet sliding over it, same order in one column;
settings become tappable rows (label · value · chevron); history shows the last 3; a **sticky bottom bar**
keeps *Eat one · + Add · Move* always in reach.

---

## 19. Scan

Opened from the terracotta Scan button (desktop) or the center Scan tab (mobile).

**Two switches at the top**
- **What to scan:** Barcode · Receipt
- **What happens after a barcode scan:** Add to stock · Eat / use · Check stock (remembers the last choice)

**Mobile scanner**
- Full-screen camera with a warm dark tint, rounded cream corner brackets, a soft sage scan line
- A detected barcode gets a sage box; hint "Found it · or use your barcode scanner"; chip "USB scanner ready"
- **Result sheet** slides up (no page change): picture, name + Thai name, "Found" chip, how many you
  already have; amount stepper (defaults to the pack size, e.g. tray of 10); tiles for *Put in*
  (last used place), *Best before* (today + default shelf life), *Price* (optional), *Shop*;
  one big button "Add 10 eggs to the fridge"; "Not right?" and a *Keep scanning* toggle

**Desktop scan station** (for the hardware scanner)
- Left: camera preview, a "USB scanner ready" status with a soft pulsing dot (just scan, no click needed),
  and a field to type barcode numbers
- Right: **This session** list — every scan with amount, place and *Undo*; the session ends with "Done · N items added"
- **New barcode** card (honey): *Create product · Link to existing · Look up online*
- **Print labels** for market goods without a barcode — scan the printed label next time

**Receipt review**
- Header: store + date, and summary tiles — Lines · Total · Matched · **Needs you** (honey)
- Left: receipt photo with **numbered badges** on each line (sage = matched, honey = needs you),
  zoom − / + and Retake
- Right: filter tabs *All · Needs you*, then one card per line with the same number:
  printed Thai text (small), matched item (tap to change), a note (remembered match / matched by name),
  amount pill and price
- Lines that need you come first and expand: "Which item is this?" with suggestion cards
  (best guess pre-selected), "+ New product", and what will happen ("Rice bin goes from Low to Full")
- Pinned footer: total check (lines = receipt total), *Pin slip on the pegboard*, *Remember matches*,
  and "Add N items to stock"

**Fit the screen:** the scan station and receipt review are exactly one screen tall (100vh) — no page
scroll. The camera and the receipt photo grow to fill the height; only the session list (and long
receipts) scroll inside their own card. Below about 640 px tall or on narrow screens the page may scroll normally.

**Motion:** sheets slide up with a spring, the scan line drifts slowly, a successful scan gives a short
sage flash + gentle haptic on mobile; each added row slides into the session list.
