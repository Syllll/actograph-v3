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
