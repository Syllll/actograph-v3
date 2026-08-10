import { DirtyRegistry } from '../engine/DirtyRegistry';
import type { LayerId } from '../engine/types';

describe('DirtyRegistry', () => {
  const layerIds: LayerId[] = [
    'background',
    'series',
    'frieze',
    'pause',
    'axis',
    'hover',
  ];

  function createRegistry(): DirtyRegistry {
    const registry = new DirtyRegistry();
    for (const id of layerIds) {
      registry.register(id);
    }
    return registry;
  }

  it('registers layers with clean default state', () => {
    const registry = createRegistry();
    expect(registry.get('axis')).toEqual({ dirty: 'none', midDraw: false });
    expect(registry.isAnyDirty()).toBe(false);
    expect(registry.isAnyUnsafeToPaint()).toBe(false);
  });

  it('invalidates a single layer and merges flags', () => {
    const registry = createRegistry();
    registry.invalidate('series', 'viewport');
    registry.invalidate('series', 'full');
    expect(registry.get('series')?.dirty).toBe('full');
    expect(registry.isAnyDirty()).toBe(true);
    expect(registry.get('axis')?.dirty).toBe('none');
  });

  it('stores invalidate scope per layer', () => {
    const registry = createRegistry();
    registry.invalidate('frieze', 'style', { categoryId: 'cat-1' });
    expect(registry.get('frieze')?.scope).toEqual({ categoryId: 'cat-1' });
  });

  it('invalidates all registered layers', () => {
    const registry = createRegistry();
    registry.invalidateAll('layout');
    for (const id of layerIds) {
      expect(registry.get(id)?.dirty).toBe('layout');
    }
  });

  it('marks and resets midDraw for all layers', () => {
    const registry = createRegistry();
    registry.markAllMidDraw();
    expect(registry.isAnyUnsafeToPaint()).toBe(true);
    for (const id of layerIds) {
      expect(registry.get(id)?.midDraw).toBe(true);
    }
    registry.resetAllMidDraw();
    expect(registry.isAnyUnsafeToPaint()).toBe(false);
    for (const id of layerIds) {
      expect(registry.get(id)?.midDraw).toBe(false);
    }
  });

  it('ensure creates missing layer state on demand', () => {
    const registry = new DirtyRegistry();
    const state = registry.ensure('hover');
    expect(state).toEqual({ dirty: 'none', midDraw: false });
    expect(registry.get('hover')).toBe(state);
  });

  it('mirrors executeDrawBody failure: midDraw stays until a later successful draw', () => {
    const registry = createRegistry();
    let drawInProgress = false;

    const executeDrawBodyFail = () => {
      drawInProgress = true;
      try {
        registry.markAllMidDraw();
        throw new Error('draw failed');
      } catch {
        registry.invalidateAll('full');
        registry.markAllMidDraw();
        throw new Error('draw failed');
      } finally {
        // Success-only reset lives outside finally; failure keeps midDraw.
        drawInProgress = false;
      }
    };

    const executeDrawBodySuccess = () => {
      drawInProgress = true;
      try {
        registry.markAllMidDraw();
        registry.resetAllMidDraw();
      } finally {
        drawInProgress = false;
      }
    };

    expect(() => executeDrawBodyFail()).toThrow('draw failed');
    expect(drawInProgress).toBe(false);
    expect(registry.isAnyUnsafeToPaint()).toBe(true);
    expect(registry.isAnyDirty()).toBe(true);

    executeDrawBodySuccess();
    expect(registry.isAnyUnsafeToPaint()).toBe(false);
  });
});
