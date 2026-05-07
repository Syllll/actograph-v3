/**
 * Constantes de défauts visuels pour le graphique d'activité.
 *
 * Centralisées ici pour éviter toute divergence entre le rendu Pixi
 * (`packages/graph`) et les UI de personnalisation côté front/mobile.
 */

/**
 * Couleur par défaut appliquée à une catégorie ou un observable lorsque
 * aucune couleur n'est définie dans `graphPreferences`. Correspond à un vert
 * "success" (Tailwind `emerald-500`) cohérent avec la palette Pixi
 * (`pattern-textures.ts`).
 */
export const DEFAULT_GRAPH_COLOR = '#10b981';
