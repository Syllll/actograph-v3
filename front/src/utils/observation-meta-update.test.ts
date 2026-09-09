import { mergeMetaIfSameObservation } from './observation-meta-update';

describe('mergeMetaIfSameObservation', () => {
  it('merges meta when the current observation is still the saved one', () => {
    const current = { id: 'obs-a', name: 'A', meta: { graphXStretch: 1 } };
    const next = mergeMetaIfSameObservation(current, 'obs-a', {
      graphXStretch: 2,
      graphYCompact: 0.8,
    });

    expect(next).toEqual({
      id: 'obs-a',
      name: 'A',
      meta: { graphXStretch: 2, graphYCompact: 0.8 },
    });
  });

  it('discards a stale response after switching chronicle', () => {
    const currentB = { id: 'obs-b', name: 'B', meta: { graphXStretch: 1 } };
    const fromA = { graphXStretch: 2, graphYCompact: 0.8 };

    expect(mergeMetaIfSameObservation(currentB, 'obs-a', fromA)).toBeNull();
  });

  it('returns null when meta is missing', () => {
    const current = { id: 'obs-a', meta: {} };
    expect(mergeMetaIfSameObservation(current, 'obs-a', undefined)).toBeNull();
  });
});
