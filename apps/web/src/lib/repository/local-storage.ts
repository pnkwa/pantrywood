import type { Repository } from "@pantrywood/shared";
import { z } from "zod";

/**
 * Pantrywood's own data in this browser's localStorage, one key per collection.
 * Rows are re-validated on read, so a hand-edited or outdated entry is dropped, not trusted.
 * shortcut: ~5 MB per site and no sync between devices, move to apps/api in Phase 3.
 */
export const localStorageRepository = <T>(
  collection: string,
  schema: z.ZodType<T>,
): Repository<T> => {
  const storageKey = `pantrywood:${collection}`;
  const RowsSchema = z.record(z.string(), z.json());

  const readRows = (): Map<string, T> => {
    const rows = new Map<string, T>();
    try {
      const stored = RowsSchema.safeParse(JSON.parse(localStorage.getItem(storageKey) ?? "{}"));
      for (const [id, value] of Object.entries(stored.success ? stored.data : {})) {
        const row = schema.safeParse(value);
        if (row.success) rows.set(id, row.data);
      }
    } catch {
      // Blocked storage or broken JSON reads as empty.
    }
    return rows;
  };

  // Throws when the browser refuses (e.g. storage full), so the caller can react.
  const writeRows = (rows: Map<string, T>) =>
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(rows)));

  return {
    get: async (id) => readRows().get(id),
    list: async () => [...readRows().values()],
    save: async (id, value) => {
      const rows = readRows();
      rows.set(id, value);
      writeRows(rows);
    },
    remove: async (id) => {
      const rows = readRows();
      rows.delete(id);
      writeRows(rows);
    },
  };
};
