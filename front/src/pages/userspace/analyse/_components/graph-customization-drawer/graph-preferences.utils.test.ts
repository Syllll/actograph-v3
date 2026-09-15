import {
  BackgroundPatternEnum,
  DisplayModeEnum,
  IProtocolItem,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '../../../../../services/observations/interface';
import {
  collectCategoryPreferenceRepairs,
  getCategoryPreferenceRepairPatch,
  getObservablePropagationPatch,
  isDiscreteCategory,
  resolveCategoryDisplayMode,
  resolveSupportCategoryId,
  sanitizeGraphPreferencePatch,
  shouldApplyDisplayModeUpdate,
  listBackgroundSupportCategories,
} from './graph-preferences.utils';

const makeCategory = (overrides: Partial<IProtocolItem> = {}): IProtocolItem => ({
  id: 'cat-1',
  name: 'Catégorie',
  type: ProtocolItemTypeEnum.Category,
  action: ProtocolItemActionEnum.Continuous,
  graphPreferences: {},
  ...overrides,
});

describe('graph-preferences.utils', () => {
  it('force le mode Normal pour une catégorie discrète', () => {
    const category = makeCategory({
      action: ProtocolItemActionEnum.Discrete,
      graphPreferences: { displayMode: DisplayModeEnum.Background },
    });

    expect(isDiscreteCategory(category)).toBe(true);
    expect(resolveCategoryDisplayMode(category)).toBe(DisplayModeEnum.Normal);
  });

  it('retombe sur Normal si le mode stocké est invalide', () => {
    const category = makeCategory({
      graphPreferences: { displayMode: 'invalid' as DisplayModeEnum },
    });

    expect(resolveCategoryDisplayMode(category)).toBe(DisplayModeEnum.Normal);
  });

  it('remet supportCategoryId à null hors mode Arrière-plan', () => {
    const patch = sanitizeGraphPreferencePatch({
      displayMode: DisplayModeEnum.Frieze,
      supportCategoryId: 'cat-2',
    });

    expect(patch.displayMode).toBe(DisplayModeEnum.Frieze);
    expect(patch.supportCategoryId).toBeNull();
  });

  it('ne propage pas displayMode aux observables', () => {
    const patch = getObservablePropagationPatch({
      displayMode: DisplayModeEnum.Background,
      supportCategoryId: 'cat-2',
      color: '#ff0000',
      strokeWidth: 4,
      backgroundPattern: BackgroundPatternEnum.Grid,
    });

    expect(patch).toEqual({
      color: '#ff0000',
      strokeWidth: 4,
      backgroundPattern: BackgroundPatternEnum.Grid,
    });
  });

  it('ignore un supportCategoryId devenu invalide', () => {
    const categories = [
      makeCategory({ id: 'cat-bg', graphPreferences: { displayMode: DisplayModeEnum.Background } }),
      makeCategory({ id: 'cat-support', name: 'Support' }),
    ];

    expect(resolveSupportCategoryId('cat-1', 'cat-bg', categories)).toBeNull();
    expect(resolveSupportCategoryId('cat-1', 'cat-support', categories)).toBe('cat-support');
    expect(resolveSupportCategoryId('cat-1', 'cat-1', categories)).toBeNull();
  });

  it('propose un patch de réparation pour un support devenu invalide', () => {
    const categories = [
      makeCategory({
        id: 'cat-bg',
        graphPreferences: {
          displayMode: DisplayModeEnum.Background,
          supportCategoryId: 'cat-support',
        },
      }),
      makeCategory({
        id: 'cat-support',
        graphPreferences: { displayMode: DisplayModeEnum.Background },
      }),
    ];

    expect(getCategoryPreferenceRepairPatch(categories[0], categories)).toEqual({
      supportCategoryId: null,
    });
  });

  it('répare aussi une catégorie dont le type est capitalisé', () => {
    const categories = [
      makeCategory({
        id: 'cat-bg',
        type: 'Category' as IProtocolItem['type'],
        graphPreferences: {
          displayMode: DisplayModeEnum.Background,
          supportCategoryId: 'missing',
        },
      }),
    ];

    expect(collectCategoryPreferenceRepairs(categories)).toEqual([
      {
        categoryId: 'cat-bg',
        patch: { supportCategoryId: null },
      },
    ]);
  });

  it('autorise la correction d\'un mode stocké invalide même si l\'affichage est Normal', () => {
    const category = makeCategory({
      graphPreferences: { displayMode: 'invalid' as DisplayModeEnum },
    });

    expect(shouldApplyDisplayModeUpdate(category, DisplayModeEnum.Normal)).toBe(true);
    expect(shouldApplyDisplayModeUpdate(category, DisplayModeEnum.Frieze)).toBe(true);
  });

  it('ignore la resélection du même mode valide', () => {
    const category = makeCategory({
      graphPreferences: { displayMode: DisplayModeEnum.Frieze },
    });

    expect(shouldApplyDisplayModeUpdate(category, DisplayModeEnum.Frieze)).toBe(false);
    expect(shouldApplyDisplayModeUpdate(category, DisplayModeEnum.Background)).toBe(true);
  });

  it('conserve supportCategoryId quand on passe en arrière-plan', () => {
    const patch = sanitizeGraphPreferencePatch({
      displayMode: DisplayModeEnum.Background,
      supportCategoryId: 'cat-2',
    });

    expect(patch.displayMode).toBe(DisplayModeEnum.Background);
    expect(patch.supportCategoryId).toBe('cat-2');
  });

  it('applique un changement de cible d\'arrière-plan à mode inchangé', () => {
    const category = makeCategory({
      graphPreferences: {
        displayMode: DisplayModeEnum.Background,
        supportCategoryId: 'cat-2',
      },
    });

    expect(shouldApplyDisplayModeUpdate(category, DisplayModeEnum.Background, 'cat-2')).toBe(false);
    expect(shouldApplyDisplayModeUpdate(category, DisplayModeEnum.Background, null)).toBe(true);
    expect(shouldApplyDisplayModeUpdate(category, DisplayModeEnum.Background, 'cat-3')).toBe(true);
  });

  it('autorise continu, événement et frise comme cibles d\'arrière-plan', () => {
    const categories = [
      makeCategory({ id: 'source' }),
      makeCategory({ id: 'continuous' }),
      makeCategory({
        id: 'event',
        action: ProtocolItemActionEnum.Discrete,
      }),
      makeCategory({
        id: 'frieze',
        graphPreferences: { displayMode: DisplayModeEnum.Frieze },
      }),
      makeCategory({
        id: 'already-bg',
        graphPreferences: { displayMode: DisplayModeEnum.Background },
      }),
    ];

    expect(listBackgroundSupportCategories('source', categories).map((cat) => cat.id)).toEqual([
      'continuous',
      'event',
      'frieze',
    ]);
  });
});
