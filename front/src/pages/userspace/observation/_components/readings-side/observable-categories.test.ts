import { ProtocolItemTypeEnum, type IProtocolItem } from '@services/observations/interface';
import { buildObservableCategories, filterObservableCategories, indexObservableCategories } from './observable-categories';

const category = (id: string, name: string, names: string[], color?: string): IProtocolItem => ({
  id, name, type: ProtocolItemTypeEnum.Category, graphPreferences: color ? { color } : undefined,
  children: names.map((child, index) => ({ id: `${id}-${index}`, name: child, type: ProtocolItemTypeEnum.Observable })),
});

it('uses category graphic preferences and stable fallback colors without mutating the protocol', () => {
  const items = [category('first', 'Activity', ['Walking']), category('second', 'Context', ['Outside'], '#123456')];
  const before = JSON.stringify(items);
  const initial = buildObservableCategories(items);
  expect(initial[1].color).toBe('#123456');
  const reordered = buildObservableCategories([{ ...items[1], name: 'Renamed context' }, { ...items[0], name: 'Renamed activity' }]);
  expect(reordered[1].color).toBe(initial[0].color);
  expect(JSON.stringify(items)).toBe(before);
});

it('assigns distinct automatic colors by stable id, even when the palette is exceeded', () => {
  const items = ['a', 'g', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'].map((id) => category(id, id, []));
  const initial = buildObservableCategories(items);
  const colorsById = new Map(initial.map(({ id, color }) => [id, color]));

  expect(initial.find(({ id }) => id === 'a')?.color).not.toBe(initial.find(({ id }) => id === 'g')?.color);
  expect(new Set(initial.map(({ color }) => color)).size).toBe(items.length);

  const reorderedAndRenamed = buildObservableCategories([...items].reverse().map((item) => ({ ...item, name: `Renamed ${item.name}` })));
  expect(new Map(reorderedAndRenamed.map(({ id, color }) => [id, color]))).toEqual(colorsById);
});

it('spaces fallback hues for consecutive category ids', () => {
  const groups = buildObservableCategories(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => category(id, id, [])));
  const hues = groups.slice(-2).map(({ color }) => Number(color.match(/^hsl\((\d+(?:\.\d+)?) 55% 45%\)$/)?.[1]));
  const hueDistance = Math.min(Math.abs(hues[0] - hues[1]), 360 - Math.abs(hues[0] - hues[1]));

  expect(hues.every(Number.isFinite)).toBe(true);
  expect(hueDistance).toBeGreaterThan(100);
});

it('reserves explicit colors before assigning automatic colors', () => {
  const explicit = category('a', 'Explicit', [], '#8a62ac');
  const automatic = category('g', 'Automatic', []);
  const groups = buildObservableCategories([automatic, explicit]);

  expect(groups.find(({ id }) => id === 'a')?.color).toBe('#8a62ac');
  expect(groups.find(({ id }) => id === 'g')?.color).not.toBe('#8a62ac');
});

it('keeps categories without an id neutral without reserving an automatic color', () => {
  const groups = buildObservableCategories([category('', 'Legacy', []), category('a', 'Identified', [])]);

  expect(groups[0].color).toBe('#7a7a7a');
  expect(groups[1].color).toBe('#8a62ac');
});

it('uses another palette color when an explicit RGB color matches the preferred hex color', () => {
  const explicit = category('a', 'Explicit', [], 'rgb(138, 98, 172)');
  const automatic = category('g', 'Automatic', []);
  const groups = buildObservableCategories([explicit, automatic]);

  expect(groups[0].color).toBe('rgb(138, 98, 172)');
  expect(groups[1].color).toBe('#258979');
});

it('reserves opaque RGBA colors as hex equivalents and keeps transparent RGBA distinct', () => {
  const opaqueGroups = buildObservableCategories([
    category('a', 'Explicit', [], 'rgba(138, 98, 172, 1.0)'),
    category('g', 'Automatic', []),
  ]);
  const transparentGroups = buildObservableCategories([
    category('a', 'Transparent', [], 'rgba(138, 98, 172, 0.5)'),
    category('g', 'Automatic', []),
  ]);

  expect(opaqueGroups[1].color).toBe('#258979');
  expect(transparentGroups[1].color).toBe('#8a62ac');
});

it('keeps legacy homonyms neutral and includes empty categories in the picker', () => {
  const groups = buildObservableCategories([category('a', 'First', ['Same', 'Unique']), category('b', 'Second', ['Same']), category('c', 'Empty', [])]);
  const index = indexObservableCategories(groups);
  expect(index.has('Same')).toBe(true);
  expect(index.get('Same')).toBeNull();
  expect(index.get('Unique')?.id).toBe('a');
  expect(groups[2].names).toEqual([]);
});

it('filters observable names or a whole category without changing protocol order', () => {
  const groups = buildObservableCategories([category('a', 'Activity', ['Walking', 'Sitting']), category('b', 'Context', ['Outside'])]);
  expect(filterObservableCategories(groups, 'walk').map((group) => group.names)).toEqual([['Walking']]);
  expect(filterObservableCategories(groups, 'ACTIVITY').map((group) => group.names)).toEqual([['Walking', 'Sitting']]);
  expect(filterObservableCategories(groups, 'unknown')).toEqual([]);
  expect(groups[0].names).toEqual(['Walking', 'Sitting']);
});
