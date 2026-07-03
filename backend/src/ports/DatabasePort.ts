/**
 * Database Port — Provider-independent database abstraction.
 * Engines interact with the database exclusively through this interface.
 * Swap implementations (Supabase, PostgreSQL, Redis) without changing engine code.
 */

export interface Filter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is';
  value: unknown;
}

export interface JoinSpec {
  table: string;
  on: string;
  select: string[];
}

export interface QueryOptions {
  select?: string[];
  filters?: Filter[];
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  offset?: number;
}

export interface DatabasePort {
  /** Query multiple rows from a table */
  query<T = Record<string, unknown>>(table: string, options?: QueryOptions): Promise<T[]>;
  /** Query a single row from a table */
  queryOne<T = Record<string, unknown>>(table: string, options?: QueryOptions): Promise<T | null>;
  /** Insert a row and return the inserted record */
  insert<T = Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T>;
  /** Update rows matching filters. Returns number of affected rows. */
  update(table: string, filters: Filter[], data: Record<string, unknown>): Promise<number>;
  /** Delete rows matching filters. Returns number of affected rows. */
  delete(table: string, filters: Filter[]): Promise<number>;
  /** Count rows matching filters */
  count(table: string, filters?: Filter[]): Promise<number>;
  /** Atomic conditional update — returns true if at least one row was updated */
  conditionalUpdate(table: string, filters: Filter[], data: Record<string, unknown>): Promise<boolean>;
}
