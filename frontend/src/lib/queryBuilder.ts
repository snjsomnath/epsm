/**
 * API Query Builder - Provides chainable query interface for Django API
 * Makes HTTP requests to Django backend instead of direct database access
 */

import { authenticatedFetch } from './auth-api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface DatabaseResult<T = any> {
  data: T | null;
  error: Error | null;
  count?: number;
}

class QueryBuilder<T extends Record<string, any> = Record<string, any>> {
  private tableName: string;
  private selectColumns = '*';
  private whereConditions: Record<string, any> = {};
  private orderByClause = '';
  private limitValue?: number;
  private offsetValue?: number;

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
    this.whereConditions[column] = value;
    return this;
  }

  /**
   * Add WHERE LIKE condition
   */
  like(column: string, pattern: string): QueryBuilder<T> {
    this.whereConditions[`${column}__icontains`] = pattern.replace(/%/g, '');
    return this;
  }

  /**
   * Add WHERE IN condition
   */
  in(column: string, values: any[]): QueryBuilder<T> {
    this.whereConditions[`${column}__in`] = values;
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    const direction = options?.ascending === false ? '-' : '';
    this.orderByClause = `${direction}${column}`;
    return this;
  }

  /**
   * Add LIMIT clause
   */
  limit(count: number): QueryBuilder<T> {
    this.limitValue = count;
    return this;
  }

  /**
   * Add OFFSET clause
   */
  offset(count: number): QueryBuilder<T> {
    this.offsetValue = count;
    return this;
  }

  /**
   * Execute the query and return results
   */
  async execute(): Promise<DatabaseResult<T[]>> {
    try {
      const params = new URLSearchParams();
      
      // Add where conditions
      Object.entries(this.whereConditions).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value);
        }
      });
      
      // Add ordering
      if (this.orderByClause) {
        params.append('ordering', this.orderByClause);
      }
      
      // Add pagination
      if (this.limitValue) {
        params.append('limit', this.limitValue.toString());
      }
      
      if (this.offsetValue) {
        params.append('offset', this.offsetValue.toString());
      }

      const url = `${API_BASE_URL}/api/${this.tableName}/?${params.toString()}`;
      const response = await authenticatedFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        data: result.results || result,
        error: null,
        count: result.count || (Array.isArray(result) ? result.length : 1),
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
    try {
      const url = `${API_BASE_URL}/api/${this.tableName}/`;
      const response = await authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        data: result,
        error: null,
        count: Array.isArray(result) ? result.length : 1,
      };
    } catch (error) {
      console.error('Insert error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Update data
   */
  async update(data: Partial<T>): Promise<DatabaseResult<T>> {
    try {
      if (Object.keys(this.whereConditions).length === 0) {
        return {
          data: null,
          error: new Error('UPDATE requires WHERE conditions for safety'),
        };
      }

      // For updates, we need an ID or primary key
      const id = this.whereConditions.id;
      if (!id) {
        return {
          data: null,
          error: new Error('UPDATE requires an ID in WHERE conditions'),
        };
      }

      const url = `${API_BASE_URL}/api/${this.tableName}/${id}/`;
      const response = await authenticatedFetch(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        data: result,
        error: null,
        count: 1,
      };
    } catch (error) {
      console.error('Update error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Delete data
   */
  async delete(): Promise<DatabaseResult<any>> {
    try {
      if (Object.keys(this.whereConditions).length === 0) {
        return {
          data: null,
          error: new Error('DELETE requires WHERE conditions for safety'),
        };
      }

      // For deletes, we need an ID or primary key
      const id = this.whereConditions.id;
      if (!id) {
        return {
          data: null,
          error: new Error('DELETE requires an ID in WHERE conditions'),
        };
      }

      const url = `${API_BASE_URL}/api/${this.tableName}/${id}/`;
      const response = await authenticatedFetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        data: null,
        error: null,
        count: 1,
      };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }
}

/**
 * Main API client interface - provides database operations
 * Compatible with existing codebase patterns
 */
class APIClient {
  /**
   * Start a query on a table
   */
  from<T extends Record<string, any> = Record<string, any>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  }

  /**
   * Execute custom API call
   */
  async rpc(endpoint: string, params?: Record<string, any>): Promise<DatabaseResult<any>> {
    try {
      const url = `${API_BASE_URL}/api/${endpoint}/`;
      const response = await authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify(params || {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        data: result,
        error: null,
      };
    } catch (error) {
      console.error('RPC error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/test/`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Create and export the main client
export const postgres = new APIClient();

// Export types and classes
export { QueryBuilder, APIClient };