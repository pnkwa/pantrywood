# Pantrywood — Build Prompts

Paste these one at a time. Commit after every step that works.
Keep `DESIGN.md` in `docs/` — every prompt tells the AI to follow it.

## The prompt pattern

- **Context:** tell the model what you are building.
- **Goal:** say exactly what you want right now.
- **Constraints:** name the tools and the rules.
- **Output:** describe the files you expect.
- **Verify:** ask the model to check its own work.

## Stack

Next.js (App Router) · TypeScript · pnpm · Tailwind · shadcn/ui · TanStack Query ·
React Three Fiber + drei · Zustand · Motion · BarcodeDetector + zxing-wasm · vision LLM for receipts

## Repo layout

A pnpm + Turborepo monorepo. File paths in the prompts are relative to the repo root.

```
apps/web/          Next.js frontend, incl. the Grocy proxy and receipt route (created in Prompt 1)
apps/api/          Pantrywood's own server (added in Phase 3)
packages/shared/   @pantrywood/shared — types, zod schemas, the Repository interface
packages/config/   @pantrywood/config — shared tsconfig and ESLint base
docs/              DESIGN.md, PROMPTS.md, mockups
```

Run `pnpm typecheck`, `pnpm lint` and `pnpm build` from the repo root; Turborepo runs them in every package.

---

## Step 0 — Concept image

Use ChatGPT or Gemini, then attach the image to Prompt 1.

```
Create a concept image of a cozy home pantry app built around a cute 3D isometric diorama of a STORAGE ROOM (not a kitchen), in the style of soft clay-like Blender dioramas: a cut-away room on a thick wooden slab, two cream walls with chunky rounded wooden caps and a small-tile wainscot, a cream and pale-blue checkered tile floor, a red-rimmed wall clock and a window with blue gingham curtains. Soft pastel accents (powder blue, butter yellow, blush pink) on cream and warm wood. Inside: a rounded retro cream fridge with notes and magnets, a chest freezer, a wooden pantry shelf full of jars and cans, a butter-yellow open supplies cabinet with tissue rolls, shampoo and detergent, a wall shelf of 3D-printer filament spools, stacked wooden crates, a rice barrel, a veggie basket and a cat sleeping on a round rug. Earth-tone palette: cream, sage green, warm brown, terracotta, honey. Soft rounded paper-like UI: a top bar with the logo "Pantrywood", small stat cards for items to use soon and items running low, and a side panel showing the selected fridge's items with expiry chips. Warm morning light, matte materials. 16:9, polished like a game screenshot.
```

---

## Prompt 1 — Project setup and Grocy data layer

```
I am building Pantrywood, a cute cottagecore frontend for my self-hosted Grocy. The attached image shows the target look, and docs/DESIGN.md is the design guide. The repo is already a pnpm + Turborepo monorepo (see "Repo layout" in docs/PROMPTS.md). First, set up only the web app and data layer. No UI yet.

Constraints:
- Create the Next.js app in apps/web (package name @pantrywood/web) with `pnpm create next-app apps/web`: App Router, TypeScript (strict), Tailwind, then add shadcn/ui and TanStack Query. Its tsconfig extends @pantrywood/config/tsconfig/base.json (keep Next's DOM lib, JSX and plugin settings), its ESLint config builds on @pantrywood/config/eslint, it depends on @pantrywood/shared via workspace:*, and next.config lists @pantrywood/shared in transpilePackages. It needs typecheck, lint and build scripts so the root commands cover it.
- Create a server-side proxy in apps/web/app/api/grocy/[...path]/route.ts that forwards requests to Grocy with the GROCY-API-KEY header. Read GROCY_URL and GROCY_API_KEY from apps/web/.env.local. The API key must never reach the browser.
- Add the color, font and radius tokens from DESIGN.md section 13 to the global CSS and Tailwind config.
- Define TypeScript types for Product, Location, StockEntry, QuantityUnit and ProductBarcode based on Grocy's API, in packages/shared so apps/api can reuse them later.
- Add a mock mode (MOCK_GROCY=true) with realistic seed data: 6 locations (Fridge, Freezer, Pantry Shelf, Snack Box, Rice Bin, Home Supplies), 30 food products and 10 non-food products (tissue rolls, shampoo, dish soap, laundry detergent, PLA filament spools in 3 colors…) with Thai and English names. Food stock has expiry dates (some fresh, some expiring within 3 days, a few expired). Non-food products never expire (Grocy default best-before -1) and have a min stock amount; a few are below it.
- Add a helper that classifies each product as "food" or "supply" from its product group, following the "Food vs. supplies" table in DESIGN.md.

Output: types in packages/shared/src/grocy/, data hooks in apps/web/src/lib/grocy/, seed data in apps/web/src/lib/grocy/mock/, and apps/web/.env.example.

Verify: run pnpm typecheck, pnpm lint and pnpm build from the repo root. Then explain the structure in five lines.
```

---

## Prompt 2 — 3D kitchen scene

```
Using the existing data layer, the attached concept image and DESIGN.md section 7, build the 3D kitchen scene with React Three Fiber and drei.

- Build the room as a storage-room diorama (DESIGN.md section 7): thick wooden slab, cream and pale-blue checkered tile floor, two cream walls with a small-tile wainscot and chunky rounded wooden caps, a window with blue gingham curtains, a wall clock and a round rug.
- Each Grocy location becomes a storage object: Fridge = rounded retro fridge, Freezer = chest freezer, Pantry Shelf = wooden shelf unit, Snack Box = stacked wooden crates, Rice Bin = wooden barrel, Home Supplies = open wooden cabinet, Maker = wall shelf of filament spools, anything else = wicker basket. Use rounded/beveled geometry (drei RoundedBox) so it looks soft and clay-like.
- Show stock items as tiny simple shapes inside each storage, positioned from the data: food as jar, can, carton, bag, box; supplies as roll (tissue), bottle (shampoo, soap) and spool (filament, tinted by its color). Use instancing for repeated items.
- Orthographic isometric camera with pan (drag), zoom (wheel / pinch) and limits so the user cannot leave the room.
- Matte materials, warm hemisphere light, one soft directional "morning sun" light with soft shadows, cream-to-peach sky background.
- Floating paper-tag labels per storage: name, item count, and how many to use soon.

Constraints: do not change the data layer. Keep scene components in apps/web/src/components/scene/.

Verify: run the build and type check, and describe what you would see on screen.
```

---

## Prompt 3 — Click to inspect + fridge door

```
Make every storage object and item in the scene clickable, following DESIGN.md.

- Hover: cream outline and the object lifts slightly. Click: sage outline and open the inspect panel (side panel on desktop, bottom sheet on mobile).
- Storage panel: list its items with quantity, unit and status chip. Food is sorted by soonest expiry; supplies are sorted by lowest stock and show only "Stocked" or "Running low" (never expiry chips).
- Item panel: name, quantity, unit, expiry date (food only), location, and buttons that call Grocy through the proxy: food gets "Eat one", "Open", "Move", "Add more"; supplies get "Use one", "Move", "Add more", "Add to shopping list".
- "Use soon" counts food only; "Running low" counts both food and supplies.
- Clicking the fridge door glides the camera in, then switches to a 2D "fridge door" view where items are sticky notes and magnets.
- Add the top bar and stat cards from DESIGN.md section 8: Use soon, Running low, In stock, Added this week — all computed from the data.

Constraints: Zustand for selection and view state. Keep 3D components free of business logic. Refresh stock with TanStack Query after every action. Every transition must be smooth, following DESIGN.md section 10 (Motion for panels and lists, shared-element transitions between pages, animated number changes); respect prefers-reduced-motion.

Verify: run the build and type check, and list which Grocy endpoints each button calls.
```

---

## Prompt 4 — Barcode scanning

```
Add barcode scanning to Pantrywood with two input methods:

1. Hardware scanner: a global listener that detects fast keystrokes ending in Enter as a barcode, and ignores normal typing inside input fields.
2. Camera: use the BarcodeDetector API when available, fall back to zxing-wasm otherwise.

On scan, look up the product with Grocy's by-barcode endpoint through the proxy.
- If found: show a cute popup (paper card style from DESIGN.md) to add or consume stock, with quantity and location.
- If not found: offer to create a new product and link the barcode.

Build the Scan screens from DESIGN.md section 19: the mobile scanner with its result bottom sheet (amount, place, best before, price, shop, "Keep scanning"), the desktop scan station with a session list, Undo and the new-barcode card, and the Add / Eat / Check switch. Add "Print labels" that generates printable barcodes (Code 128) for products without one and links them in Grocy.

Verify: run the build and type check, and explain how the hardware scanner is told apart from normal typing.
```

---

## Prompt 5 — Receipt OCR

```
Add receipt scanning. The user takes a photo or uploads an image of a shopping receipt, often in Thai.

- Send it to a server route apps/web/app/api/receipt/route.ts that calls a vision LLM API (key from apps/web/.env.local, never sent to the browser) and returns JSON: store, date, and items with name, quantity and price. Validate the JSON with a zod schema in packages/shared.
- Show the review screen from DESIGN.md section 19: receipt photo on one side, matched lines on the other with a note per match (remembered, matched by name, best guess). Each line has a dropdown to change the match or create a new product. Check that the lines add up to the receipt total.
- Save each receipt-name-to-product mapping so future receipts match automatically.
- On confirm, add all items to Grocy stock. Receipts mix food and supplies (e.g. milk and tissue on one slip): new products get a suggested product group, and supplies get no expiry date.
- Keep the receipt image as a "memory" shown in a polaroid-style Receipts page (DESIGN.md section 9).

Verify: run the build and type check, and show an example of the JSON the route returns.
```

---

## Prompt 6 — Review and polish

```
Review the whole Pantrywood project like a senior engineer.

1. List bugs, performance problems and unused code.
2. Make sure the 3D scene runs smoothly on a mid-range phone, and add a "List view" toggle as a 2D fallback.
3. Check that no API key reaches the browser.
4. Check the UI against DESIGN.md: colors, fonts, radius, status = color + icon + word, focus rings, tap targets.
5. Check that every transition is smooth (DESIGN.md section 10): no instant jumps, transform/opacity only, interruptible, reduced-motion fallback.
6. Fix what you find, then run the build, lint and type check, and show me the results.

Do not add new features.
```


---

## Prompt 7 — Decorate mode (Phase 3)

```
Add Decorate mode to Pantrywood, following DESIGN.md section 14.

- A catalog of items defined in apps/web/src/data/catalog.ts: id, name, category (storage | shelfItem | wallpaper | floor | decor), style (nordic | natural | japandi | retro), footprint in grid cells, price in leaves, and the 3D model or material to use. Seed it with the 50 items listed in DESIGN.md.
- Room layout state (placed items, positions, rotation, wallpaper, floor) in a Zustand store, persisted to localStorage for now behind the Repository interface from @pantrywood/shared so it can move to our own API (apps/api) later.
- Each storage furniture item is bound to a Grocy location id. "Swap style" replaces the model but keeps the location and its stock. Cosmetic items never call Grocy.
- Edit mode in the 3D scene: floor grid, click to select (dashed honey outline), floating toolbar with Swap style, Rotate (90°), Move (snap to grid, no overlaps), Put away.
- Catalog side panel (bottom sheet on mobile): category tabs, style filter chips, item cards with thumbnail, style chip and price / Owned / In room.
- Room themes that set wallpaper, floor and furniture styles in one action, with Undo.

Constraints: keep 3D components free of business logic; wallpaper and floor are materials/textures, not new meshes.

Verify: run the build and type check, and show how swapping the fridge style keeps its Grocy location.
```

---

## Prompt 8 — Inside view: open the fridge, arrange items and shelves

```
Add an "inside view" for storage pieces, following DESIGN.md section 15. Start with the fridge.

- Tapping the fridge in the 3D room: highlight it, glide the camera in (~600 ms), animate the door opening on its hinge, then switch to a straight-on inside view. "Close door" reverses it. Respect prefers-reduced-motion.
- Inside view: cavity with rail notches on both side walls, shelves sitting on notches, two crisper drawers, and tabs for Main, Freezer and Door bins.
- Items are shown as their pictures standing upright on the shelf, bottom-aligned and scaled to fit the free height above the shelf (object-fit: contain). PNGs keep their transparency with no white background; the drop shadow follows the image shape (CSS drop-shadow filter). Without a picture, use a default item icon (24 icons in DESIGN.md section 15: bottles, seasoning, boxes, bags) chosen from the product group and name, as SVG components. The inside view fits the viewport height.
- Items mode: drag and drop items between slots, shelves, drawers and door bins, with a dashed target slot and a lifted item. Tap an item to open its details panel.
- Items + shelves mode: drag a shelf by its handle to another notch (items move with it), plus a toolbar to move up/down, change type (wire, glass, half-width, drawer, door bin) and remove (items go to "Unsorted"). "Add shelf" uses the nearest free notch.
- Item picture: upload a PNG (max 2 MB), optional white-background removal for photos/JPGs, and optionally upload it as the Grocy product picture through the proxy.
- Store the layout (shelves per storage piece, item slot positions) in our own store behind the Repository interface from @pantrywood/shared, not in Grocy.
- Build the inside view as two generic layouts and use them for every storage piece (table in DESIGN.md section 15): a front view with tiers/shelves (fridge, pantry shelf, supplies cabinet, maker shelf) and a top-down view with dividers/compartments (crates, basket with net-bag groups, chest freezer with wire baskets, rice bin with a fill-level gauge).

Use @dnd-kit for drag and drop and make every drag action also possible with buttons (Move to…) for keyboard and screen-reader users.

Verify: run the build and type check, and explain which data is saved to Grocy and which is saved by Pantrywood.
```


---

## Prompt 9 — Pegboard for slips, notes and decorations

```
Add a pegboard to Pantrywood, following DESIGN.md section 16.

- In the 3D room, place a pegboard on the left wall that shows the current slips, notes and accessories as small flat planes. Tapping it opens the board view.
- Board view: a pegboard with a hole grid that fits the viewport height. Pieces snap to the peg grid and can be dragged, resized (notes, photos) and reordered (bring to front).
- Piece types: receipt slip (from the receipt scanner in Prompt 5), note (editable text, 5 paper colors), checklist, photo/PNG (PNG keeps transparency), and accessories (string lights, mini shelf, pen cup, tote hook, clips, basket, clock, stickers).
- Each piece has a pin style: magnet, push pin, washi tape or clip.
- Notes and checklist lines can be linked to Grocy products. A linked note appears in that product's details and is marked done when the product is restocked.
- Tapping a slip shows the items it added to stock, with links to them.
- Board color and accessories come from the decorate catalog (DESIGN.md section 14).
- Store the board (pieces, positions, sizes, z-order, links) in our own store behind the Repository interface from @pantrywood/shared. Do not store it in Grocy.

Verify: run the build and type check, and show the data shape of one note, one slip and one accessory.
```


---

## Prompt 10 — Full storage and keeping stock honest

```
Add the "full" and "check stock" behaviour from DESIGN.md section 17 to the inside views.

Full storage (no scrolling of the room or the inside view):
- Group identical products into one picture with a count badge; tap to fan out.
- When a shelf or compartment overflows: shrink pictures sideways down to 70%, then use a back row (raised, 45% opacity, with a "Peek behind" toggle; use-soon items always in front), then turn the last slot into a "+N more" chip that opens a tray under the shelf.
- Show a fill bar per shelf and a fill percentage on the storage tag in the room. Over 90%, suggest free space in other storage pieces with a one-tap "Move" action.
- Only allow horizontal swipe inside a single zoomed shelf on small screens; the List view shows everything.
- "Full" never blocks a drop. Space is calculated from shelf width and item size (small / medium / large, guessed from the item icon, editable per item), not a fixed slot count.
- Add a per-shelf "Shelf size" setting (Roomy / Normal / Tight) that scales capacity, and a "Tuck in front" drop option for small items that lets them overlap.

Check stock:
- A "Check stock" mode per storage piece with − / + steppers per item, highlighted changed rows, "Save N changes" and "All correct". Save with Grocy's inventory endpoint (set amount), not consume.
- Rough-amount items (rice, sugar, oil, filament) use Full / Half / Low / Empty or a gauge, mapped to an approximate quantity stored in Pantrywood's settings.
- One gentle reminder at a time ("Still have 6 eggs?") for items untouched for N days, or when a new purchase arrives while the old one was never used up.
- Store and show "last checked" per storage piece.

Verify: run the build and type check, and show which Grocy endpoints Check stock calls.
```


---

## Prompt 11 — Item detail page

```
Add the item detail page from DESIGN.md section 18.

- Keep the existing quick peek (side panel / bottom sheet) and add a "See details" link to it.
- Route apps/web/app/items/[productId]/page.tsx with: header (picture, names, group, Food/Supply, amount, status, actions), stock by batch, where it is (+ Show me deep-link into the inside view with the item highlighted), product settings, history, prices and linked notes/receipts.
- Data from Grocy through the proxy: product details, stock entries per product (batches), price history, barcodes, stock log for history. Pantrywood's own data for shelf slot, item size and linked pegboard notes.
- Eat one consumes the oldest batch first. Settings edits update the Grocy product.
- Mobile: single column, settings as tappable rows that open small edit sheets.

Verify: run the build and type check, and list which Grocy endpoints each section uses.
```

---

## When something goes wrong

- Paste the exact error message.
- Say what you expected to happen.
- Change one thing at a time.
- Ask for the cause first, then the fix.
- Commit after every working step.

## Roadmap mapping

| Phase | Prompts |
|---|---|
| 1 — Full Grocy API, styled from the start | 1, 2, 3 |
| 2 — Receipt OCR, decorate the door | 4, 5 |
| 2b — Inside views, item pictures, shelf editing, pegboard, full & check stock, item detail | 8, 9, 10, 11 |
| 3 — Own server: accounts, XP, decorate mode, sharing | 7 |
| Always | 6 after each phase |
