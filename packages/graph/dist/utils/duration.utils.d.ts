/**
 * Duration management utilities
 */
export interface DurationParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}
/**
 * Converts milliseconds to duration parts
 */
export declare function millisecondsToParts(milliseconds: number): DurationParts;
/**
 * Formats duration in compact format: "Xj Yh Zm Ws Vms"
 */
export declare function formatCompact(milliseconds: number): string;
/**
 * Formats duration from a Date difference (date - t0)
 */
export declare function formatFromDate(date: Date, t0: Date): string;
/**
 * Choisit le format d'affichage approprié pour un label d'axe X
 * basé sur la durée totale de l'observation.
 *
 * @param date - La date à formater
 * @param totalDurationMs - Durée totale de l'observation en millisecondes
 * @returns Le label formaté
 */
export declare function formatAxisLabel(date: Date, totalDurationMs: number): string;
/**
 * Format adaptatif pour le mode chronomètre
 */
export declare function formatChronoAxisLabel(date: Date, t0: Date, totalDurationMs: number): string;
//# sourceMappingURL=duration.utils.d.ts.map