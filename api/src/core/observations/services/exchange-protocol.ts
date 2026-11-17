import { randomUUID } from 'node:crypto';
import { ProtocolItem } from '../entities/protocol.entity';

export const flattenProtocol = (items: ProtocolItem[]): ProtocolItem[] =>
  items.flatMap((item) => [item, ...flattenProtocol(item.children ?? [])]);

/**
 * Matches only unambiguous names within the same parent. Incoming duplicate
 * names remain distinct items. Existing items are never renamed by an import.
 */
export function prepareExchangeProtocol(
  existing: ProtocolItem[],
  incoming: ProtocolItem[],
  mode: 'add' | 'replace',
): { items: ProtocolItem[]; added: number } {
  const references = new Map<string, string>();
  const preserved = new Set<ProtocolItem>();
  let added = 0;

  const merge = (
    oldItems: ProtocolItem[],
    newItems: ProtocolItem[],
  ): ProtocolItem[] => {
    const output: ProtocolItem[] =
      mode === 'add' ? structuredCopy(oldItems) : [];
    flattenProtocol(output).forEach((item) => preserved.add(item));
    for (const source of newItems) {
      const candidates = oldItems.filter(
        (item) => item.type === source.type && item.name === source.name,
      );
      const sameNames = newItems.filter(
        (item) => item.type === source.type && item.name === source.name,
      );
      const match =
        candidates.length === 1 && sameNames.length === 1
          ? candidates[0]
          : undefined;
      const id = match?.id ?? randomUUID();
      references.set(source.id, id);
      if (match && mode === 'add') {
        const target = output.find((item) => item.id === match.id)!;
        if (source.children)
          target.children = merge(match.children ?? [], source.children);
        continue;
      }

      const item: ProtocolItem = {
        type: source.type,
        id,
        name: source.name,
        ...(source.description !== undefined
          ? { description: source.description }
          : {}),
        ...(source.action !== undefined ? { action: source.action } : {}),
        ...(source.order !== undefined ? { order: source.order } : {}),
        ...(source.meta !== undefined
          ? { meta: structuredCopy(source.meta) }
          : {}),
      };
      if (match) {
        // Omission means inheritance. Preserve that omission too, even if the
        // imported file contains explicit preferences for the matched item.
        if (match.graphPreferences !== undefined)
          item.graphPreferences = structuredCopy(match.graphPreferences);
        preserved.add(item);
      } else {
        added += 1;
        if (source.graphPreferences !== undefined)
          item.graphPreferences = structuredCopy(source.graphPreferences);
      }
      if (source.children !== undefined)
        item.children = merge(match?.children ?? [], source.children);
      output.push(item);
    }
    return output;
  };

  const items = merge(existing, incoming);
  for (const item of flattenProtocol(items)) {
    if (preserved.has(item)) continue;
    const supportId = item.graphPreferences?.supportCategoryId;
    // The map only contains exchange references, never imported database IDs.
    if (supportId && references.has(supportId)) {
      item.graphPreferences!.supportCategoryId = references.get(supportId)!;
    }
  }
  return { items, added };
}

function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
