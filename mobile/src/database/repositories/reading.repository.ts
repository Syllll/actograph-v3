import { BaseRepository, IBaseEntity } from './base.repository';
import { sqliteService } from '../sqlite.service';

export type ReadingType = 'START' | 'STOP' | 'PAUSE_START' | 'PAUSE_END' | 'DATA';

export interface IReadingEntity extends IBaseEntity {
  observation_id: number;
  type: ReadingType;
  name?: string;
  description?: string;
  date: string;
}

export class ReadingRepository extends BaseRepository<IReadingEntity> {
  protected tableName = 'readings';

  /**
   * Find all readings for an observation
   */
  async findByObservationId(observationId: number): Promise<IReadingEntity[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE observation_id = ? 
      ORDER BY date ASC
    `;
    return sqliteService.query<IReadingEntity>(sql, [observationId]);
  }

  /**
   * Find recent readings for an observation
   */
  async findRecentByObservationId(observationId: number, limit = 10): Promise<IReadingEntity[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE observation_id = ? 
      ORDER BY date DESC 
      LIMIT ?
    `;
    return sqliteService.query<IReadingEntity>(sql, [observationId, limit]);
  }

  /**
   * Count readings for an observation
   */
  async countByObservationId(observationId: number): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE observation_id = ?`;
    const result = await sqliteService.query<{ count: number }>(sql, [observationId]);
    return result[0]?.count ?? 0;
  }

  /**
   * Add a reading
   */
  async addReading(
    observationId: number,
    type: ReadingType,
    date: Date,
    name?: string,
    description?: string
  ): Promise<IReadingEntity> {
    const sql = `
      INSERT INTO ${this.tableName} (observation_id, type, date, name, description)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await sqliteService.run(sql, [
      observationId,
      type,
      date.toISOString(),
      name,
      description,
    ]);

    const created = await sqliteService.query<IReadingEntity>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [result.lastId]
    );
    return created[0];
  }

  /**
   * Add START reading
   */
  async addStart(observationId: number, date = new Date()): Promise<IReadingEntity> {
    return this.addReading(observationId, 'START', date);
  }

  /**
   * Add STOP reading
   */
  async addStop(observationId: number, date = new Date()): Promise<IReadingEntity> {
    return this.addReading(observationId, 'STOP', date);
  }

  /**
   * Add PAUSE_START reading
   */
  async addPauseStart(observationId: number, date = new Date()): Promise<IReadingEntity> {
    return this.addReading(observationId, 'PAUSE_START', date);
  }

  /**
   * Add PAUSE_END reading
   */
  async addPauseEnd(observationId: number, date = new Date()): Promise<IReadingEntity> {
    return this.addReading(observationId, 'PAUSE_END', date);
  }

  /**
   * Add DATA reading (observable toggle)
   */
  async addData(
    observationId: number,
    name: string,
    date = new Date(),
    description?: string
  ): Promise<IReadingEntity> {
    return this.addReading(observationId, 'DATA', date, name, description);
  }

  /**
   * Delete all readings for an observation
   */
  async deleteByObservationId(observationId: number): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE observation_id = ?`;
    const result = await sqliteService.run(sql, [observationId]);
    return result.changes;
  }

  /**
   * Get the last reading for an observation
   */
  async getLastReading(observationId: number): Promise<IReadingEntity | null> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE observation_id = ? 
      ORDER BY date DESC 
      LIMIT 1
    `;
    const results = await sqliteService.query<IReadingEntity>(sql, [observationId]);
    return results[0] ?? null;
  }

  /**
   * Check if observation has START reading
   */
  async hasStartReading(observationId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE observation_id = ? AND type = 'START'
    `;
    const result = await sqliteService.query<{ count: number }>(sql, [observationId]);
    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Check if observation has STOP reading
   */
  async hasStopReading(observationId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE observation_id = ? AND type = 'STOP'
    `;
    const result = await sqliteService.query<{ count: number }>(sql, [observationId]);
    return (result[0]?.count ?? 0) > 0;
  }
}

// Singleton instance
export const readingRepository = new ReadingRepository();

