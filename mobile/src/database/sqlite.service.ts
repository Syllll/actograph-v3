import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'actograph_mobile';

class SQLiteService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;
  private platform: string;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.platform = Capacitor.getPlatform();
  }

  /**
   * Initialize the SQLite database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if running on web
      if (this.platform === 'web') {
        // For web, we need to use the jeep-sqlite web component
        const jeepSqliteEl = document.querySelector('jeep-sqlite');
        if (jeepSqliteEl) {
          await customElements.whenDefined('jeep-sqlite');
          await this.sqlite.initWebStore();
        }
      }

      // Create or open the database
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConnection = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (ret.result && isConnection) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();

      // Run migrations
      await this.runMigrations();

      this.initialized = true;
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  /**
   * Get the database connection
   */
  getConnection(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Check current version
    const versionResult = await this.db.query('PRAGMA user_version');
    const currentVersion = versionResult.values?.[0]?.user_version ?? 0;

    // Migration 1: Initial schema
    if (currentVersion < 1) {
      await this.migration_001_initial_schema();
      await this.db.execute('PRAGMA user_version = 1');
    }

    console.log('Database migrations completed. Current version: 1');
  }

  /**
   * Migration 001: Initial schema
   */
  private async migration_001_initial_schema(): Promise<void> {
    if (!this.db) return;

    const schema = `
      -- Observations table
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'Normal',
        mode TEXT DEFAULT 'Chronometer',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT
      );

      -- Protocols table
      CREATE TABLE IF NOT EXISTS protocols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
      );

      -- Protocol items table (categories and observables)
      CREATE TABLE IF NOT EXISTS protocol_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol_id INTEGER NOT NULL,
        parent_id INTEGER,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('category', 'observable')),
        color TEXT,
        action TEXT,
        display_mode TEXT,
        background_pattern TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES protocol_items(id) ON DELETE CASCADE
      );

      -- Readings table
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('START', 'STOP', 'PAUSE_START', 'PAUSE_END', 'DATA')),
        name TEXT,
        description TEXT,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_observations_name ON observations(name);
      CREATE INDEX IF NOT EXISTS idx_observations_created_at ON observations(created_at);
      CREATE INDEX IF NOT EXISTS idx_protocol_items_protocol_id ON protocol_items(protocol_id);
      CREATE INDEX IF NOT EXISTS idx_protocol_items_parent_id ON protocol_items(parent_id);
      CREATE INDEX IF NOT EXISTS idx_readings_observation_id ON readings(observation_id);
      CREATE INDEX IF NOT EXISTS idx_readings_date ON readings(date);
    `;

    await this.db.execute(schema);
    console.log('Migration 001: Initial schema created');
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      await this.sqlite.closeConnection(DB_NAME, false);
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Execute a query and return results
   */
  async query<T = unknown>(sql: string, values?: unknown[]): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.query(sql, values);
    return (result.values ?? []) as T[];
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, values?: unknown[]): Promise<{ changes: number; lastId: number }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.run(sql, values);
    return {
      changes: result.changes?.changes ?? 0,
      lastId: result.changes?.lastId ?? 0,
    };
  }

  /**
   * Execute multiple statements in a transaction
   */
  async executeTransaction(statements: { statement: string; values?: unknown[] }[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.executeSet(statements);
  }

  /**
   * Clear all data from all tables
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Delete in order respecting foreign key constraints
    await this.db.execute('DELETE FROM readings');
    await this.db.execute('DELETE FROM protocol_items');
    await this.db.execute('DELETE FROM protocols');
    await this.db.execute('DELETE FROM observations');

    console.log('All data cleared from database');
  }
}

// Singleton instance
export const sqliteService = new SQLiteService();

