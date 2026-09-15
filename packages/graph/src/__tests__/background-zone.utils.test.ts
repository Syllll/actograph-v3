import {
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '@actograph/core';
import { getBackgroundZoneForCategory } from '../utils/background-zone.utils';
import { Y_AXIS_LAYOUT } from '../lib/axis-layout.constants';
import { createMockGraphContext } from './test-helpers/mock-graph-context';
import type { ProtocolItem } from '../utils/protocol.utils';

const FULL_TOP = 0;
const FULL_BOTTOM = 400;

const backgroundCategory = {
  id: 'cat-bg',
  name: 'Fond',
  type: 'category',
  action: ProtocolItemActionEnum.Continuous,
  graphPreferences: {
    displayMode: DisplayModeEnum.Background,
  },
} as ProtocolItem;

describe('getBackgroundZoneForCategory', () => {
  it('occupe tout le graphe quand la cible est « tout »', () => {
    const ctx = createMockGraphContext();
    expect(getBackgroundZoneForCategory(ctx, backgroundCategory, FULL_TOP, FULL_BOTTOM)).toEqual({
      topY: FULL_TOP,
      height: FULL_BOTTOM - FULL_TOP,
    });
  });

  it('ne replie pas sur tout le graphe si la catégorie cible est absente', () => {
    const category = {
      ...backgroundCategory,
      graphPreferences: {
        displayMode: DisplayModeEnum.Background,
        supportCategoryId: 'missing',
      },
    } as ProtocolItem;
    const ctx = createMockGraphContext({
      getCategoryById: () => null,
    });

    expect(getBackgroundZoneForCategory(ctx, category, FULL_TOP, FULL_BOTTOM)).toEqual({
      topY: FULL_TOP,
      height: 0,
    });
  });

  it('cadre un continu / événement sur les ticks Y de la cible y compris Y = 0', () => {
    const support = {
      id: 'cat-events',
      name: 'Événements',
      type: 'category',
      action: ProtocolItemActionEnum.Discrete,
      children: [
        { id: 'obs-a', name: 'A', type: ProtocolItemTypeEnum.Observable },
        { id: 'obs-b', name: 'B', type: ProtocolItemTypeEnum.Observable },
      ],
    } as ProtocolItem;
    const category = {
      ...backgroundCategory,
      graphPreferences: {
        displayMode: DisplayModeEnum.Background,
        supportCategoryId: support.id,
      },
    } as ProtocolItem;
    const ctx = createMockGraphContext({
      getCategoryById: (id: string) => (id === support.id ? support : null),
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
      getYPos: (_categoryId: string, name: string) => (name === 'A' ? 0 : 160),
    });

    const half = Y_AXIS_LAYOUT.OBSERVABLE_HEIGHT / 2;
    expect(getBackgroundZoneForCategory(ctx, category, FULL_TOP, FULL_BOTTOM)).toEqual({
      topY: 0,
      height: 160 + half,
    });
  });

  it('cadre une frise sur son bandeau, pas sur tout le graphe', () => {
    const support = {
      id: 'cat-frieze',
      name: 'Frise',
      type: 'category',
      graphPreferences: { displayMode: DisplayModeEnum.Frieze },
    } as ProtocolItem;
    const category = {
      ...backgroundCategory,
      graphPreferences: {
        displayMode: DisplayModeEnum.Background,
        supportCategoryId: support.id,
      },
    } as ProtocolItem;
    const ctx = createMockGraphContext({
      getCategoryById: (id: string) => (id === support.id ? support : null),
      getEffectiveDisplayMode: () => DisplayModeEnum.Frieze,
      getFriezeInfo: () => ({
        centerY: 50,
        startY: 80,
        endY: 40,
        height: 40,
      }),
    });

    expect(getBackgroundZoneForCategory(ctx, category, FULL_TOP, FULL_BOTTOM)).toEqual({
      topY: 40,
      height: 40,
    });
  });

  it('ne replie pas sur tout le graphe si la cible n\'a pas de ticks', () => {
    const support = {
      id: 'cat-hidden',
      name: 'Cachée',
      type: 'category',
      children: [{ id: 'obs-a', name: 'A', type: ProtocolItemTypeEnum.Observable }],
    } as ProtocolItem;
    const category = {
      ...backgroundCategory,
      graphPreferences: {
        displayMode: DisplayModeEnum.Background,
        supportCategoryId: support.id,
      },
    } as ProtocolItem;
    const ctx = createMockGraphContext({
      getCategoryById: () => support,
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
      getYPos: () => -1,
    });

    expect(getBackgroundZoneForCategory(ctx, category, FULL_TOP, FULL_BOTTOM)).toEqual({
      topY: FULL_TOP,
      height: 0,
    });
  });

  it('refuse une cible elle-même en arrière-plan', () => {
    const support = {
      id: 'cat-other-bg',
      name: 'Autre fond',
      type: 'category',
      graphPreferences: { displayMode: DisplayModeEnum.Background },
    } as ProtocolItem;
    const category = {
      ...backgroundCategory,
      graphPreferences: {
        displayMode: DisplayModeEnum.Background,
        supportCategoryId: support.id,
      },
    } as ProtocolItem;
    const ctx = createMockGraphContext({
      getCategoryById: () => support,
      getEffectiveDisplayMode: () => DisplayModeEnum.Background,
      getYPos: () => 120,
    });

    expect(getBackgroundZoneForCategory(ctx, category, FULL_TOP, FULL_BOTTOM)).toEqual({
      topY: FULL_TOP,
      height: 0,
    });
  });
});
