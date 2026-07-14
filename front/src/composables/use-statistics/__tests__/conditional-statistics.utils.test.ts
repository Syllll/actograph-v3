import {
  mapConditionalStatisticsResult,
  shouldUseLocalConditionalStatistics,
} from '../conditional-statistics.utils';
import {
  ConditionOperatorEnum,
  ObservableStateEnum,
} from '../../../services/observations/statistics.interface';

describe('conditional-statistics.utils', () => {
  it('maps core conditional results to the frontend interface', () => {
    const request = {
      targetCategoryId: 'cat-1',
      groupOperator: ConditionOperatorEnum.AND,
      conditionGroups: [
        {
          operator: ConditionOperatorEnum.OR,
          observables: [{ observableName: 'Walk', state: ObservableStateEnum.ON }],
        },
      ],
    };

    const mapped = mapConditionalStatisticsResult(request, {
      filteredPeriods: [
        {
          start: new Date('2024-01-01T10:01:00.000Z'),
          end: new Date('2024-01-01T10:03:00.000Z'),
        },
        {
          start: new Date('2024-01-01T10:05:00.000Z'),
          end: new Date('2024-01-01T10:06:00.000Z'),
        },
      ],
      categoryStatistics: {
        categoryId: 'cat-1',
        categoryName: 'Target',
        observables: [],
      },
    });

    expect(mapped.filteredDuration).toBe(3 * 60 * 1000);
    expect(mapped.conditions).toEqual(request.conditionGroups);
    expect(mapped.targetCategory.categoryName).toBe('Target');
  });

  it('uses local conditional statistics when pauses are transparent', () => {
    expect(shouldUseLocalConditionalStatistics(true)).toBe(false);
    expect(shouldUseLocalConditionalStatistics(false)).toBe(true);
  });
});
