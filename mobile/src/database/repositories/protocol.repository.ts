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
    meta?: Record<string, unknown> | null,
    color?: string,
  ): Promise<IProtocolItemEntity> {
    // Sérialiser meta en JSON si présent
    const metaJson = meta ? JSON.stringify(meta) : null;
    
    const sql = `
      INSERT INTO protocol_items (protocol_id, parent_id, name, type, action, color, sort_order, meta)
      VALUES (?, NULL, ?, 'category', ?, ?, ?, ?)
    `;
    const result = await sqliteService.run(sql, [protocolId, name, action, color ?? null, sortOrder, metaJson]);

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
    sortOrder = 0,
    action?: string,
  ): Promise<IProtocolItemEntity> {
    name = name.trim();
    await this.assertObservableNameAvailable(protocolId, name);
    const sql = `
      INSERT INTO protocol_items (protocol_id, parent_id, name, type, color, action, sort_order)
      VALUES (?, ?, ?, 'observable', ?, ?, ?)
    `;
    const result = await sqliteService.run(sql, [
      protocolId,
      parentId,
      name,
      color ?? null,
      action ?? null,
      sortOrder,
    ]);

    const created = await sqliteService.query<Record<string, unknown>>(
      'SELECT * FROM protocol_items WHERE id = ?',
      [result.lastId]
    );

    if (!created[0]) {
      throw new Error('Failed to retrieve created observable');
    }

    const mapped = this.mapItem(created[0]);
    if (!mapped) {
      throw new Error('Failed to map created observable');
    }

    return mapped;
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
    const currentRows = await sqliteService.query<Record<string, unknown>>(
      'SELECT * FROM protocol_items WHERE id = ?', [itemId]
    );
    const current = currentRows[0] ? this.mapItem(currentRows[0]) : null;
    if (!current) return null;
    if (data.name !== undefined) {
      data = { ...data, name: data.name.trim() };
      if (!data.name) throw new Error('Le nom est requis');
      if (current.type === 'observable') {
        await this.assertObservableNameAvailable(current.protocol_id, data.name, itemId);
      }
    }
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (data.meta !== undefined) {
      updates.meta = data.meta ? JSON.stringify(data.meta) : null;
    }

    const columns = Object.keys(updates);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(updates), itemId];

    const sql = `UPDATE protocol_items SET ${setClause} WHERE id = ?`;
    const statements = [{ statement: sql, values }];
    if (current.type === 'observable' && data.name !== undefined && data.name !== current.name) {
      const sameName = await sqliteService.query<{ id: number }>(
        "SELECT id FROM protocol_items WHERE protocol_id = ? AND type = 'observable' AND name = ? AND id != ?",
        [current.protocol_id, current.name, itemId]
      );
      if (sameName.length) throw new Error('Ce nom est ambigu dans le protocole. Les relevés ne peuvent pas être renommés sans ambiguïté.');
      statements.push({
        statement: "UPDATE readings SET name = ? WHERE type = 'DATA' AND name = ? AND observation_id = (SELECT observation_id FROM protocols WHERE id = ?)",
        values: [data.name, current.name, current.protocol_id],
      });
    }
    await sqliteService.executeTransaction(statements);

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
    const used = await sqliteService.query<{ id: number }>(
      `SELECT r.id FROM readings r JOIN protocols p ON p.observation_id = r.observation_id
       JOIN protocol_items i ON i.protocol_id = p.id AND i.name = r.name AND i.type = 'observable'
       WHERE r.type = 'DATA' AND (i.id = ? OR i.parent_id = ?) LIMIT 1`, [itemId, itemId]
    );
    if (used.length) throw new Error('Cet élément contient des relevés. Dupliquez la chronique sans relevés pour modifier son protocole.');
    await sqliteService.executeTransaction([
      { statement: 'DELETE FROM protocol_items WHERE parent_id = ?', values: [itemId] },
      { statement: 'DELETE FROM protocol_items WHERE id = ?', values: [itemId] },
    ]);
    return true;
  }

  private async assertObservableNameAvailable(protocolId: number, name: string, exceptId?: number): Promise<void> {
    if (!name || name.startsWith('#')) throw new Error('Le nom doit être renseigné et ne doit pas commencer par # (réservé aux commentaires).');
    const items = await sqliteService.query<{ id: number; name: string }>(
      "SELECT id, name FROM protocol_items WHERE protocol_id = ? AND type = 'observable'", [protocolId]
    );
    if (items.some((item) => item.id !== exceptId && item.name.trim().toLowerCase() === name.toLowerCase())) {
      throw new Error('Un observable avec ce nom existe déjà dans le protocole.');
    }
  }

  /** Commit a complete protocol draft and its reading renames atomically. */
  async saveDraft(observationId: number, categories: IProtocolItemWithChildren[], uiScale: number): Promise<void> {
    const protocol = await this.findByObservationId(observationId);
    if (!protocol) throw new Error('Protocole introuvable');
    const current = await this.getProtocolItems(protocol.id);
    const before = current.flatMap((category) => [category, ...(category.children ?? [])]);
    const after = categories.flatMap((category) => [category, ...(category.children ?? [])]);
    const categoryNames = new Set<string>();
    const ids = new Set<number>();
    for (const category of categories) {
      const name = category.name.trim().toLowerCase();
      if (!name || categoryNames.has(name)) throw new Error('Chaque catégorie doit avoir un nom renseigné et unique.');
      categoryNames.add(name);
      if (category.type !== 'category' || category.children?.some((child) => child.type !== 'observable' || child.parent_id !== category.id)) {
        throw new Error('Structure du protocole invalide.');
      }
    }
    for (const item of after) {
      if (ids.has(item.id) || item.id === 0 || (item.id > 0 && !before.some((old) => old.id === item.id && old.type === item.type))) {
        throw new Error('Identifiant de protocole invalide.');
      }
      ids.add(item.id);
    }
    const names = new Set<string>();
    for (const item of after.filter((item) => item.type === 'observable')) {
      const name = item.name.trim().toLowerCase();
      if (!name || name.startsWith('#')) throw new Error('Un nom d’observable est vide ou commence par #.');
      if (names.has(name)) throw new Error('Chaque observable doit avoir un nom unique dans le protocole.');
      names.add(name);
    }
    const readings = await sqliteService.query<{ name: string }>(
      "SELECT DISTINCT name FROM readings WHERE observation_id = ? AND type = 'DATA'", [observationId]
    );
    const usedNames = new Set(readings.map((reading) => reading.name));
    const remainingIds = new Set(after.map((item) => item.id));
    for (const item of before.filter((item) => item.type === 'observable')) {
      if (!remainingIds.has(item.id) && usedNames.has(item.name)) {
        throw new Error('Un observable supprimé contient des relevés. Dupliquez la chronique sans relevés pour le supprimer.');
      }
    }
    const statements: { statement: string; values?: unknown[] }[] = [];
    const renamed = before.filter((item) => item.type === 'observable').flatMap((item) => {
      const next = after.find((candidate) => candidate.id === item.id);
      return next && next.name !== item.name ? [{ oldName: item.name, newName: next.name.trim() }] : [];
    });
    for (const rename of renamed) {
      if (usedNames.has(rename.oldName) && before.filter((item) => item.type === 'observable' && item.name === rename.oldName).length > 1) {
        throw new Error('Des relevés utilisent un nom ambigu : impossible de les réattribuer automatiquement.');
      }
    }
    if (renamed.length) {
      statements.push({
        statement: `UPDATE readings SET name = CASE name ${renamed.map(() => 'WHEN ? THEN ?').join(' ')} ELSE name END WHERE observation_id = ? AND type = 'DATA'`,
        values: [...renamed.flatMap((rename) => [rename.oldName, rename.newName]), observationId],
      });
    }
    // Remove only unused items, children before parents.
    for (const item of [...before].reverse().filter((item) => !remainingIds.has(item.id))) {
      statements.push({ statement: 'DELETE FROM protocol_items WHERE id = ?', values: [item.id] });
    }
    // Existing IDs remain stable. New children resolve their parent within this transaction.
    // Resolve final category names before inserting children (including category name swaps).
    const orderedItems = [
      ...categories.map((category) => ({ category, item: category })),
      ...categories.flatMap((category) => (category.children ?? []).map((item) => ({ category, item }))),
    ];
    for (const { category, item } of orderedItems) {
      const data = [item.name.trim(), item.action ?? null, item.color ?? null, item.display_mode ?? null,
        item.background_pattern ?? null, item.sort_order, item.meta ? JSON.stringify(item.meta) : null];
      if (item.id > 0) {
        statements.push({
          statement: "UPDATE protocol_items SET name = ?, action = ?, color = ?, display_mode = ?, background_pattern = ?, sort_order = ?, meta = ?, updated_at = datetime('now') WHERE id = ? AND protocol_id = ?",
          values: [...data, item.id, protocol.id],
        });
      } else {
        statements.push({
          statement: `INSERT INTO protocol_items (name, action, color, display_mode, background_pattern, sort_order, meta, protocol_id, type, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${item.type === 'category' ? 'NULL' : "(SELECT id FROM protocol_items WHERE protocol_id = ? AND type = 'category' AND name = ?)"})`,
          values: [...data, protocol.id, item.type, ...(item.type === 'category' ? [] : [protocol.id, category.name.trim()])],
        });
      }
    }
    const observations = await sqliteService.query<{ meta: string | null }>('SELECT meta FROM observations WHERE id = ?', [observationId]);
    const meta = observations[0]?.meta ? JSON.parse(observations[0].meta) : {};
    statements.push({ statement: 'UPDATE observations SET meta = ? WHERE id = ?', values: [JSON.stringify({ ...meta, uiScale }), observationId] });
    await sqliteService.executeTransaction(statements);
  }

  /**
   * Récupère et parse le meta actuel d'un item, sans écraser les autres champs.
   * Utilisé par les mises à jour partielles du meta (position, size, ...).
   */
  private async readItemMeta(categoryId: number): Promise<Record<string, unknown> | null> {
    const current = await sqliteService.query<Record<string, unknown>>(
      'SELECT meta FROM protocol_items WHERE id = ?',
      [categoryId]
    );

    if (!current[0]) return null;

    let existingMeta: Record<string, unknown> = {};
    if (current[0].meta && typeof current[0].meta === 'string') {
      try {
        existingMeta = JSON.parse(current[0].meta);
      } catch {
        existingMeta = {};
      }
    }
    return existingMeta;
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
    const existingMeta = await this.readItemMeta(categoryId);
    if (existingMeta === null) return null;

    const newMeta = { ...existingMeta, position };
    return this.updateItem(categoryId, { meta: newMeta });
  }

  /**
   * Update the size (width) of a category.
   * 
   * Persiste la largeur dans meta.size.width sans écraser le reste du meta.
   * La hauteur n'est pas stockée : elle découle du contenu (reflow).
   * 
   * @param categoryId - ID de la catégorie
   * @param size - Nouvelle taille { width: number }
   */
  async updateCategorySize(
    categoryId: number,
    size: { width: number }
  ): Promise<IProtocolItemEntity | null> {
    const existingMeta = await this.readItemMeta(categoryId);
    if (existingMeta === null) return null;

    const newMeta = { ...existingMeta, size };
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

