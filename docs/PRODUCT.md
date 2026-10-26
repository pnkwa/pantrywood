# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **The owner (primary):** runs a self-hosted Grocy at home and uses Pantrywood every day to see what is in
  the storage room, use things up in time and restock. Knows how everything is set up.
- **The household:** other people at home also check stock, eat or use things and scan groceries. They did
  not set Grocy up, so every screen must make sense without knowing how it works underneath.
- **Portfolio viewers:** recruiters and developers who open the public demo, which runs on mock data
  (`MOCK_GROCY=true`), and judge the design and engineering craft in a few minutes.

## Product Purpose

Pantrywood is a frontend for a self-hosted Grocy that turns the home storage room into a 3D diorama: the
fridge, shelves, cabinet, crates, basket and rice bin are real Grocy locations filled with real stock, food
and non-food alike (tissue, shampoo, dish soap, 3D-printer filament).

Success means:
- the household keeps using it instead of opening Grocy directly, because checking and restocking is pleasant;
- less waste: food gets eaten before its date and supplies don't run out by surprise;
- it works as a portfolio piece that shows design and engineering craft.

## Positioning

Grocy is the source of truth and stays a power tool; Pantrywood is the everyday face on top of it. The room
is not decoration: every storage piece is a live Grocy location, opening it shows its real contents, and
every stock change goes back to Grocy.

## Operating Context

- At home, on a phone in the storage room or kitchen, and on a desktop.
- After shopping: scanning barcodes with the phone camera or a USB scanner, or photographing a receipt that
  a vision model reads into stock lines for review.
- Day to day: checking what to use soon, eating or opening things, moving stock between locations, adding
  low items to the shopping list.
- Product names are often Thai, sometimes English or mixed; receipts are mostly Thai.

## Capabilities and Constraints

- Built: the 3D storage room, inspect panels, stock actions with Undo, barcode scanning and printed labels,
  receipt scanning and receipt memories, Decorate mode with a catalog bought with leaves, and inside views
  for every storage piece. The build plan continues in `docs/PROMPTS.md` (pegboard, full-storage handling,
  item detail).
- Grocy owns products and stock and is only reached through the server proxy; its API key never reaches the
  browser. Pantrywood's own data (room layout, shelf layouts, notes, pictures, receipt memories) lives behind
  the `Repository` interface, in local storage first and Pantrywood's own server later. It is never stored
  in Grocy.
- Food is tracked by expiry date and amount; supplies by amount only, with a minimum stock.
- Terminology: "Use soon", "Past its date", "Running low", "Opened", "Stocked"; leaves are the currency
  earned by using food in time and scanning receipts.
- Undecided: login for the hosted version. Without one, a public deployment must run on mock data so nobody
  can change real stock.

## Brand Commitments

- The name Pantrywood, and the design guide in `docs/DESIGN.md` with its mockups in `docs/mockups/`, which
  are binding for every UI change.
- Voice: short, kind and a little whimsical; gently helpful, never alarming.
- All names in the UI and data are brand-free: no real store or furniture brand names.

## Evidence on Hand

- Mock Grocy data with Thai and English products in `apps/web/src/lib/grocy/mock/seed.ts` and a sample
  receipt in `apps/web/src/lib/receipt/sample-receipt.ts`.
- Mockups of every screen in `docs/mockups/` and the design guide in `docs/DESIGN.md`.
- No users beyond the owner's household, no testimonials, usage numbers or press. Future work must not
  invent any.

## Product Principles

1. Grocy stays the truth: Pantrywood never invents or silently changes stock, and every stock action can be
   undone.
2. Useful before cute: the room and its charm exist to make checking and restocking quicker, not slower.
3. Clear for anyone at home: no step depends on knowing how Grocy is set up.
4. Gently helpful: nudge toward using things in time, never scold.
5. Craft shows in the details: smooth motion, honest data and complete states are part of the product.

## Accessibility & Inclusion

- Status is always shown as color, icon and word.
- Tap targets are at least 44 px; every drag also has a button version.
- Every transition has a reduced-motion fallback; the 3D room has a 2D list view.
- Thai text is first-class: IBM Plex Sans Thai alongside DM Sans, and Thai is never cut mid-character.
