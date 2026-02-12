import { sqliteService } from '../sqlite.service';

export interface IBaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export abstract class BaseRepository<T extends IBaseEntity> {
  protected abstract tableName: string;

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
    return sqliteService.query<T>(sql);
  }

  /**
   * Find entity by ID
   */
  async findById(id: number): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const results = await sqliteService.query<T>(sql, [id]);
    return results[0] ?? null;
  }

  /**
   * Create a new entity
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await sqliteService.run(sql, values);

    const created = await this.findById(result.lastId);
    if (!created) {
      throw new Error('Failed to create entity');
    }
    return created;
  }

  /**
   * Update an entity
   */
  async update(id: number, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
    const updates = { ...data, updated_at: new Date().toISOString() };
    const columns = Object.keys(updates);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await sqliteService.run(sql, values);

    return this.findById(id);
  }

  /**
   * Delete an entity (hard delete)
   */
  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await sqliteService.run(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Count all entities
   */
  async count(): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const result = await sqliteService.query<{ count: number }>(sql);
    return result[0]?.count ?? 0;
  }
}

/**
 * Repository for tables with soft delete (deleted_at column).
 * Extends BaseRepository and overrides find/delete/count to filter by deleted_at.
 */
export class SoftDeleteRepository<T extends IBaseEntity> extends BaseRepository<T> {
  /**
   * Find all non-deleted entities
   */
  override async findAll(): Promise<T[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return sqliteService.query<T>(sql);
  }

  /**
   * Find entity by ID (only if not deleted)
   */
  override async findById(id: number): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`;
    const results = await sqliteService.query<T>(sql, [id]);
    return results[0] ?? null;
  }

  /**
   * Count non-deleted entities
   */
  override async count(): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`;
    const result = await sqliteService.query<{ count: number }>(sql);
    return result[0]?.count ?? 0;
  }

  /**
   * Soft delete an entity
   */
  override async delete(id: number): Promise<boolean> {
    const sql = `UPDATE ${this.tableName} SET deleted_at = datetime('now') WHERE id = ?`;
    const result = await sqliteService.run(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Hard delete an entity (permanent removal)
   */
  async hardDelete(id: number): Promise<boolean> {
    return super.delete(id);
  }
}

