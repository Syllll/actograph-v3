import { DisplayModeEnum } from '@actograph/core';
import type { GraphContext } from '../../engine/GraphContext';
import type { PatternTextureStore } from '../../gpu/PatternTextureStore';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../../types/graph-render-options';

export function createMockGraphContext(
  overrides: Partial<GraphContext> = {},
): GraphContext {
  return {
    observation: null,
    protocol: null,
    patternStore: {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as unknown as PatternTextureStore,
    graphRenderOptions: { ...DEFAULT_GRAPH_RENDER_OPTIONS },
    axisStretch: { x: 1, y: 1 },
    pausePeriods: [],
    readingsPerCategory: [],
    getYPos: () => 100,
    getDateTimePos: () => 50,
    getAxisBounds: () => ({
      bottomLeft: { x: 0, y: 400 },
      topRight: { x: 800, y: 0 },
    }),
    getFriezeInfo: () => ({
      startY: 0,
      endY: 40,
      height: 40,
      centerY: 20,
    }),
    getObservablePreferences: () => null,
    getCategoryById: () => null,
    getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
    ...overrides,
  };
}
