// No "@/" imports: scripts/put-away.test.mjs runs this file directly with Node.

/** The Grocy location new stock waits in until it's put on a shelf. Never a storage piece in the room. */
export const PUT_AWAY_NAME = "To put away";

export const isPutAwayName = (name: string) => name.trim().toLowerCase() === PUT_AWAY_NAME.toLowerCase();

type ListItem = { key: string; name: string; amount: number; inFreezer: boolean };

export type ItemRow<Item extends ListItem> = {
  item: Item;
  /** null while it waits to be put away. */
  place: string | null;
};

/** Every item with where it is: the ones waiting to be put away first, then the rest by name. */
export const itemRows = <Item extends ListItem>(
  waiting: readonly Item[],
  places: readonly { name: string; items: readonly Item[] }[],
): ItemRow<Item>[] => {
  const byName = (first: ItemRow<Item>, second: ItemRow<Item>) => first.item.name.localeCompare(second.item.name);
  const placed = places
    .flatMap((place) =>
      place.items
        .filter((item) => item.amount > 0)
        .map((item): ItemRow<Item> => ({ item, place: item.inFreezer ? `${place.name} · freezer` : place.name })),
    )
    .sort(byName);
  const notPlaced = waiting
    .filter((item) => item.amount > 0)
    .map((item): ItemRow<Item> => ({ item, place: null }))
    .sort(byName);
  return [...notPlaced, ...placed];
};

/**
 * Where stock dropped on a shelf goes in Grocy: the piece itself, or its freezer for a freezer shelf
 * (freezer stock is another Grocy location). null when the piece has no freezer location to put it in.
 */
export const dropDestination = ({
  zone,
  locationId,
  locationIsFreezer,
  freezerId,
}: {
  zone: "main" | "freezer";
  locationId: number;
  locationIsFreezer: boolean;
  freezerId: number | null;
}) => (zone === "main" || locationIsFreezer ? locationId : freezerId);
