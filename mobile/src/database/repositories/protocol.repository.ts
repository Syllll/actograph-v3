import { BaseRepository, IBaseEntity } from './base.repository';
import { sqliteService } from '../sqlite.service';

export interface IProtocolEntity extends IBaseEntity {
  observation_id: number;
}

export interface IProtocolItemEntity extends IBaseEntity {
  protocol_id: number;
  parent_id: number | null;
  name: string;
  type: 'category' | 'observable';
  color?: string;
  action?: string;
  display_mode?: string;
  background_pattern?: string;
  sort_order: number;
}

export interface IProtocolItemWithChildren extends IProtocolItemEntity {
  children?: IProtocolItemWithChildren[];
}

export class ProtocolRepository extends BaseRepository<IProtocolEntity> {
  protected tableName = 'protocols';

  /**
   * Find protocol by observation ID
   */
  async findByObservationId(observationId: number): Promise<IProtocolEntity | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE observation_id = ?`;
    const results = await sqliteService.query<IProtocolEntity>(sql, [observationId]);
    return results[0] ?? null;
  }

  /**
   * Get protocol items as a tree
   */
  async getProtocolItems(protocolId: number): Promise<IProtocolItemWithChildren[]> {
    const sql = `
      SELECT * FROM protocol_items 
      WHERE protocol_id = ? 
      ORDER BY sort_order ASC, id ASC
    `;
    // SQLite can return columns in different formats, so we use Record<string, unknown>
    const items = await sqliteService.query<Record<string, unknown>>(sql, [protocolId]);

    // Helper function to normalize parent_id values from SQLite
    const normalizeParentId = (parentId: number | null | undefined | string | number): number | null => {
      if (parentId == null || parentId === 0 || parentId === '' || parentId === 'null') {
        return null;
      }
      const numId = Number(parentId);
      return isNaN(numId) ? null : numId;
    };

    // Helper function to map raw SQLite result to IProtocolItemEntity
    const mapItem = (raw: Record<string, unknown>): IProtocolItemEntity | null => {
      // Handle different possible column name formats from SQLite
      const id = raw.id ?? raw.ID ?? raw.Id;
      const protocolId = raw.protocol_id ?? raw.protocolId ?? raw.PROTOCOL_ID;
      const parentId = raw.parent_id ?? raw.parentId ?? raw.PARENT_ID;
      const name = raw.name ?? raw.NAME;
      const type = raw.type ?? raw.TYPE;
      const color = raw.color ?? raw.COLOR;
      const action = raw.action ?? raw.ACTION;
      const displayMode = raw.display_mode ?? raw.displayMode ?? raw.DISPLAY_MODE;
      const backgroundPattern = raw.background_pattern ?? raw.backgroundPattern ?? raw.BACKGROUND_PATTERN;
      const sortOrder = raw.sort_order ?? raw.sortOrder ?? raw.SORT_ORDER ?? 0;
      const createdAt = raw.created_at ?? raw.createdAt ?? raw.CREATED_AT;
      const updatedAt = raw.updated_at ?? raw.updatedAt ?? raw.UPDATED_AT;

      if (!id || !name || !type) {
        console.warn('Invalid protocol item:', raw);
        return null;
      }

      return {
        id: Number(id),
        protocol_id: Number(protocolId),
        parent_id: normalizeParentId(parentId as string | number | null | undefined),
        name: String(name),
        type: String(type) as 'category' | 'observable',
        color: color ? String(color) : undefined,
        action: action ? String(action) : undefined,
        display_mode: displayMode ? String(displayMode) : undefined,
        background_pattern: backgroundPattern ? String(backgroundPattern) : undefined,
        sort_order: Number(sortOrder),
        created_at: createdAt ? String(createdAt) : undefined,
        updated_at: updatedAt ? String(updatedAt) : undefined,
      };
    };

    // Build tree structure
    const itemMap = new Map<number, IProtocolItemWithChildren>();
    const roots: IProtocolItemWithChildren[] = [];

    // First pass: create map and normalize parent_id values
    for (const rawItem of items) {
      const item = mapItem(rawItem);
      if (!item) continue;

      itemMap.set(item.id, { 
        ...item, 
        children: [] 
      });
    }

    // Second pass: build tree using normalized nodes from the map
    for (const node of itemMap.values()) {
      if (node.parent_id == null) {
        // Only add categories as roots, not observables
        if (node.type === 'category') {
          roots.push(node);
        }
      } else {
        const parent = itemMap.get(node.parent_id);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    }

    return roots;
  }

  /**
   * Add a category to protocol
   */
  async addCategory(
    protocolId: number,
    name: string,
    sortOrder = 0,
    action = 'continuous'
  ): Promise<IProtocolItemEntity> {
    const sql = `
      INSERT INTO protocol_items (protocol_id, parent_id, name, type, action, sort_order)
      VALUES (?, NULL, ?, 'category', ?, ?)
    `;
    const result = await sqliteService.run(sql, [protocolId, name, action, sortOrder]);

    const created = await sqliteService.query<IProtocolItemEntity>(
      'SELECT * FROM protocol_items WHERE id = ?',
      [result.lastId]
    );
    return created[0];
  }

  /**
   * Add an observable to a category
   */
  async addObservable(
    protocolId: number,
    parentId: number,
    name: string,
    color?: string,
    sortOrder = 0
  ): Promise<IProtocolItemEntity> {
    const sql = `
      INSERT INTO protocol_items (protocol_id, parent_id, name, type, color, sort_order)
      VALUES (?, ?, ?, 'observable', ?, ?)
    `;
    const result = await sqliteService.run(sql, [protocolId, parentId, name, color, sortOrder]);

    const created = await sqliteService.query<IProtocolItemEntity>(
      'SELECT * FROM protocol_items WHERE id = ?',
      [result.lastId]
    );
    return created[0];
  }

  /**
   * Update protocol item
   */
  async updateItem(
    itemId: number,
    data: Partial<Pick<IProtocolItemEntity, 'name' | 'color' | 'action' | 'display_mode' | 'background_pattern' | 'sort_order'>>
  ): Promise<IProtocolItemEntity | null> {
    const updates = { ...data, updated_at: new Date().toISOString() };
    const columns = Object.keys(updates);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(updates), itemId];

    const sql = `UPDATE protocol_items SET ${setClause} WHERE id = ?`;
    await sqliteService.run(sql, values);

    const updated = await sqliteService.query<IProtocolItemEntity>(
      'SELECT * FROM protocol_items WHERE id = ?',
      [itemId]
    );
    return updated[0] ?? null;
  }

  /**
   * Delete protocol item (and children if category)
   */
  async deleteItem(itemId: number): Promise<boolean> {
    // Delete children first (for categories)
    await sqliteService.run('DELETE FROM protocol_items WHERE parent_id = ?', [itemId]);
    // Delete the item
    const result = await sqliteService.run('DELETE FROM protocol_items WHERE id = ?', [itemId]);
    return result.changes > 0;
  }

  /**
   * Clear all items from protocol
   */
  async clearItems(protocolId: number): Promise<void> {
    await sqliteService.run('DELETE FROM protocol_items WHERE protocol_id = ?', [protocolId]);
  }
}

// Singleton instance
export const protocolRepository = new ProtocolRepository();

