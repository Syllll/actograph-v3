import { BaseRepository, IBaseEntity } from './base.repository';
import { sqliteService } from '../sqlite.service';

export interface IObservationEntity extends IBaseEntity {
  name: string;
  description?: string;
  type: string;
  mode: string;
  deleted_at?: string;
}

export interface IObservationWithCounts extends IObservationEntity {
  readings_count: number;
  categories_count: number;
}

export class ObservationRepository extends BaseRepository<IObservationEntity> {
  protected tableName = 'observations';

  /**
   * Find all observations with counts
   */
  async findAllWithCounts(): Promise<IObservationWithCounts[]> {
    const sql = `
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM readings r WHERE r.observation_id = o.id) as readings_count,
        (SELECT COUNT(*) FROM protocol_items pi 
         JOIN protocols p ON pi.protocol_id = p.id 
         WHERE p.observation_id = o.id AND pi.type = 'category') as categories_count
      FROM observations o
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC
    `;
    return sqliteService.query<IObservationWithCounts>(sql);
  }

  /**
   * Find recent observations
   */
  async findRecent(limit = 5): Promise<IObservationEntity[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE deleted_at IS NULL 
      ORDER BY updated_at DESC 
      LIMIT ?
    `;
    return sqliteService.query<IObservationEntity>(sql, [limit]);
  }

  /**
   * Search observations by name
   */
  async searchByName(query: string): Promise<IObservationEntity[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE deleted_at IS NULL AND name LIKE ?
      ORDER BY created_at DESC
    `;
    return sqliteService.query<IObservationEntity>(sql, [`%${query}%`]);
  }

  /**
   * Create observation with protocol
   */
  async createWithProtocol(
    observation: Omit<IObservationEntity, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IObservationEntity> {
    // Create observation
    const created = await this.create(observation);

    // Create empty protocol
    const protocolSql = 'INSERT INTO protocols (observation_id) VALUES (?)';
    await sqliteService.run(protocolSql, [created.id]);

    return created;
  }
}

// Singleton instance
export const observationRepository = new ObservationRepository();

