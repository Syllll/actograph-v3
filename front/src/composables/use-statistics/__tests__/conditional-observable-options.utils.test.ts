import { ProtocolItemActionEnum } from '@services/observations/interface';
import {
  buildConditionalObservableOptions,
  isContinuousCategoryAction,
} from '../conditional-observable-options.utils';

describe('conditional-observable-options.utils', () => {
  const protocolItems = [
    {
      id: 'walk',
      type: 'category',
      action: ProtocolItemActionEnum.Continuous,
      children: [
        { type: 'observable', name: 'Marche' },
        { type: 'observable', name: 'Course' },
      ],
    },
    {
      id: 'events',
      type: 'category',
      action: ProtocolItemActionEnum.Discrete,
      children: [
        { type: 'observable', name: 'Clic' },
        { type: 'observable', name: 'Signal' },
      ],
    },
    {
      id: 'legacy',
      type: 'category',
      children: [{ type: 'observable', name: 'LegacyObs' }],
    },
  ];

  it('treats missing action as continuous', () => {
    expect(isContinuousCategoryAction(undefined)).toBe(true);
    expect(isContinuousCategoryAction(ProtocolItemActionEnum.Continuous)).toBe(true);
    expect(isContinuousCategoryAction(ProtocolItemActionEnum.Discrete)).toBe(false);
  });

  it('excludes discrete category observables from condition options', () => {
    const options = buildConditionalObservableOptions(protocolItems, null);

    expect(options.map((option) => option.value)).toEqual([
      'Marche',
      'Course',
      'LegacyObs',
    ]);
  });

  it('excludes observables from the selected target category', () => {
    const options = buildConditionalObservableOptions(protocolItems, 'walk');

    expect(options.map((option) => option.value)).toEqual(['LegacyObs']);
  });
});
