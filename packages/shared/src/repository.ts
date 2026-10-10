export interface Repository<T> {
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  save(id: string, value: T): Promise<void>;
  remove(id: string): Promise<void>;
}
