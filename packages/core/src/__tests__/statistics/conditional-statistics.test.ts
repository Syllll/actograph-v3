import {
  calculateConditionalStatistics,
  applyConditionGroup,
  applyConditions,
} from '../../statistics/conditional-statistics';
import {
  ConditionOperatorEnum,
  ObservableStateEnum,
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
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
    const periods = applyConditionGroup(
      readings,
      {
        operator: ConditionOperatorEnum.OR,
        observables: [
          {
            observableName: 'A',
            state: ObservableStateEnum.ON,
          },
        ],
      },
      protocolItems,
    );

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:01:00.000Z'),
        end: new Date('2024-01-01T10:03:00.000Z'),
      },
    ]);
  });

  it('derives OFF periods from observation gaps', () => {
    const periods = applyConditionGroup(
      readings,
      {
        operator: ConditionOperatorEnum.OR,
        observables: [
          {
            observableName: 'A',
            state: ObservableStateEnum.OFF,
          },
        ],
      },
      protocolItems,
    );

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

  it('exposes observationDuration as the filtered-periods window and scopes percentages to it, not to the sum of on-durations', () => {
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

    expect(result.categoryStatistics.observationDuration).toBe(3 * 60 * 1000);

    const obsB = result.categoryStatistics.observables.find(
      (o) => o.observableName === 'B',
    );
    expect(obsB?.onPercentage).toBeCloseTo((2 / 3) * 100, 5);
    expect(obsB?.onPercentage).not.toBeCloseTo(100, 5);
  });

  it('scopes pauseDuration to filtered periods and excludes pauses from observationDuration', () => {
    const readingsWithPause: IReading[] = [
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
        type: ReadingTypeEnum.PAUSE_START,
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
      },
      {
        type: ReadingTypeEnum.PAUSE_END,
        dateTime: new Date('2024-01-01T10:03:00.000Z'),
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

    const result = calculateConditionalStatistics(
      readingsWithPause,
      protocolItems,
      {
        targetCategoryId: 'category-1',
        groupOperator: ConditionOperatorEnum.OR,
        conditionGroups: [
          {
            operator: ConditionOperatorEnum.OR,
            observables: [
              {
                observableName: 'A',
                state: ObservableStateEnum.ON,
              },
            ],
          },
        ],
      },
    );

    // Pause-aware ON for A is only 10:01-10:02 (pause excluded from condition window).
    expect(result.filteredPeriods).toEqual([
      {
        start: new Date('2024-01-01T10:01:00.000Z'),
        end: new Date('2024-01-01T10:02:00.000Z'),
      },
    ]);
    expect(result.categoryStatistics.observationDuration).toBe(1 * 60 * 1000);
    expect(result.categoryStatistics.pauseDuration).toBe(0);
    expect(result.categoryStatistics.windowDuration).toBe(1 * 60 * 1000);
  });

  it('includes pause intervals in OFF conditions when pauses make observables inactive', () => {
    const readingsWithPause: IReading[] = [
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
        type: ReadingTypeEnum.PAUSE_START,
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
      },
      {
        type: ReadingTypeEnum.PAUSE_END,
        dateTime: new Date('2024-01-01T10:03:00.000Z'),
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

    const periods = applyConditionGroup(
      readingsWithPause,
      {
        operator: ConditionOperatorEnum.OR,
        observables: [{ observableName: 'A', state: ObservableStateEnum.OFF }],
      },
      protocolItems,
    );

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:00:00.000Z'),
        end: new Date('2024-01-01T10:01:00.000Z'),
      },
      {
        start: new Date('2024-01-01T10:02:00.000Z'),
        end: new Date('2024-01-01T10:05:00.000Z'),
      },
    ]);
  });

  it('scopes condition ON periods to the observable parent category, not all readings', () => {
    const multiCategoryProtocol: IProtocolItem[] = [
      {
        id: 'locomotion',
        type: ProtocolItemTypeEnum.Category,
        name: 'Locomotion',
        children: [
          {
            id: 'obs-walk',
            type: ProtocolItemTypeEnum.Observable,
            name: 'Walk',
          },
          {
            id: 'obs-run',
            type: ProtocolItemTypeEnum.Observable,
            name: 'Run',
          },
        ],
      },
      {
        id: 'alimentation',
        type: ProtocolItemTypeEnum.Category,
        name: 'Alimentation',
        children: [
          {
            id: 'obs-eat',
            type: ProtocolItemTypeEnum.Observable,
            name: 'Eat',
          },
        ],
      },
    ];

    const multiCategoryReadings: IReading[] = [
      {
        type: ReadingTypeEnum.START,
        dateTime: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:01:00.000Z'),
        name: 'Walk',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
        name: 'Eat',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:03:00.000Z'),
        name: 'Run',
      },
      {
        type: ReadingTypeEnum.STOP,
        dateTime: new Date('2024-01-01T10:05:00.000Z'),
      },
    ];

    const periods = applyConditionGroup(
      multiCategoryReadings,
      {
        operator: ConditionOperatorEnum.OR,
        observables: [
          {
            observableName: 'Walk',
            state: ObservableStateEnum.ON,
          },
        ],
      },
      multiCategoryProtocol,
    );

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:01:00.000Z'),
        end: new Date('2024-01-01T10:03:00.000Z'),
      },
    ]);
  });

  it('derives OFF periods with category scoping so unrelated observables do not shrink gaps', () => {
    const multiCategoryProtocol: IProtocolItem[] = [
      {
        id: 'locomotion',
        type: ProtocolItemTypeEnum.Category,
        name: 'Locomotion',
        children: [
          {
            id: 'obs-walk',
            type: ProtocolItemTypeEnum.Observable,
            name: 'Walk',
          },
          {
            id: 'obs-run',
            type: ProtocolItemTypeEnum.Observable,
            name: 'Run',
          },
        ],
      },
      {
        id: 'alimentation',
        type: ProtocolItemTypeEnum.Category,
        name: 'Alimentation',
        children: [
          {
            id: 'obs-eat',
            type: ProtocolItemTypeEnum.Observable,
            name: 'Eat',
          },
        ],
      },
    ];

    const multiCategoryReadings: IReading[] = [
      {
        type: ReadingTypeEnum.START,
        dateTime: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:01:00.000Z'),
        name: 'Walk',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
        name: 'Eat',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:03:00.000Z'),
        name: 'Run',
      },
      {
        type: ReadingTypeEnum.STOP,
        dateTime: new Date('2024-01-01T10:05:00.000Z'),
      },
    ];

    const periods = applyConditionGroup(
      multiCategoryReadings,
      {
        operator: ConditionOperatorEnum.OR,
        observables: [
          {
            observableName: 'Walk',
            state: ObservableStateEnum.OFF,
          },
        ],
      },
      multiCategoryProtocol,
    );

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

  it('falls back to singleton scoping when the observable is absent from the protocol', () => {
    const readingsWithForeignObservable: IReading[] = [
      {
        type: ReadingTypeEnum.START,
        dateTime: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:01:00.000Z'),
        name: 'Ghost',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
        name: 'A',
      },
      {
        type: ReadingTypeEnum.STOP,
        dateTime: new Date('2024-01-01T10:05:00.000Z'),
      },
    ];

    const periods = applyConditionGroup(
      readingsWithForeignObservable,
      {
        operator: ConditionOperatorEnum.OR,
        observables: [
          {
            observableName: 'Ghost',
            state: ObservableStateEnum.ON,
          },
        ],
      },
      protocolItems,
    );

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:01:00.000Z'),
        end: new Date('2024-01-01T10:05:00.000Z'),
      },
    ]);
  });

  it('combines cross-category conditions with AND via period intersection', () => {
    const multiCategoryProtocol: IProtocolItem[] = [
      {
        id: 'cat1',
        type: ProtocolItemTypeEnum.Category,
        name: 'Cat 1',
        children: [
          { id: 'a', type: ProtocolItemTypeEnum.Observable, name: 'A' },
          { id: 'b', type: ProtocolItemTypeEnum.Observable, name: 'B' },
        ],
      },
      {
        id: 'cat2',
        type: ProtocolItemTypeEnum.Category,
        name: 'Cat 2',
        children: [{ id: 'x', type: ProtocolItemTypeEnum.Observable, name: 'X' }],
      },
    ];

    const crossReadings: IReading[] = [
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
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
        name: 'X',
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

    const periods = applyConditionGroup(
      crossReadings,
      {
        operator: ConditionOperatorEnum.AND,
        observables: [
          { observableName: 'A', state: ObservableStateEnum.ON },
          { observableName: 'X', state: ObservableStateEnum.ON },
        ],
      },
      multiCategoryProtocol,
    );

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:02:00.000Z'),
        end: new Date('2024-01-01T10:03:00.000Z'),
      },
    ]);
  });

  it('combines conditions with OR via period union across categories', () => {
    const multiCategoryProtocol: IProtocolItem[] = [
      {
        id: 'loc',
        type: ProtocolItemTypeEnum.Category,
        name: 'Loc',
        children: [
          { id: 'w', type: ProtocolItemTypeEnum.Observable, name: 'Walk' },
          { id: 'r', type: ProtocolItemTypeEnum.Observable, name: 'Run' },
        ],
      },
      {
        id: 'ali',
        type: ProtocolItemTypeEnum.Category,
        name: 'Ali',
        children: [{ id: 'e', type: ProtocolItemTypeEnum.Observable, name: 'Eat' }],
      },
    ];

    const readingsForOr: IReading[] = [
      {
        type: ReadingTypeEnum.START,
        dateTime: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:01:00.000Z'),
        name: 'Walk',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:03:00.000Z'),
        name: 'Run',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:05:00.000Z'),
        name: 'Eat',
      },
      {
        type: ReadingTypeEnum.STOP,
        dateTime: new Date('2024-01-01T10:10:00.000Z'),
      },
    ];

    const periods = applyConditions(
      readingsForOr,
      [
        {
          operator: ConditionOperatorEnum.OR,
          observables: [
            { observableName: 'Walk', state: ObservableStateEnum.ON },
            { observableName: 'Eat', state: ObservableStateEnum.ON },
          ],
        },
      ],
      ConditionOperatorEnum.OR,
      multiCategoryProtocol,
    );

    expect(periods).toEqual([
      {
        start: new Date('2024-01-01T10:01:00.000Z'),
        end: new Date('2024-01-01T10:03:00.000Z'),
      },
      {
        start: new Date('2024-01-01T10:05:00.000Z'),
        end: new Date('2024-01-01T10:10:00.000Z'),
      },
    ]);
  });

  it('counts activations instead of intersected period segments for onCount', () => {
    const multiCategoryProtocol: IProtocolItem[] = [
      {
        id: 'loc',
        type: ProtocolItemTypeEnum.Category,
        name: 'Loc',
        children: [
          { id: 'w', type: ProtocolItemTypeEnum.Observable, name: 'Walk' },
          { id: 'r', type: ProtocolItemTypeEnum.Observable, name: 'Run' },
        ],
      },
      {
        id: 'ali',
        type: ProtocolItemTypeEnum.Category,
        name: 'Ali',
        children: [{ id: 'e', type: ProtocolItemTypeEnum.Observable, name: 'Eat' }],
      },
      {
        id: 'target',
        type: ProtocolItemTypeEnum.Category,
        name: 'Target',
        children: [
          { id: 't', type: ProtocolItemTypeEnum.Observable, name: 'T' },
          { id: 'u', type: ProtocolItemTypeEnum.Observable, name: 'U' },
        ],
      },
    ];

    const readingsForCount: IReading[] = [
      {
        type: ReadingTypeEnum.START,
        dateTime: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:01:00.000Z'),
        name: 'T',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:01:00.000Z'),
        name: 'Walk',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:03:00.000Z'),
        name: 'Run',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:05:00.000Z'),
        name: 'Eat',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:08:00.000Z'),
        name: 'U',
      },
      {
        type: ReadingTypeEnum.STOP,
        dateTime: new Date('2024-01-01T10:10:00.000Z'),
      },
    ];

    const result = calculateConditionalStatistics(
      readingsForCount,
      multiCategoryProtocol,
      {
        targetCategoryId: 'target',
        groupOperator: ConditionOperatorEnum.OR,
        conditionGroups: [
          {
            operator: ConditionOperatorEnum.OR,
            observables: [
              { observableName: 'Walk', state: ObservableStateEnum.ON },
              { observableName: 'Eat', state: ObservableStateEnum.ON },
            ],
          },
        ],
      },
    );

    const t = result.categoryStatistics.observables.find(
      (obs) => obs.observableName === 'T',
    );
    expect(t?.onCount).toBe(1);
    expect(t?.onDuration).toBe(5 * 60 * 1000);
  });

  it('supports discrete target categories with occurrence counts only', () => {
    const discreteProtocol: IProtocolItem[] = [
      {
        id: 'events',
        type: ProtocolItemTypeEnum.Category,
        name: 'Events',
        action: ProtocolItemActionEnum.Discrete,
        children: [
          { id: 'e1', type: ProtocolItemTypeEnum.Observable, name: 'Event1' },
          { id: 'e2', type: ProtocolItemTypeEnum.Observable, name: 'Event2' },
        ],
      },
      {
        id: 'trigger',
        type: ProtocolItemTypeEnum.Category,
        name: 'Trigger',
        children: [{ id: 'tr', type: ProtocolItemTypeEnum.Observable, name: 'Trig' }],
      },
    ];

    const discreteReadings: IReading[] = [
      {
        type: ReadingTypeEnum.START,
        dateTime: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:01:00.000Z'),
        name: 'Trig',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
        name: 'Event1',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:04:00.000Z'),
        name: 'Event2',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:06:00.000Z'),
        name: 'Event1',
      },
      {
        type: ReadingTypeEnum.STOP,
        dateTime: new Date('2024-01-01T10:10:00.000Z'),
      },
    ];

    const result = calculateConditionalStatistics(
      discreteReadings,
      discreteProtocol,
      {
        targetCategoryId: 'events',
        groupOperator: ConditionOperatorEnum.OR,
        conditionGroups: [
          {
            operator: ConditionOperatorEnum.OR,
            observables: [{ observableName: 'Trig', state: ObservableStateEnum.ON }],
          },
        ],
      },
    );

    const event1 = result.categoryStatistics.observables.find(
      (obs) => obs.observableName === 'Event1',
    );
    const event2 = result.categoryStatistics.observables.find(
      (obs) => obs.observableName === 'Event2',
    );

    expect(event1?.onCount).toBe(2);
    expect(event1?.onDuration).toBe(0);
    expect(event2?.onCount).toBe(1);
    expect(event2?.onDuration).toBe(0);
  });

  it('includes pauses in target durations and observationDuration when includePauses is true', () => {
    const readingsWithPause: IReading[] = [
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
        type: ReadingTypeEnum.PAUSE_START,
        dateTime: new Date('2024-01-01T10:02:00.000Z'),
      },
      {
        type: ReadingTypeEnum.PAUSE_END,
        dateTime: new Date('2024-01-01T10:03:00.000Z'),
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

    const result = calculateConditionalStatistics(
      readingsWithPause,
      protocolItems,
      {
        targetCategoryId: 'category-1',
        groupOperator: ConditionOperatorEnum.OR,
        conditionGroups: [
          {
            operator: ConditionOperatorEnum.OR,
            observables: [{ observableName: 'A', state: ObservableStateEnum.ON }],
          },
        ],
      },
      true,
    );

    expect(result.filteredPeriods).toEqual([
      {
        start: new Date('2024-01-01T10:01:00.000Z'),
        end: new Date('2024-01-01T10:03:00.000Z'),
      },
    ]);
    expect(result.categoryStatistics.observationDuration).toBe(2 * 60 * 1000);

    const obsA = result.categoryStatistics.observables.find(
      (obs) => obs.observableName === 'A',
    );
    expect(obsA?.onDuration).toBe(2 * 60 * 1000);
  });
});
