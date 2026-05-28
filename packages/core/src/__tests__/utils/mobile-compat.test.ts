import { ObservationModeEnum, ReadingTypeEnum } from '../../enums';
import { convertMobileObservation } from '../../utils/mobile-compat';

const protocolItems = [
  {
    id: 1,
    name: 'Category',
    type: 'category',
    action: 'continuous',
    children: [
      {
        id: 2,
        name: 'Observable',
        type: 'observable',
      },
    ],
  },
];

describe('mobile-compat', () => {
  it('treats mobile absolute readings as calendar even when legacy rows say chronometer', () => {
    const observation = convertMobileObservation(
      {
        id: 1,
        name: 'Mobile observation',
        mode: 'Chronometer',
      },
      protocolItems,
      [
        {
          id: 1,
          type: 'START',
          date: '2026-05-28T15:00:00.000',
        },
        {
          id: 2,
          type: 'DATA',
          name: 'Observable',
          date: '2026-05-28T15:00:10.000',
        },
      ]
    );

    expect(observation.mode).toBe(ObservationModeEnum.Calendar);
  });

  it('keeps chronometer mode for readings around the chronometer reference date', () => {
    const observation = convertMobileObservation(
      {
        id: 1,
        name: 'Legacy chronometer observation',
        mode: 'Chronometer',
      },
      protocolItems,
      [
        {
          id: 1,
          type: 'START',
          date: '1989-02-09T00:00:00.000Z',
        },
        {
          id: 2,
          type: 'DATA',
          name: 'Observable',
          date: '1989-02-09T00:00:10.000Z',
        },
      ]
    );

    expect(observation.mode).toBe(ObservationModeEnum.Chronometer);
    expect(observation.readings?.[0]?.type).toBe(ReadingTypeEnum.START);
  });
});
