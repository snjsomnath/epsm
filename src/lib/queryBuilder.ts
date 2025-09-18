import { db, DatabaseResult } from './postgres';

/**
 * Query Builder - Provides Supabase-like interface for PostgreSQL
 * Mimics Supabase's query builder API for easier migration
 */

class QueryBuilder<T extends Record<string, any> = Record<string, any>> {
  private tableName: string;
  private selectColumns = '*';
  private whereConditions: string[] = [];
  private orderByClause = '';
  private limitClause = '';
  private offsetClause = '';
  private params: any[] = [];
  private paramCounter = 0;

  constructor(table: string) {
    this.tableName = table;
  }

  /**
   * Select specific columns
   */
  select(columns?: string): QueryBuilder<T> {
    this.selectColumns = columns || '*';
    return this;
  }

  /**
   * Add WHERE condition
   */
  eq(column: string, value: any): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} = $${this.paramCounter}`);
    this.params.push(value);
    return this;
  }

  /**
   * Add WHERE NOT EQUAL condition
   */
  neq(column: string, value: any): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} != $${this.paramCounter}`);
    this.params.push(value);
    return this;
  }

  /**
   * Add WHERE LIKE condition
   */
  like(column: string, pattern: string): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} LIKE $${this.paramCounter}`);
    this.params.push(pattern);
    return this;
  }

  /**
   * Add WHERE ILIKE condition (case insensitive)
   */
  ilike(column: string, pattern: string): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} ILIKE $${this.paramCounter}`);
    this.params.push(pattern);
    return this;
  }

  /**
   * Add WHERE IN condition
   */
  in(column: string, values: any[]): QueryBuilder<T> {
    const placeholders = values.map(() => {
      this.paramCounter++;
      return `$${this.paramCounter}`;
    }).join(', ');
    
    this.whereConditions.push(`${column} IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  /**
   * Add WHERE IS NULL condition
   */
  isNull(column: string): QueryBuilder<T> {
    this.whereConditions.push(`${column} IS NULL`);
    return this;
  }

  /**
   * Add WHERE IS NOT NULL condition
   */
  notNull(column: string): QueryBuilder<T> {
    this.whereConditions.push(`${column} IS NOT NULL`);
    return this;
  }

  /**
   * Add WHERE > condition
   */
  gt(column: string, value: any): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} > $${this.paramCounter}`);
    this.params.push(value);
    return this;
  }

  /**
   * Add WHERE >= condition
   */
  gte(column: string, value: any): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} >= $${this.paramCounter}`);
    this.params.push(value);
    return this;
  }

  /**
   * Add WHERE < condition
   */
  lt(column: string, value: any): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} < $${this.paramCounter}`);
    this.params.push(value);
    return this;
  }

  /**
   * Add WHERE <= condition
   */
  lte(column: string, value: any): QueryBuilder<T> {
    this.paramCounter++;
    this.whereConditions.push(`${column} <= $${this.paramCounter}`);
    this.params.push(value);
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    const direction = options?.ascending === false ? 'DESC' : 'ASC';
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  /**
   * Add LIMIT clause
   */
  limit(count: number): QueryBuilder<T> {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  /**
   * Add OFFSET clause
   */
  offset(count: number): QueryBuilder<T> {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  /**
   * Execute the query and return results
   */
  async execute(): Promise<DatabaseResult<T[]>> {
    try {
      let query = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
      
      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }
      
      if (this.orderByClause) {
        query += ` ${this.orderByClause}`;
      }
      
      if (this.limitClause) {
        query += ` ${this.limitClause}`;
      }
      
      if (this.offsetClause) {
        query += ` ${this.offsetClause}`;
      }

      const result = await db.query<T>(query, this.params);
      
      return {
        data: result.rows,
        error: null,
        count: result.rowCount || 0,
      };
    } catch (error) {
      console.error('Query execution error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Get the first result only
   */
  async single(): Promise<DatabaseResult<T>> {
    this.limit(1);
    const result = await this.execute();
    
    return {
      data: result.data?.[0] || null,
      error: result.error,
      count: result.count,
    };
  }

  /**
   * Insert data
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<DatabaseResult<T | T[]>> {
    return db.insert<T>(this.tableName, data as Record<string, any>);
  }

  /**
   * Update data
   */
  async update(data: Partial<T>): Promise<DatabaseResult<T>> {
    if (this.whereConditions.length === 0) {
      return {
        data: null,
        error: new Error('UPDATE requires WHERE conditions for safety'),
      };
    }

    const whereClause = this.whereConditions.join(' AND ');
    return db.update<T>(this.tableName, data as Record<string, any>, whereClause, this.params);
  }

  /**
   * Delete data
   */
  async delete(): Promise<DatabaseResult<any>> {
    if (this.whereConditions.length === 0) {
      return {
        data: null,
        error: new Error('DELETE requires WHERE conditions for safety'),
      };
    }

    const whereClause = this.whereConditions.join(' AND ');
    return db.delete(this.tableName, whereClause, this.params);
  }

  /**
   * Build the SQL query (for debugging)
   */
  toSQL(): { query: string; params: any[] } {
    let query = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
    
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      query += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      query += ` ${this.limitClause}`;
    }
    
    if (this.offsetClause) {
      query += ` ${this.offsetClause}`;
    }

    return { query, params: this.params };
  }
}

/**
 * Main database interface - mimics Supabase's API
 */
class SupabaseCompatibleClient {
  /**
   * Start a query on a table
   */
  from<T extends Record<string, any> = Record<string, any>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  }

  /**
   * Execute raw SQL
   */
  async rpc(_functionName: string, _params?: Record<string, any>): Promise<DatabaseResult<any>> {
    // This would be used for custom functions - implement as needed
    console.warn('RPC functions not yet implemented. Use db.query() for raw SQL.');
    return { data: null, error: new Error('RPC not implemented') };
  }

  /**
   * Get database client for advanced operations
   */
  get client() {
    return db;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    return db.testConnection();
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    return db.close();
  }
}

// Create and export the main client
export const postgres = new SupabaseCompatibleClient();

// Export types and classes
export type { DatabaseResult };
export { QueryBuilder, SupabaseCompatibleClient };

// For debugging and direct access
export { db as directClient };