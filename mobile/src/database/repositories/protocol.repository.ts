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
  meta?: Record<string, unknown> | null;
}

export interface IProtocolItemWithChildren extends IProtocolItemEntity {
  children?: IProtocolItemWithChildren[];
}

export class ProtocolRepository extends BaseRepository<IProtocolEntity> {
  protected tableName = 'protocols';

  /**
   * Helper function to normalize parent_id values from SQLite
   */
  private normalizeParentId(parentId: number | null | undefined | string | number): number | null {
    if (parentId == null || parentId === 0 || parentId === '' || parentId === 'null') {
      return null;
    }
    const numId = Number(parentId);
    return isNaN(numId) ? null : numId;
  }

  /**
   * Helper function to map raw SQLite result to IProtocolItemEntity
   */
  private mapItem(raw: Record<string, unknown>): IProtocolItemEntity | null {
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
      
      // Récupérer le champ meta (peut être sous différents formats selon SQLite)
      const metaRaw = raw.meta ?? raw.META;

      // Parser le JSON meta si présent
      let meta: Record<string, unknown> | null = null;
      if (metaRaw && typeof metaRaw === 'string') {
        try {
          meta = JSON.parse(metaRaw);
        } catch (e) {
          console.warn('Failed to parse meta JSON:', metaRaw);
          meta = null;
        }
      }

      if (!id || !name || !type) {
        console.warn('Invalid protocol item:', raw);
        return null;
      }

      return {
        id: Number(id),
        protocol_id: Number(protocolId),
        parent_id: this.normalizeParentId(parentId as string | number | null | undefined),
        name: String(name),
        type: String(type) as 'category' | 'observable',
        color: color ? String(color) : undefined,
        action: action ? String(action) : undefined,
        display_mode: displayMode ? String(displayMode) : undefined,
        background_pattern: backgroundPattern ? String(backgroundPattern) : undefined,
        sort_order: Number(sortOrder),
        created_at: createdAt ? String(createdAt) : undefined,
        updated_at: updatedAt ? String(updatedAt) : undefined,
        meta,
      };
  }

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

    // Build tree structure
    const itemMap = new Map<number, IProtocolItemWithChildren>();
    const roots: IProtocolItemWithChildren[] = [];

    // First pass: create map and normalize parent_id values
    for (const rawItem of items) {
      const item = this.mapItem(rawItem);
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
   * 
   * @param protocolId - ID du protocole parent
   * @param name - Nom de la catégorie
   * @param sortOrder - Ordre d'affichage (default: 0)
   * @param action - Type d'action: 'continuous' | 'discrete' (default: 'continuous')
   * @param meta - Métadonnées optionnelles (ex: { position: { x, y } })
   */
  async addCategory(
    protocolId: number,
    name: string,
    sortOrder = 0,
    action = 'continuous',
    meta?: Record<string, unknown> | null
  ): Promise<IProtocolItemEntity> {
    // Sérialiser meta en JSON si présent
    const metaJson = meta ? JSON.stringify(meta) : null;
    
    const sql = `
      INSERT INTO protocol_items (protocol_id, parent_id, name, type, action, sort_order, meta)
      VALUES (?, NULL, ?, 'category', ?, ?, ?)
    `;
    const result = await sqliteService.run(sql, [protocolId, name, action, sortOrder, metaJson]);

    const created = await sqliteService.query<Record<string, unknown>>(
      'SELECT * FROM protocol_items WHERE id = ?',
      [result.lastId]
    );
    
    if (!created[0]) {
      throw new Error('Failed to retrieve created category');
    }
    
    const mapped = this.mapItem(created[0]);
    if (!mapped) {
      throw new Error('Failed to map created category');
    }
    
    return mapped;
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
   * 
   * @param itemId - ID de l'item à mettre à jour
   * @param data - Données à mettre à jour (partielles)
   */
  async updateItem(
    itemId: number,
    data: Partial<Pick<IProtocolItemEntity, 'name' | 'color' | 'action' | 'display_mode' | 'background_pattern' | 'sort_order' | 'meta'>>
  ): Promise<IProtocolItemEntity | null> {
    // Préparer les mises à jour
    const updates: Record<string, unknown> = { 
      ...data, 
      updated_at: new Date().toISOString() 
    };
    
    // Sérialiser meta en JSON si présent
    if (data.meta !== undefined) {
      updates.meta = data.meta ? JSON.stringify(data.meta) : null;
    }
    
    const columns = Object.keys(updates);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(updates), itemId];

    const sql = `UPDATE protocol_items SET ${setClause} WHERE id = ?`;
    await sqliteService.run(sql, values);

    const updated = await sqliteService.query<Record<string, unknown>>(
      'SELECT * FROM protocol_items WHERE id = ?',
      [itemId]
    );
    
    if (!updated[0]) return null;
    
    return this.mapItem(updated[0]);
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
   * Update the position of a category
   * 
   * Cette méthode met à jour uniquement le champ meta.position
   * sans écraser les autres métadonnées.
   * 
   * @param categoryId - ID de la catégorie
   * @param position - Nouvelle position { x: number, y: number }
   */
  async updateCategoryPosition(
    categoryId: number,
    position: { x: number; y: number }
  ): Promise<IProtocolItemEntity | null> {
    // Récupérer l'item actuel pour préserver les autres meta
    const current = await sqliteService.query<Record<string, unknown>>(
      'SELECT meta FROM protocol_items WHERE id = ?',
      [categoryId]
    );
    
    if (!current[0]) return null;
    
    // Parser l'ancien meta
    let existingMeta: Record<string, unknown> = {};
    if (current[0].meta && typeof current[0].meta === 'string') {
      try {
        existingMeta = JSON.parse(current[0].meta);
      } catch {
        existingMeta = {};
      }
    }
    
    // Merger avec la nouvelle position
    const newMeta = {
      ...existingMeta,
      position,
    };
    
    return this.updateItem(categoryId, { meta: newMeta });
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

