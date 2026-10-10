# Pantrywood mockups

Design mockups for every screen, exported from the design canvas. Use them as the visual
reference together with `docs/DESIGN.md`. They are **reference only** — do not copy them into
the app as-is; rebuild each screen with the real stack (Next.js, Tailwind, shadcn/ui, React Three Fiber).

## How to read the files

- Each `*.dc.html` file is one screen. Layout and styles are inline `style="…"` attributes,
  so exact colors, spacing, radii and font sizes can be read directly from the markup.
- `{{ … }}`, `<sc-for>` and `<sc-if>` are template placeholders from the design tool. The data they
  show is in the `renderVals()` script at the bottom of each file — treat it as sample data.
- `<dc-import name="Thumb">` places the item thumbnail from `Thumb.dc.html`.
- `storage-room.svg` is the illustrated storage-room diorama used in several screens. The real app
  builds this scene in 3D (see DESIGN.md section 7); the SVG shows the target look and layout.
- The files will not render exactly in a normal browser (the design tool's runtime is missing);
  read them as code.

## Screens

| File | Screen | Design guide |
|---|---|---|
| `Main.dc.html` | Storage room — desktop home (3D room, stats, item panel, use soon, pegboard) | §7, §8, §9 |
| `Mobile.dc.html` | Storage room — mobile home with bottom sheet and nav | §8 |
| `StyleTile.dc.html` | Palette, type, status chips, buttons, 3D colors | §2–§6 |
| `Decorate.dc.html` | Decorate mode: selected piece toolbar, catalog, room themes | §14 |
| `Catalog.dc.html` | All 58 decorate items by category | §14 |
| `Thumb.dc.html` | Item thumbnail component used by the catalog | §14 |
| `FridgeInside.dc.html` | Inside the fridge: items, shelves on rail notches, item picture upload | §15 |
| `InsideViews.dc.html` | Inside views for every storage piece (front and top-down) | §15 |
| `StockStates.dc.html` | Full shelf handling and Check stock | §17 |
| `Pegboard.dc.html` | Pegboard: slips, notes, checklist, accessories | §16 |
| `ItemIcons.dc.html` | 24 default item icons (bottles, seasoning, boxes, bags) | §15 |
| `ItemDetail.dc.html` | Item detail — desktop | §18 |
| `ItemDetailMobile.dc.html` | Item detail — mobile | §18 |
| `ScanDesktop.dc.html` | Scan station with hardware scanner and session list | §19 |
| `ScanMobile.dc.html` | Mobile camera scanner with result sheet | §19 |
| `ReceiptReview.dc.html` | Receipt OCR review | §19 |
