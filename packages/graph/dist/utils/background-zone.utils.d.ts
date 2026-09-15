import type { ProtocolItem } from './protocol.utils';
import type { GraphContext } from '../engine/GraphContext';
export interface BackgroundZone {
    topY: number;
    height: number;
}
/**
 * Bande verticale d'un arrière-plan.
 * - sans `supportCategoryId` : tout le graphe (toutes les autres catégories)
 * - avec une cible : uniquement la bande Y de cette catégorie
 * - cible introuvable / déjà en arrière-plan / sans ticks : hauteur 0
 *   (jamais de repli silencieux sur tout le graphe)
 */
export declare function getBackgroundZoneForCategory(ctx: GraphContext, category: ProtocolItem, fullZoneTopY: number, fullZoneBottomY: number): BackgroundZone;
//# sourceMappingURL=background-zone.utils.d.ts.map