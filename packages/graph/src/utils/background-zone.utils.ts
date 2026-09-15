import { DisplayModeEnum, ProtocolItemTypeEnum } from '@actograph/core';
import type { ProtocolItem } from './protocol.utils';
import type { GraphContext } from '../engine/GraphContext';
import { Y_AXIS_LAYOUT } from '../lib/axis-layout.constants';

export interface BackgroundZone {
  topY: number;
  height: number;
}

function fullChartZone(fullZoneTopY: number, fullZoneBottomY: number): BackgroundZone {
  return {
    topY: fullZoneTopY,
    height: Math.max(0, fullZoneBottomY - fullZoneTopY),
  };
}

function emptyZone(fullZoneTopY: number): BackgroundZone {
  return {
    topY: fullZoneTopY,
    height: 0,
  };
}

function clampVerticalBand(
  top: number,
  bottom: number,
  fullZoneTopY: number,
  fullZoneBottomY: number,
): BackgroundZone {
  const bandTop = Math.min(top, bottom);
  const bandBottom = Math.max(top, bottom);
  const clampedTop = Math.max(fullZoneTopY, bandTop);
  const clampedBottom = Math.min(fullZoneBottomY, bandBottom);
  return {
    topY: clampedTop,
    height: Math.max(0, clampedBottom - clampedTop),
  };
}

function isResolvedYPos(pos: number): boolean {
  return Number.isFinite(pos) && pos !== -1;
}

function isObservableItem(item: ProtocolItem): boolean {
  if (!item?.name) {
    return false;
  }
  if (!item.type) {
    return true;
  }
  return item.type.toLowerCase() === ProtocolItemTypeEnum.Observable;
}

/**
 * Bande verticale d'un arrière-plan.
 * - sans `supportCategoryId` : tout le graphe (toutes les autres catégories)
 * - avec une cible : uniquement la bande Y de cette catégorie
 * - cible introuvable / déjà en arrière-plan / sans ticks : hauteur 0
 *   (jamais de repli silencieux sur tout le graphe)
 */
export function getBackgroundZoneForCategory(
  ctx: GraphContext,
  category: ProtocolItem,
  fullZoneTopY: number,
  fullZoneBottomY: number,
): BackgroundZone {
  const supportCategoryId = category.graphPreferences?.supportCategoryId;
  if (!supportCategoryId) {
    return fullChartZone(fullZoneTopY, fullZoneBottomY);
  }

  const supportCategory = ctx.getCategoryById(supportCategoryId);
  if (!supportCategory) {
    return emptyZone(fullZoneTopY);
  }

  const supportMode = ctx.getEffectiveDisplayMode(supportCategory);
  if (supportMode === DisplayModeEnum.Background) {
    return emptyZone(fullZoneTopY);
  }

  if (supportMode === DisplayModeEnum.Frieze) {
    const friezeInfo = ctx.getFriezeInfo(supportCategory.id);
    if (!friezeInfo) {
      return emptyZone(fullZoneTopY);
    }
    return clampVerticalBand(
      friezeInfo.startY,
      friezeInfo.endY,
      fullZoneTopY,
      fullZoneBottomY,
    );
  }

  const supportYPositions = (supportCategory.children || [])
    .filter(isObservableItem)
    .map((observable) => ctx.getYPos(supportCategory.id, observable.name))
    .filter(isResolvedYPos);

  if (supportYPositions.length === 0) {
    return emptyZone(fullZoneTopY);
  }

  const rowHalfHeight = Y_AXIS_LAYOUT.OBSERVABLE_HEIGHT / 2;
  return clampVerticalBand(
    Math.min(...supportYPositions) - rowHalfHeight,
    Math.max(...supportYPositions) + rowHalfHeight,
    fullZoneTopY,
    fullZoneBottomY,
  );
}
