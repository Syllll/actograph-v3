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
const categoryHash = (id: string): number => {
  let hash = 0;
  for (const character of id) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return hash;
};

const colorKey = (color: string): string => {
  const normalizedColor = color.trim().toLocaleLowerCase();
  const rgb = normalizedColor.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  const rgba = normalizedColor.match(/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d+(?:\.\d+)?)\s*\)$/);
  if (rgba && Number(rgba[4]) !== 1) return normalizedColor;
  const channels = rgb ?? rgba;
  if (!channels) return normalizedColor;

  return `#${channels.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`;
};

const automaticCategoryColor = (id: string, allocationIndex: number, usedColors: Set<string>): string => {
  const hash = categoryHash(id);
  for (let offset = 0; offset < CATEGORY_COLORS.length; offset += 1) {
    const color = CATEGORY_COLORS[(hash + offset) % CATEGORY_COLORS.length];
    if (!usedColors.has(colorKey(color))) return color;
  }

  // Golden-angle hues provide deterministic fallbacks after every palette color is used.
  for (let attempt = 0; ; attempt += 1) {
    const hue = ((allocationIndex + attempt) * 137.508) % 360;
    const color = `hsl(${hue.toFixed(3)} 55% 45%)`;
    if (!usedColors.has(colorKey(color))) return color;
  }
};

export const buildObservableCategories = (items: IProtocolItem[] = []): ObservableCategory[] => {
  const categories = items.filter((item) => item.type === ProtocolItemTypeEnum.Category);
  const usedColors = new Set<string>();
  const colors = new Map<IProtocolItem, string>();

  // Keep user colors, and reserve them before assigning any automatic color.
  for (const category of categories) {
    if (category.graphPreferences?.color) {
      const color = resolveGraphColor(category.graphPreferences);
      colors.set(category, color);
      usedColors.add(colorKey(color));
    } else if (!category.id) {
      colors.set(category, '#7a7a7a');
    }
  }

  // Sorting by stable identity keeps generated colors independent of display order and names.
  const automaticCategories = categories
    .filter((category) => category.id && !colors.has(category))
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const [allocationIndex, category] of automaticCategories.entries()) {
    const color = automaticCategoryColor(category.id, allocationIndex, usedColors);
    colors.set(category, color);
    usedColors.add(colorKey(color));
  }

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: colors.get(category) ?? '#7a7a7a',
    names: (category.children ?? []).filter((child) => child.type === ProtocolItemTypeEnum.Observable)
      .map((child) => child.name).filter(Boolean),
  }));
};

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
