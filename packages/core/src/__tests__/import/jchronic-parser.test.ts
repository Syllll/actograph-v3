import {
  parseJchronicFile,
  normalizeJchronicData,
} from '../../import/jchronic-parser';
import { ProtocolItemTypeEnum, TimeDisplayFormatEnum } from '../../enums';
import type { IJchronicImport } from '../../import/types';

describe('jchronic-parser - normalizeJchronicData', () => {
  it('préserve le type d\'action (action) des catégories à l\'import', () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test' },
      protocol: {
        name: 'Proto',
        items: [
          {
            type: ProtocolItemTypeEnum.Category,
            name: 'Catégorie discrète',
            action: 'discrete',
            children: [
              {
                type: ProtocolItemTypeEnum.Observable,
                name: 'Observable 1',
                action: 'discrete',
              },
            ],
          },
          {
            type: ProtocolItemTypeEnum.Category,
            name: 'Catégorie continue',
            action: 'continuous',
            children: [],
          },
        ],
      },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.protocol?.categories).toBeDefined();
    const categories = normalized.protocol?.categories ?? [];

    expect(categories).toHaveLength(2);
    expect(categories[0].action).toBe('discrete');
    expect(categories[0].observables?.[0].action).toBe('discrete');
    expect(categories[1].action).toBe('continuous');
  });

  it('préserve les meta des catégories (ex: position)', () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test' },
      protocol: {
        name: 'Proto',
        items: [
          {
            type: ProtocolItemTypeEnum.Category,
            name: 'Catégorie',
            action: 'discrete',
            meta: { position: { x: 120, y: 80 } },
            children: [],
          },
        ],
      },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.protocol?.categories?.[0].meta).toEqual({
      position: { x: 120, y: 80 },
    });
  });

  it("préserve l'observation.meta (uiScale) à l'import", () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test', meta: { uiScale: 1.4 } },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.observation.meta).toBeDefined();
    expect(normalized.observation.meta?.uiScale).toBe(1.4);
  });

  it("préserve l'observation.meta (timeDisplayFormat) à l'import", () => {
    const data: IJchronicImport = {
      observation: {
        name: 'Obs test',
        meta: { timeDisplayFormat: TimeDisplayFormatEnum.HourMinuteSecond },
      },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.observation.meta?.timeDisplayFormat).toBe(
      TimeDisplayFormatEnum.HourMinuteSecond,
    );
  });

  it("ignore un timeDisplayFormat invalide mais conserve les autres clés du meta", () => {
    const data: IJchronicImport = {
      observation: {
        name: 'Obs test',
        meta: { timeDisplayFormat: 'not-a-real-format', theme: 'dark' },
      },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.observation.meta).toEqual({ theme: 'dark' });
    expect(normalized.observation.meta?.timeDisplayFormat).toBeUndefined();
  });

  it('préserve sortOrder legacy comme alias de order', () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test' },
      protocol: {
        name: 'Proto',
        items: [
          {
            type: ProtocolItemTypeEnum.Category,
            name: 'Seconde',
            sortOrder: 1,
            children: [],
          },
          {
            type: ProtocolItemTypeEnum.Category,
            name: 'Première',
            sortOrder: 0,
            children: [],
          },
        ],
      },
    };

    const normalized = normalizeJchronicData(data);
    const categories = normalized.protocol?.categories ?? [];

    expect(categories.map((category) => category.name)).toEqual(['Première', 'Seconde']);
  });

  it('préserve les champs graphiques legacy plats à l\'import', () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test' },
      protocol: {
        name: 'Proto',
        items: [
          {
            type: ProtocolItemTypeEnum.Category,
            name: 'Catégorie legacy',
            color: '#ff0000',
            displayMode: 'background',
            children: [
              {
                type: ProtocolItemTypeEnum.Observable,
                name: 'Observable legacy',
                color: '#00ff00',
                strokeWidth: 5,
              },
            ],
          },
        ],
      },
    };

    const normalized = normalizeJchronicData(data);
    const category = normalized.protocol?.categories?.[0];

    expect(category?.graphPreferences).toEqual({
      color: '#ff0000',
      displayMode: 'background',
    });
    expect(category?.observables?.[0].graphPreferences).toEqual({
      color: '#00ff00',
      strokeWidth: 5,
    });
  });

  it('préserve graphPreferences et le champ color legacy à l\'import', () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test' },
      protocol: {
        name: 'Proto',
        items: [
          {
            type: ProtocolItemTypeEnum.Category,
            name: 'Catégorie',
            graphPreferences: { color: '#ff0000' },
            children: [
              {
                type: ProtocolItemTypeEnum.Observable,
                name: 'Observable legacy',
                color: '#00ff00',
              },
              {
                type: ProtocolItemTypeEnum.Observable,
                name: 'Observable prefs',
                graphPreferences: { color: '#0000ff', strokeWidth: 3 },
              },
            ],
          },
        ],
      },
    };

    const normalized = normalizeJchronicData(data);
    const category = normalized.protocol?.categories?.[0];

    expect(category?.graphPreferences?.color).toBe('#ff0000');
    expect(category?.observables?.[0].graphPreferences?.color).toBe('#00ff00');
    expect(category?.observables?.[1].graphPreferences).toEqual({
      color: '#0000ff',
      strokeWidth: 3,
    });
  });

  it("ignore un uiScale invalide mais conserve les autres clés du meta", () => {
    const data: IJchronicImport = {
      observation: {
        name: 'Obs test',
        meta: { uiScale: 'big', theme: 'dark' },
      },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.observation.meta).toEqual({ theme: 'dark' });
    expect(normalized.observation.meta?.uiScale).toBeUndefined();
  });

  it('renvoie meta=undefined pour une chronic sans meta (compat ascendante)', () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test' },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.observation.meta).toBeUndefined();
  });

  it('borne le uiScale hors plage (valeur aberrante ignorée)', () => {
    const data: IJchronicImport = {
      observation: { name: 'Obs test', meta: { uiScale: 42 } },
    };

    const normalized = normalizeJchronicData(data);

    expect(normalized.observation.meta).toBeUndefined();
  });

  it('parse un fichier .jchronic valide', () => {
    const content = JSON.stringify({
      observation: { name: 'Depuis fichier' },
      protocol: { name: 'Proto', items: [] },
    });

    const parsed = parseJchronicFile(content);
    expect(parsed.observation.name).toBe('Depuis fichier');
  });
});
