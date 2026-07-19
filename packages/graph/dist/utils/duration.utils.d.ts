/**
 * Duration management utilities
 */
import { TimeDisplayFormatEnum } from '@actograph/core';
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
/** Toutes les valeurs de TimeDisplayFormatEnum sauf Auto (qui garde le comportement adaptatif ci-dessus). */
export type FixedTimeDisplayFormat = Exclude<TimeDisplayFormatEnum, TimeDisplayFormatEnum.Auto>;
/**
 * Formate une date absolue (mode calendrier) selon une granularité fixe
 * choisie par l'utilisateur (réglage "Format d'affichage du temps" du
 * graphe). N'est appelée que lorsque le format n'est pas `Auto` : le
 * comportement adaptatif historique (formatAxisLabel) reste inchangé.
 */
export declare function formatCalendarFixed(date: Date, format: FixedTimeDisplayFormat): string;
/**
 * Notation courte d'un format fixe, affichée en mention sous la flèche de
 * fin d'axe X (mode calendrier uniquement — voir x-axis.ts) pour lever
 * l'ambiguïté entre formats de même forme visuelle (ex: hh:mn vs mn:sec,
 * ou l'ordre JJ/MM d'une date pour un lecteur habitué au format anglo-saxon
 * MM/DD). Non utilisée en mode chronomètre : chaque valeur y porte déjà
 * son unité en toutes lettres (ex. "62m03s"), donc pas d'ambiguïté.
 */
export declare function getCalendarFixedFormatNotation(format: FixedTimeDisplayFormat): string;
/**
 * Formate une durée écoulée depuis t0 (mode chronomètre) selon une
 * granularité fixe choisie par l'utilisateur. N'est appelée que lorsque le
 * format n'est pas `Auto` : le comportement adaptatif historique
 * (formatChronoAxisLabel) reste inchangé.
 *
 * Note : les formats "date" (Full, DateOnly) n'ont pas d'équivalent naturel
 * en mode chronomètre puisqu'il n'y a pas de date de calendrier, seulement
 * une durée écoulée depuis CHRONOMETER_T0 — Full retombe donc sur la durée
 * complète (jours/heures/min/sec/ms) et DateOnly sur le nombre de jours
 * écoulés. À valider avec Sylvain (voir spec).
 */
export declare function formatChronometerFixed(date: Date, t0: Date, format: FixedTimeDisplayFormat): string;
//# sourceMappingURL=duration.utils.d.ts.map