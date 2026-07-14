import {
  type IGraphPreferences,
  MOBILE_GRAPH_STROKE_WIDTH_META_KEY,
  MOBILE_GRAPH_SUPPORT_CATEGORY_ID_META_KEY,
  normalizeProtocolItemAction,
  resolvePortableGraphPreferencesOnImport,
} from '@actograph/core';
import type { IProtocolItemEntity } from '@database/repositories/protocol.repository';

type ProtocolItemUpdate = Partial<
  Pick<IProtocolItemEntity, 'color' | 'display_mode' | 'background_pattern' | 'action' | 'meta'>
>;

const EXPORT_META_STRIP_KEYS = [
  MOBILE_GRAPH_STROKE_WIDTH_META_KEY,
  MOBILE_GRAPH_SUPPORT_CATEGORY_ID_META_KEY,
] as const;

export function buildProtocolItemMetaWithGraphExtras(
  existingMeta: Record<string, unknown> | null | undefined,
  graphPreferences?: IGraphPreferences,
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

export function sanitizeMetaForExport(
  meta: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!meta) {
    return undefined;
  }

  const copy = { ...meta };
  for (const key of EXPORT_META_STRIP_KEYS) {
    delete copy[key];
  }

  return Object.keys(copy).length > 0 ? copy : undefined;
}

export function buildProtocolItemUpdatesFromGraphPreferences(
  graphPreferences?: IGraphPreferences,
): ProtocolItemUpdate {
  if (!graphPreferences) {
    return {};
  }

  const updates: ProtocolItemUpdate = {};

  if (graphPreferences.color) {
    updates.color = graphPreferences.color;
  }
  if (graphPreferences.displayMode) {
    updates.display_mode = graphPreferences.displayMode;
  }
  if (graphPreferences.backgroundPattern) {
    updates.background_pattern = graphPreferences.backgroundPattern;
  }

  return updates;
}

export function buildGraphPreferencesForMobileExport(
  item: Pick<IProtocolItemEntity, 'color' | 'display_mode' | 'background_pattern' | 'meta'>,
  categoryIdToName: ReadonlyMap<string, string>,
): IGraphPreferences | undefined {
  const prefs: IGraphPreferences = {};

  if (item.color) {
    prefs.color = item.color;
  }
  if (item.display_mode) {
    prefs.displayMode = item.display_mode as IGraphPreferences['displayMode'];
  }
  if (item.background_pattern) {
    prefs.backgroundPattern = item.background_pattern as IGraphPreferences['backgroundPattern'];
  }

  const meta = item.meta;
  if (typeof meta?.[MOBILE_GRAPH_STROKE_WIDTH_META_KEY] === 'number') {
    prefs.strokeWidth = meta[MOBILE_GRAPH_STROKE_WIDTH_META_KEY] as number;
  }

  const supportCategoryRef = meta?.[MOBILE_GRAPH_SUPPORT_CATEGORY_ID_META_KEY];
  if (supportCategoryRef !== undefined && supportCategoryRef !== null) {
    const supportCategoryName = categoryIdToName.get(String(supportCategoryRef));
    if (supportCategoryName) {
      prefs.supportCategoryName = supportCategoryName;
    }
  }

  return Object.keys(prefs).length > 0 ? prefs : undefined;
}

export function resolveImportedSupportCategoryForMobile(
  graphPreferences: IGraphPreferences | undefined,
  categoryNameToId: ReadonlyMap<string, number>,
): IGraphPreferences | undefined {
  const portableNameToId = new Map<string, string>(
    [...categoryNameToId.entries()].map(([name, id]) => [name, String(id)]),
  );

  return resolvePortableGraphPreferencesOnImport(graphPreferences, portableNameToId);
}

export function normalizeImportedCategoryAction(action?: string): 'continuous' | 'discrete' {
  return normalizeProtocolItemAction(action);
}
