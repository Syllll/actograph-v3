import {
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '../../enums';
import {
  getEffectiveDisplayMode,
  isEligibleBackgroundSupportCategory,
  listEligibleBackgroundSupportCategories,
  resolveSupportCategoryId,
  isGraphCategoryType,
} from '../../utils/graph-display-mode';
import type { GraphDisplayCategory } from '../../utils/graph-display-mode';

const makeCategory = (
  overrides: Partial<GraphDisplayCategory> = {},
): GraphDisplayCategory => ({
  id: 'cat-1',
  type: ProtocolItemTypeEnum.Category,
  action: ProtocolItemActionEnum.Continuous,
  graphPreferences: {},
  ...overrides,
});

describe('graph-display-mode', () => {
  describe('getEffectiveDisplayMode', () => {
    it('force Normal pour une catégorie discrète même si Background est stocké', () => {
      expect(
        getEffectiveDisplayMode(
          makeCategory({
            action: ProtocolItemActionEnum.Discrete,
            graphPreferences: { displayMode: DisplayModeEnum.Background },
          }),
        ),
      ).toBe(DisplayModeEnum.Normal);
    });

    it('conserve Frise et Arrière-plan pour une catégorie continue', () => {
      expect(
        getEffectiveDisplayMode(
          makeCategory({ graphPreferences: { displayMode: DisplayModeEnum.Frieze } }),
        ),
      ).toBe(DisplayModeEnum.Frieze);
      expect(
        getEffectiveDisplayMode(
          makeCategory({ graphPreferences: { displayMode: DisplayModeEnum.Background } }),
        ),
      ).toBe(DisplayModeEnum.Background);
    });

    it('retombe sur Normal si le mode stocké est invalide', () => {
      expect(
        getEffectiveDisplayMode(
          makeCategory({ graphPreferences: { displayMode: 'invalid' as DisplayModeEnum } }),
        ),
      ).toBe(DisplayModeEnum.Normal);
    });

    it('force Normal pour une action Discrete capitalisée', () => {
      expect(
        getEffectiveDisplayMode(
          makeCategory({
            action: 'Discrete',
            graphPreferences: { displayMode: DisplayModeEnum.Background },
          }),
        ),
      ).toBe(DisplayModeEnum.Normal);
    });
  });

  describe('cibles d\'arrière-plan', () => {
    const source = makeCategory({ id: 'source' });
    const continuous = makeCategory({ id: 'continuous', graphPreferences: { displayMode: DisplayModeEnum.Normal } });
    const discrete = makeCategory({
      id: 'event',
      action: ProtocolItemActionEnum.Discrete,
    });
    const frieze = makeCategory({
      id: 'frieze',
      graphPreferences: { displayMode: DisplayModeEnum.Frieze },
    });
    const background = makeCategory({
      id: 'already-bg',
      graphPreferences: { displayMode: DisplayModeEnum.Background },
    });

    it('autorise continu, événement et frise, pas soi-même ni un autre arrière-plan', () => {
      const categories = [source, continuous, discrete, frieze, background];
      const eligible = listEligibleBackgroundSupportCategories('source', categories);

      expect(eligible.map((category) => category.id)).toEqual([
        'continuous',
        'event',
        'frieze',
      ]);
    });

    it('refuse un support déjà en arrière-plan ou égal à la source', () => {
      expect(isEligibleBackgroundSupportCategory('source', source)).toBe(false);
      expect(isEligibleBackgroundSupportCategory('source', background)).toBe(false);
      expect(isEligibleBackgroundSupportCategory('source', continuous)).toBe(true);
      expect(isEligibleBackgroundSupportCategory('source', discrete)).toBe(true);
      expect(isEligibleBackgroundSupportCategory('source', frieze)).toBe(true);
    });

    it('accepte un type Category capitalisé et refuse un observable', () => {
      expect(
        isEligibleBackgroundSupportCategory(
          'source',
          makeCategory({ id: 'legacy', type: 'Category' }),
        ),
      ).toBe(true);
      expect(
        isEligibleBackgroundSupportCategory(
          'source',
          makeCategory({ id: 'obs', type: ProtocolItemTypeEnum.Observable }),
        ),
      ).toBe(false);
      expect(isGraphCategoryType('Category')).toBe(true);
      expect(isGraphCategoryType(ProtocolItemTypeEnum.Observable)).toBe(false);
    });

    it('ignore un supportCategoryId devenu invalide', () => {
      const categories = [source, continuous, background];
      expect(resolveSupportCategoryId('source', 'already-bg', categories)).toBeNull();
      expect(resolveSupportCategoryId('source', 'continuous', categories)).toBe('continuous');
      expect(resolveSupportCategoryId('source', 'source', categories)).toBeNull();
      expect(resolveSupportCategoryId('source', null, categories)).toBeNull();
    });
  });
});
