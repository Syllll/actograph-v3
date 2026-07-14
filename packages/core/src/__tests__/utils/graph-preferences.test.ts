import {
  DEFAULT_GRAPH_COLOR,
  mergeGraphPreferences,
  resolveGraphColor,
  normalizeProtocolItemAction,
  portableizeGraphPreferencesForExport,
  resolvePortableGraphPreferencesOnImport,
} from '../../utils/graph-preferences';
import { ProtocolItemActionEnum } from '../../enums';

describe('graph-preferences utils', () => {
  describe('mergeGraphPreferences', () => {
    it('fusionne la couleur de catégorie avec les prefs partielles de l\'observable', () => {
      const merged = mergeGraphPreferences(
        { color: '#ff0000', strokeWidth: 2 },
        { strokeWidth: 4 },
      );

      expect(merged).toEqual({
        color: '#ff0000',
        strokeWidth: 4,
      });
    });

    it('ne propage pas displayMode ni supportCategoryId depuis la catégorie', () => {
    const merged = mergeGraphPreferences(
      {
        color: '#ff0000',
        displayMode: 'background' as never,
        supportCategoryId: 'cat-1',
      },
      { strokeWidth: 4 },
    );

    expect(merged).toEqual({
      color: '#ff0000',
      strokeWidth: 4,
    });
  });

  it('laisse l\'observable surcharger la couleur de catégorie', () => {
      const merged = mergeGraphPreferences(
        { color: '#ff0000' },
        { color: '#0000ff' },
      );

      expect(merged).toEqual({ color: '#0000ff' });
    });

    it('retourne null si aucune préférence', () => {
      expect(mergeGraphPreferences(null, undefined)).toBeNull();
    });
    it('ignore une couleur vide et hérite du parent', () => {
      const merged = mergeGraphPreferences(
        { color: '#ff0000' },
        { color: '   ' },
      );

      expect(merged).toEqual({ color: '#ff0000' });
    });
  });

  describe('portable support category references', () => {
    it('exporte supportCategoryName à la place de supportCategoryId', () => {
      const categoryIdToName = new Map([['cat-1', 'Posture']]);
      const exported = portableizeGraphPreferencesForExport(
        {
          color: '#ff0000',
          supportCategoryId: 'cat-1',
        },
        categoryIdToName,
      );

      expect(exported).toEqual({
        color: '#ff0000',
        supportCategoryName: 'Posture',
      });
    });

    it('résout supportCategoryName vers supportCategoryId à l\'import', () => {
      const categoryNameToId = new Map([['Posture', 'new-cat-id']]);
      const resolved = resolvePortableGraphPreferencesOnImport(
        {
          color: '#ff0000',
          supportCategoryName: 'Posture',
        },
        categoryNameToId,
      );

      expect(resolved).toEqual({
        color: '#ff0000',
        supportCategoryId: 'new-cat-id',
      });
    });
  });

  describe('normalizeProtocolItemAction', () => {
    it('retombe sur continuous par défaut', () => {
      expect(normalizeProtocolItemAction(undefined)).toBe(ProtocolItemActionEnum.Continuous);
    });

    it('normalise discrete quelle que soit la casse', () => {
      expect(normalizeProtocolItemAction('Discrete')).toBe(ProtocolItemActionEnum.Discrete);
      expect(normalizeProtocolItemAction('discrete')).toBe(ProtocolItemActionEnum.Discrete);
    });
  });

  describe('resolveGraphColor', () => {
    it('utilise la couleur du protocole quand elle est définie', () => {
      expect(resolveGraphColor({ color: '#123456' })).toBe('#123456');
    });

    it('retombe sur DEFAULT_GRAPH_COLOR si la couleur est absente', () => {
      expect(resolveGraphColor({ strokeWidth: 2 })).toBe(DEFAULT_GRAPH_COLOR);
      expect(resolveGraphColor(null)).toBe(DEFAULT_GRAPH_COLOR);
    });
  });
});
