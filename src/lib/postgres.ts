import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Query result interface that matches Supabase's format
interface DatabaseResult<T = any> {
  data: T | null;
  error: Error | null;
  count?: number;
}

// Transaction callback type
type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * PostgreSQL Database Client
 * Replacement for Supabase client with similar interface
 */
class PostgreSQLClient {
  private pool: Pool;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });

    this.isInitialized = true;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T extends Record<string, any> = Record<string, any>>(
    text: string, 
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      throw new Error('Database client not initialized');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query<T>(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query and return in Supabase-compatible format
   */
  async select<T extends Record<string, any> = Record<string, any>>(
    table: string,
    columns = '*',
    whereClause?: string,
    params?: any[]
  ): Promise<DatabaseResult<T[]>> {
    try {
      let query = `SELECT ${columns} FROM ${table}`;
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }

      const result = await this.query<T>(query, params);
      return {
        data: result.rows,
        error: null,
        count: result.rowCount || 0,
      };
    } catch (error) {
      console.error('Select query error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Insert data into a table
   */
  async insert<T extends Record<string, any> = Record<string, any>>(
    table: string,
    data: Record<string, any> | Record<string, any>[]
  ): Promise<DatabaseResult<T | T[]>> {
    try {
      const records = Array.isArray(data) ? data : [data];
      
      if (records.length === 0) {
        return { data: null, error: new Error('No data to insert') };
      }

      const columns = Object.keys(records[0]);
      const placeholders = records
        .map((_, recordIndex) =>
          `(${columns
            .map((_, colIndex) => `$${recordIndex * columns.length + colIndex + 1}`)
            .join(', ')})`
        )
        .join(', ');

      const values = records.flatMap(record => columns.map(col => record[col]));
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
      `;

      const result = await this.query<T>(query, values);
      
      return {
        data: Array.isArray(data) ? result.rows : result.rows[0],
        error: null,
        count: result.rowCount || 0,
      };
    } catch (error) {
      console.error('Insert query error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Update data in a table
   */
  async update<T extends Record<string, any> = Record<string, any>>(
    table: string,
    data: Record<string, any>,
    whereClause: string,
    params?: any[]
  ): Promise<DatabaseResult<T>> {
    try {
      const columns = Object.keys(data);
      const setClause = columns
        .map((col, index) => `${col} = $${index + 1}`)
        .join(', ');
      
      const updateValues = columns.map(col => data[col]);
      const whereParams = params || [];
      
      // Adjust parameter indexes for WHERE clause
      const adjustedWhereClause = whereClause.replace(
        /\$(\d+)/g,
        (_, num) => `$${parseInt(num) + columns.length}`
      );

      const query = `
        UPDATE ${table}
        SET ${setClause}
        WHERE ${adjustedWhereClause}
        RETURNING *
      `;

      const allParams = [...updateValues, ...whereParams];
      const result = await this.query<T>(query, allParams);

      return {
        data: result.rows[0] || null,
        error: null,
        count: result.rowCount || 0,
      };
    } catch (error) {
      console.error('Update query error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Delete data from a table
   */
  async delete(
    table: string,
    whereClause: string,
    params?: any[]
  ): Promise<DatabaseResult<any>> {
    try {
      const query = `DELETE FROM ${table} WHERE ${whereClause}`;
      const result = await this.query(query, params);

      return {
        data: null,
        error: null,
        count: result.rowCount || 0,
      };
    } catch (error) {
      console.error('Delete query error:', error);
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      console.log('Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database connection info
   */
  async getConnectionInfo(): Promise<any> {
    try {
      const result = await this.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as version,
          now() as connected_at
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get connection info:', error);
      return null;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
  }

  /**
   * Get pool status
   */
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Configuration from environment
const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'epsm_local',
    user: process.env.DB_USER || process.env.USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  };
};

// Create and export the database client instance
export const db = new PostgreSQLClient(getDatabaseConfig());

// Export types and classes for use in other modules
export type { DatabaseConfig, DatabaseResult, TransactionCallback };
export { PostgreSQLClient };

// Test connection on initialization (only in development)
if (process.env.NODE_ENV !== 'production') {
  db.testConnection().then(success => {
    if (success) {
      console.log('✅ PostgreSQL database client initialized successfully');
    } else {
      console.error('❌ PostgreSQL database client initialization failed');
    }
  });
}