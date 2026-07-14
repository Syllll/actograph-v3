import {
  MOBILE_GRAPH_STROKE_WIDTH_META_KEY,
  MOBILE_GRAPH_SUPPORT_CATEGORY_ID_META_KEY,
} from '../../utils/graph-preferences';

/**
 * Reproduit la logique de buildProtocolItemMetaWithGraphExtras (mobile)
 * pour valider le merge meta sans dépendre du package mobile.
 */
function mergeGraphExtrasIntoMeta(
  existingMeta: Record<string, unknown> | null | undefined,
  graphPreferences?: {
    strokeWidth?: number;
    supportCategoryId?: string | number;
  },
): Record<string, unknown> | null {
  const meta: Record<string, unknown> = { ...(existingMeta ?? {}) };

  if (graphPreferences?.strokeWidth !== undefined) {
    meta[MOBILE_GRAPH_STROKE_WIDTH_META_KEY] = graphPreferences.strokeWidth;
  }

  if (graphPreferences?.supportCategoryId) {
    meta[MOBILE_GRAPH_SUPPORT_CATEGORY_ID_META_KEY] = graphPreferences.supportCategoryId;
  }

  return Object.keys(meta).length > 0 ? meta : existingMeta ?? null;
}

describe('mobile meta merge (import 2e passe)', () => {
  it('préserve position et strokeWidth lors de la résolution supportCategoryId', () => {
    const existingMeta = {
      position: { x: 12, y: 34 },
      [MOBILE_GRAPH_STROKE_WIDTH_META_KEY]: 4,
    };

    const merged = mergeGraphExtrasIntoMeta(existingMeta, {
      supportCategoryId: '42',
    });

    expect(merged).toEqual({
      position: { x: 12, y: 34 },
      [MOBILE_GRAPH_STROKE_WIDTH_META_KEY]: 4,
      [MOBILE_GRAPH_SUPPORT_CATEGORY_ID_META_KEY]: '42',
    });
  });
});
