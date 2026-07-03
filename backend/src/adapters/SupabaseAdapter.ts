import { DatabasePort, Filter, QueryOptions } from '../ports/DatabasePort.js';
import { getSupabase, DatabaseError } from '../database/client.js';

/**
 * Supabase Database Adapter — Implements DatabasePort using the Supabase
 * PostgREST client for all database operations.
 */
export class SupabaseAdapter implements DatabasePort {
  /** Get the Supabase client singleton */
  private get client() {
    return getSupabase();
  }

  /** Apply Filter[] to a Supabase PostgREST query builder */
  private applyFilters(query: any, filters?: Filter[]): any {
    if (!filters) return query;
    for (const f of filters) {
      switch (f.operator) {
        case 'eq': query = query.eq(f.column, f.value); break;
        case 'neq': query = query.neq(f.column, f.value); break;
        case 'gt': query = query.gt(f.column, f.value); break;
        case 'gte': query = query.gte(f.column, f.value); break;
        case 'lt': query = query.lt(f.column, f.value); break;
        case 'lte': query = query.lte(f.column, f.value); break;
        case 'in': query = query.in(f.column, f.value as unknown[]); break;
        case 'is': query = query.is(f.column, f.value as null); break;
      }
    }
    return query;
  }

  /** Query rows from a table with optional filtering, ordering, and pagination */
  async query<T = Record<string, unknown>>(table: string, options?: QueryOptions): Promise<T[]> {
    const selectStr = options?.select?.join(', ') || '*';
    let q = this.client.from(table).select(selectStr);
    q = this.applyFilters(q, options?.filters);
    if (options?.orderBy) {
      q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending });
    }
    if (options?.limit !== undefined) q = q.limit(options.limit);
    if (options?.offset !== undefined) {
      const end = options.offset + (options.limit || 100) - 1;
      q = q.range(options.offset, end);
    }
    const { data, error } = await q;
    if (error) throw new DatabaseError(`query(${table}): ${error.message}`, error);
    return (data || []) as T[];
  }

  /** Query a single row, returning null if not found */
  async queryOne<T = Record<string, unknown>>(table: string, options?: QueryOptions): Promise<T | null> {
    const results = await this.query<T>(table, { ...options, limit: 1 });
    return results[0] ?? null;
  }

  /** Insert a row and return the created record */
  async insert<T = Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T> {
    const { data: result, error } = await this.client.from(table).insert(data).select().single();
    if (error) throw new DatabaseError(`insert(${table}): ${error.message}`, error);
    return result as T;
  }

  /** Update rows matching filters, returning the number of affected rows */
  async update(table: string, filters: Filter[], data: Record<string, unknown>): Promise<number> {
    let q: any = this.client.from(table).update(data, { count: 'exact' });
    q = this.applyFilters(q, filters);
    const { count, error } = await q.select();
    if (error) throw new DatabaseError(`update(${table}): ${error.message}`, error);
    return count ?? 0;
  }

  /** Delete rows matching filters, returning the number of deleted rows */
  async delete(table: string, filters: Filter[]): Promise<number> {
    let q: any = this.client.from(table).delete({ count: 'exact' });
    q = this.applyFilters(q, filters);
    const { count, error } = await q;
    if (error) throw new DatabaseError(`delete(${table}): ${error.message}`, error);
    return count ?? 0;
  }

  /** Count rows matching optional filters without fetching data */
  async count(table: string, filters?: Filter[]): Promise<number> {
    let q: any = this.client.from(table).select('*', { count: 'exact', head: true });
    q = this.applyFilters(q, filters);
    const { count, error } = await q;
    if (error) throw new DatabaseError(`count(${table}): ${error.message}`, error);
    return count ?? 0;
  }

  /** Update rows only if at least one row matches the filters */
  async conditionalUpdate(table: string, filters: Filter[], data: Record<string, unknown>): Promise<boolean> {
    const affected = await this.update(table, filters, data);
    return affected > 0;
  }
}
