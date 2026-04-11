import {
  calculateConditionalStatistics,
  applyConditionGroup,
} from '../../statistics/conditional-statistics';
import {
  ConditionOperatorEnum,
  ObservableStateEnum,
  ProtocolItemTypeEnum,
  ReadingTypeEnum,
} from '../../enums';
import { IProtocolItem, IReading } from '../../types';

describe('conditional-statistics', () => {
  const protocolItems: IProtocolItem[] = [
    {
      id: 'category-1',
      type: ProtocolItemTypeEnum.Category,
      name: 'Category 1',
      children: [
        {
          id: 'obs-a',
          type: ProtocolItemTypeEnum.Observable,
          name: 'A',
        },
        {
          id: 'obs-b',
          type: ProtocolItemTypeEnum.Observable,
          name: 'B',
        },
      ],
    },
  ];

  const readings: IReading[] = [
    {
      type: ReadingTypeEnum.START,
      dateTime: new Date('2024-01-01T10:00:00.000Z'),
    },
    {
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2024-01-01T10:01:00.000Z'),
      name: 'A',
    },
    {
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2024-01-01T10:03:00.000Z'),
      name: 'B',
    },
    {
      type: ReadingTypeEnum.STOP,
      dateTime: new Date('2024-01-01T10:05:00.000Z'),
    },
  ];

  it('returns ON periods for the requested observable', () => {
    const periods = applyConditionGroup(readings, {
      operator: ConditionOperatorEnum.OR,
      observables: [
        {
          observableName: 'A',
          state: ObservableStateEnum.ON,
        },
      ],
    });

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:01:00.000Z'),
        end: new Date('2024-01-01T10:03:00.000Z'),
      },
    ]);
  });

  it('derives OFF periods from observation gaps', () => {
    const periods = applyConditionGroup(readings, {
      operator: ConditionOperatorEnum.OR,
      observables: [
        {
          observableName: 'A',
          state: ObservableStateEnum.OFF,
        },
      ],
    });

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:00:00.000Z'),
        end: new Date('2024-01-01T10:01:00.000Z'),
      },
      {
        start: new Date('2024-01-01T10:03:00.000Z'),
        end: new Date('2024-01-01T10:05:00.000Z'),
      },
    ]);
  });

  it('uses OFF conditions when calculating conditional statistics', () => {
    const result = calculateConditionalStatistics(readings, protocolItems, {
      targetCategoryId: 'category-1',
      groupOperator: ConditionOperatorEnum.OR,
      conditionGroups: [
        {
          operator: ConditionOperatorEnum.OR,
          observables: [
            {
              observableName: 'A',
              state: ObservableStateEnum.OFF,
            },
          ],
        },
      ],
    });

    expect(result.filteredPeriods).toEqual([
      {
        start: new Date('2024-01-01T10:00:00.000Z'),
        end: new Date('2024-01-01T10:01:00.000Z'),
      },
      {
        start: new Date('2024-01-01T10:03:00.000Z'),
        end: new Date('2024-01-01T10:05:00.000Z'),
      },
    ]);
    expect(result.categoryStatistics.totalCategoryDuration).toBe(2 * 60 * 1000);
  });
});
