/**
 * Storage for Pantrywood's own data (shelf slots, room layout, decorations, pegboard, notes).
 * Never Grocy. Phase 1–2 implement it with local storage in apps/web; Phase 3 swaps in an
 * implementation that calls apps/api, without changing the UI.
 */
export interface Repository<T> {
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  save(id: string, value: T): Promise<void>;
  remove(id: string): Promise<void>;
}
