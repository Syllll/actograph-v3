import { SoftDeleteRepository, IBaseEntity } from './base.repository';
import { sqliteService } from '../sqlite.service';

export interface IObservationEntity extends IBaseEntity {
  name: string;
  description?: string;
  type: string;
  mode: string;
  /**
   * Métadonnées de disposition persistées avec la chronic (uiScale, ...).
   * Stockées en JSON text en base ; exposées comme objet côté code.
   * Null pour les chroniques créées avant la migration 003 (compat ascendante).
   */
  meta?: Record<string, unknown> | null;
  deleted_at?: string;
}

export interface IObservationWithCounts extends IObservationEntity {
  readings_count: number;
  categories_count: number;
}

export class ObservationRepository extends SoftDeleteRepository<IObservationEntity> {
  protected tableName = 'observations';

  /**
   * Parse la colonne meta (JSON text) en objet. Null/invalid => null.
   */
  private parseMeta(raw: unknown): Record<string, unknown> | null {
    if (!raw || typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Mappe une ligne SQLite brute en IObservationEntity (parse meta).
   */
  private mapObservation<T extends IObservationEntity>(row: T): T {
    return { ...row, meta: this.parseMeta((row as unknown as { meta?: unknown }).meta) };
  }

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
    const rows = await sqliteService.query<IObservationWithCounts>(sql);
    return rows.map((r) => this.mapObservation(r));
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
    const rows = await sqliteService.query<IObservationEntity>(sql, [limit]);
    return rows.map((r) => this.mapObservation(r));
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
    const rows = await sqliteService.query<IObservationEntity>(sql, [`%${query}%`]);
    return rows.map((r) => this.mapObservation(r));
  }

  /**
   * Override create to serialize meta (object -> JSON text) before insert.
   * Note: super.create() appelle this.findById() (notre override) qui reparse
   * le meta en objet -> on ne remappe pas ici.
   */
  override async create(
    data: Omit<IObservationEntity, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<IObservationEntity> {
    const serialized = {
      ...data,
      meta: data.meta ? JSON.stringify(data.meta) : null,
    };
    return super.create(serialized as unknown as Omit<IObservationEntity, 'id' | 'created_at' | 'updated_at'>);
  }

  /**
   * Override update to serialize meta if present.
   * Note: super.update() appelle this.findById() (notre override) qui reparse
   * le meta -> on ne remappe pas ici.
   */
  override async update(
    id: number,
    data: Partial<Omit<IObservationEntity, 'id' | 'created_at'>>,
  ): Promise<IObservationEntity | null> {
    const serialized: Record<string, unknown> = { ...data };
    if (serialized.meta !== undefined) {
      serialized.meta = serialized.meta ? JSON.stringify(serialized.meta) : null;
    }
    return super.update(id, serialized as Partial<Omit<IObservationEntity, 'id' | 'created_at'>>);
  }

  /**
   * Update the observation meta (merge with existing).
   * Used for partial meta updates (e.g. uiScale) without erasing other keys.
   */
  async updateMeta(
    id: number,
    metaPatch: Record<string, unknown>,
  ): Promise<IObservationEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const merged = { ...(current.meta ?? {}), ...metaPatch };
    return this.update(id, { meta: merged });
  }

  /**
   * Override findById to parse meta on read.
   */
  override async findById(id: number): Promise<IObservationEntity | null> {
    const row = await super.findById(id);
    return row ? this.mapObservation(row) : null;
  }

  /**
   * Override findAll to parse meta on read.
   */
  override async findAll(): Promise<IObservationEntity[]> {
    const rows = await super.findAll();
    return rows.map((r) => this.mapObservation(r));
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

