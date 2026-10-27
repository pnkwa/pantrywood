# Put-away tray: new stock waits in a list until you place it

Date: 2026-10-27 · Status: built (see "What was built" at the end)

## Why

Today every product gets a fixed home when it's created: the scan page's new-product form asks "Lives in",
and scanned or receipt stock goes straight into that place. That doesn't match how you actually put shopping
away. When you scan at the door or read a receipt you don't know yet (or don't care yet) where each thing
will go. You decide when you're standing at the shelf, or arranging things in the room.

So: scanning and receipts only bring things *in*. Where they live is decided later, by placing them.

## What you'll see

1. **No "Lives in" when creating a product.** The new-product form (barcode scan and receipt "+ New product")
   drops the field.
2. **New stock lands in a "To put away" list,** not on a shelf. Every scanned or receipt-added item for a
   product created this way waits there.
3. **An item list with a place tag.** Wherever you arrange things (Decorate mode and the inside view of a
   storage piece) you can open one list of your items. Items waiting to be placed show at the top with a
   "To put away" tag; items already placed show a tag with where they are now ("Pantry Shelf", "Fridge ·
   freezer"). It looks and behaves like the room's existing item lists.
4. **Placing an item** moves it from the list into a storage piece: drag it onto a shelf in the inside view,
   or use a "Put in…" button that picks the storage (and slot) without dragging.
5. **The room shows that something is waiting:** a small "5 to put away" chip, so the list is found without
   hunting. Opening it shows the same list.

## Goals

- Scan and receipt flows never ask where something goes.
- Every item that isn't placed yet is visible in one list until it is.
- Placing is quick: one drag, or two taps without dragging.
- The list tells you where placed items live, so it doubles as a "where is my X" list.

## Non-goals

- Several homes for one product, or splitting one product's stock across places from the list
  (Grocy's transfer already supports partial amounts; the list moves the whole waiting amount).
- Changing how the barcode "Eat / Use" and "Check" modes work; they still act on stock where it is.
- A new storage piece in the 3D room for the waiting stock.

## Anti-goals (would make this a failure even if it works)

- Stock that silently disappears from the room or stats because it's "nowhere".
- A list you must clear before you can use the app (it's a reminder, never a gate).
- Pantrywood keeping its own copy of stock amounts or places outside Grocy.

## Constraints

- **Grocy is the source of truth for stock and where it is.** Grocy requires a location on every product
  and every stock entry, so "not placed yet" must itself be a Grocy location. Pantrywood keeps no stock of
  its own (CLAUDE.md rules).
- Calls go through the proxy allowlist. Creating locations (`POST objects/locations`) and transfers
  (`POST stock/products/{id}/transfer`) are already allowed and handled by the mock.
- Every stock change goes through `useStockAction`, so leaves, pegboard ticks and Undo keep working.
- Accessibility: every drag also has a button; tags use color + icon + word; tap targets ≥ 44 px.
- Motion: transform/opacity only, with a reduced-motion fallback.

## How it works

### The holding place

- A Grocy location named **"To put away"** holds waiting stock. Pantrywood creates it the first time it's
  needed (the same way Decorate creates storage locations) and finds it by that name afterwards.
  *(My call: finding it by name keeps Pantrywood from storing Grocy ids of its own; renaming it in Grocy
  would make Pantrywood create a fresh one.)*
- It is never a storage piece: `placeLocations` / `useRoom` leave it out of the room, Decorate's storage
  list and the stored-away shelf. Its stock still counts in stats (it's in the house, just not put away).
- New products are created with it as their Grocy default location (`location_id`), which is what the
  form's "Lives in" used to set.

### Bringing things in

- **Barcode scan, new product:** the form has no "Lives in"; the product's default becomes "To put away",
  and "Add" puts the stock there. The Add button reads "Add 2 packs · to put away".
- **Receipt review:** each added line's stock goes to its product's default location, as today
  (`ReceiptReview` already uses `product.location_id`); for products made here that's "To put away".
  The line card's place hint shows "To put away".
- **Existing products** keep their current behaviour (see open question 1).

### The item list

- One list component, used in three places: the room's "to put away" chip, Decorate mode, and the inside
  view (where it replaces today's per-piece "Unsorted · drag onto a shelf" tray for waiting items).
- Rows: item icon, name, amount, and a place tag (sage tag with a pin icon and the place name; honey tag
  with a tray icon and "To put away" for waiting items). Waiting items sort first.
- In the inside view, a waiting row drags onto a section like an unsorted item does today. Dropping it:
  1. transfers the waiting amount in Grocy from "To put away" to this storage's location
     (`transfer` action through `useStockAction`, so it can be undone);
  2. records the slot in the inside layout, exactly as a drop from Unsorted does now.
- "Put in…" on each row opens a small picker (storage, then section) and does the same thing without
  dragging. Into a freezer tab means the freezer location (freezer stock stays a separate Grocy location).
- Placed rows are informational in the room and Decorate lists (tap opens the item panel, as elsewhere);
  moving placed stock between storages stays out of scope.

## Left to the builder

- Exact copy for the chip, tags and picker, following DESIGN.md and the existing mockups' style.
- Where the chip sits in the room UI on desktop and phones (near the stat cards is the obvious spot).
- Whether the room list is a panel or a bottom sheet on phones (follow how the board/Decorate panels work).
- Tests: the pure rules (which location is the holding place, sorting/grouping rows, the transfer request
  built for a drop) go in a pure module next to `lib/inside/layout.ts` with a `scripts/*.test.mjs` file.

## Open questions (settled as defaults; change them if they're wrong)

1. **Existing products with a home already** keep it: their new stock still goes straight there.
2. **Placing a product doesn't change its Grocy default:** every new purchase of a product made without a
   place waits in "To put away" again.

## What was built, and what differs from the plan above

- Built: no "Lives in" in the new-product form; the "To put away" location (created on first use, found by
  name); waiting stock out of the room but still in the stats; "Add 1 pcs · to put away" on the scan card;
  the "All items" list (waiting first with "Put in…", placed items with a place tag) in the side panel and
  the phone sheet, opened from a "N to put away" chip (top row on desktop, bottom of the room on phones) or
  "All items" in the Peek inside list; a "To put away" tray with "Put in…" in every inside view.
- Built later: in the inside view each waiting card can be **dragged onto a shelf** (it lands at that spot; a
  freezer shelf means the freezer location), or put there with one tap on **Put here**; "Elsewhere…" picks
  another storage. If the same product already sits in that piece, the two merge into one item at the drop spot.
- Not built: the list **inside Decorate mode.** Decorate hides the side panel for its build tray; the chip
  and list are there as soon as Decorate is closed.
