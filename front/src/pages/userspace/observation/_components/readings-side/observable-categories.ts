import { type IProtocolItem, ProtocolItemTypeEnum } from '@services/observations/interface';
import { resolveGraphColor } from '@services/observations/protocol-graph-preferences.utils';

export interface ObservableCategory {
  id: string;
  name: string;
  color: string;
  names: string[];
}

// Category identity survives renaming and reordering. No preferences are written.
const CATEGORY_COLORS = ['#3077a8', '#8a62ac', '#258979', '#b16a36', '#b34f79', '#737b31'];
const categoryColor = (category: IProtocolItem): string => {
  if (category.graphPreferences?.color) return resolveGraphColor(category.graphPreferences);
  if (!category.id) return '#7a7a7a';
  let hash = 0;
  for (const character of category.id) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
};

export const buildObservableCategories = (items: IProtocolItem[] = []): ObservableCategory[] =>
  items.filter((item) => item.type === ProtocolItemTypeEnum.Category).map((category) => ({
    id: category.id,
    name: category.name,
    color: categoryColor(category),
    names: (category.children ?? []).filter((child) => child.type === ProtocolItemTypeEnum.Observable)
      .map((child) => child.name).filter(Boolean),
  }));

/** A legacy homonym carries no reliable category association. */
export const indexObservableCategories = (groups: ObservableCategory[]): Map<string, ObservableCategory | null> => {
  const index = new Map<string, ObservableCategory | null>();
  for (const group of groups) {
    for (const name of group.names) index.set(name, index.has(name) ? null : group);
  }
  return index;
};

export const filterObservableCategories = (groups: ObservableCategory[], search: string): ObservableCategory[] => {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) return groups;
  return groups.map((group) => ({
    ...group,
    names: group.name.toLocaleLowerCase().includes(needle)
      ? group.names
      : group.names.filter((name) => name.toLocaleLowerCase().includes(needle)),
  })).filter((group) => group.names.length > 0);
};
