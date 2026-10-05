import type { Composer } from 'vue-i18n';
import type { IAutoCorrectAction } from '@actograph/core';
import { localizeAutoCorrectAction } from '../composables/use-observation/auto-correct-i18n';

describe('localizeAutoCorrectAction', () => {
  const action: IAutoCorrectAction = {
    type: 'reorder',
    reason: 'reposition_stop_after_last',
    description: 'fallback',
    relatedDate: new Date('2026-10-25T01:10:00.000Z'),
  };
  const t = ((key: string) => key) as Composer['t'];

  it('formats calendar action dates in the observation timezone', () => {
    const d = jest.fn(() => 'formatted') as unknown as Composer['d'];
    const result = localizeAutoCorrectAction(action, t, d, 'Europe/Paris');

    expect(result).toBe('readingsUi.autoCorrectRepositionStop');
    expect(d).toHaveBeenCalledWith(action.relatedDate, { timeZone: 'Europe/Paris' });
  });

  it('keeps the legacy formatter call when no timezone is supplied', () => {
    const d = jest.fn(() => 'formatted') as unknown as Composer['d'];
    localizeAutoCorrectAction(action, t, d);

    expect(d).toHaveBeenCalledWith(action.relatedDate);
  });
});
