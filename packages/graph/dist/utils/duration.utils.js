/**
 * Duration management utilities
 */
import { TimeDisplayFormatEnum } from '@actograph/core';
function pad2(value) {
    return String(value).padStart(2, '0');
}
/**
 * Converts milliseconds to duration parts
 */
export function millisecondsToParts(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const ms = milliseconds % 1000;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
        days,
        hours,
        minutes,
        seconds,
        milliseconds: Math.floor(ms),
    };
}
/**
 * Formats duration in compact format: "Xj Yh Zm Ws Vms"
 */
export function formatCompact(milliseconds) {
    const parts = millisecondsToParts(milliseconds);
    const components = [];
    if (parts.days > 0) {
        components.push(`${parts.days}j`);
    }
    if (parts.hours > 0) {
        components.push(`${parts.hours}h`);
    }
    if (parts.minutes > 0) {
        components.push(`${parts.minutes}m`);
    }
    if (parts.seconds > 0) {
        components.push(`${parts.seconds}s`);
    }
    if (parts.milliseconds > 0 || components.length === 0) {
        components.push(`${parts.milliseconds}ms`);
    }
    return components.join(' ');
}
/**
 * Formats duration from a Date difference (date - t0)
 */
export function formatFromDate(date, t0) {
    const milliseconds = date.getTime() - t0.getTime();
    return formatCompact(milliseconds);
}
/**
 * Choisit le format d'affichage approprié pour un label d'axe X
 * basé sur la durée totale de l'observation.
 *
 * @param date - La date à formater
 * @param totalDurationMs - Durée totale de l'observation en millisecondes
 * @returns Le label formaté
 */
export function formatAxisLabel(date, totalDurationMs) {
    const dd = pad2(date.getDate());
    const MM = pad2(date.getMonth() + 1);
    const yyyy = String(date.getFullYear());
    const HH = pad2(date.getHours());
    const mm = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    const SSS = String(date.getMilliseconds()).padStart(3, '0');
    if (totalDurationMs >= 7 * 24 * 60 * 60 * 1000) {
        // >= 7 jours : date+heure complète (lisible grâce aux labels diagonaux).
        return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
    }
    else if (totalDurationMs >= 24 * 60 * 60 * 1000) {
        // >= 24h : JJ/MM HH:mm:ss
        return `${dd}/${MM} ${HH}:${mm}:${ss}`;
    }
    else if (totalDurationMs >= 60 * 60 * 1000) {
        // >= 1h : JJ/MM HH:mm:ss (évite l'ambiguïté entre jours)
        return `${dd}/${MM} ${HH}:${mm}:${ss}`;
    }
    else if (totalDurationMs >= 60 * 1000) {
        // >= 1min : HH:mm:ss.SSS
        return `${HH}:${mm}:${ss}.${SSS}`;
    }
    else {
        // < 1min : HH:mm:ss.SSS
        return `${HH}:${mm}:${ss}.${SSS}`;
    }
}
/**
 * Format adaptatif pour le mode chronomètre
 */
export function formatChronoAxisLabel(date, t0, totalDurationMs) {
    const ms = date.getTime() - t0.getTime();
    const parts = millisecondsToParts(ms);
    if (totalDurationMs >= 24 * 60 * 60 * 1000) {
        // >= 24h : Xj Yh Zm
        const components = [];
        if (parts.days > 0)
            components.push(`${parts.days}j`);
        components.push(`${parts.hours}h`);
        components.push(`${String(parts.minutes).padStart(2, '0')}m`);
        return components.join(' ');
    }
    else if (totalDurationMs >= 60 * 60 * 1000) {
        // >= 1h : Yh Zm Ws
        return `${parts.hours}h ${String(parts.minutes).padStart(2, '0')}m ${String(parts.seconds).padStart(2, '0')}s`;
    }
    else if (totalDurationMs >= 60 * 1000) {
        // >= 1min : Zm Ws
        const totalMinutes = parts.days * 24 * 60 + parts.hours * 60 + parts.minutes;
        return `${totalMinutes}m ${String(parts.seconds).padStart(2, '0')}s`;
    }
    else {
        // < 1min : Ws Vms
        return `${parts.seconds}s ${String(parts.milliseconds).padStart(3, '0')}ms`;
    }
}
/**
 * Formate une date absolue (mode calendrier) selon une granularité fixe
 * choisie par l'utilisateur (réglage "Format d'affichage du temps" du
 * graphe). N'est appelée que lorsque le format n'est pas `Auto` : le
 * comportement adaptatif historique (formatAxisLabel) reste inchangé.
 */
export function formatCalendarFixed(date, format) {
    const dd = pad2(date.getDate());
    const MM = pad2(date.getMonth() + 1);
    const yyyy = String(date.getFullYear());
    const HH = pad2(date.getHours());
    const mm = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    const SSS = String(date.getMilliseconds()).padStart(3, '0');
    switch (format) {
        case TimeDisplayFormatEnum.Full:
            return `${dd}.${MM}.${yyyy} ${HH}:${mm}:${ss}:${SSS}`;
        case TimeDisplayFormatEnum.DateOnly:
            return `${dd}.${MM}.${yyyy}`;
        case TimeDisplayFormatEnum.HourMinute:
            return `${HH}:${mm}`;
        case TimeDisplayFormatEnum.HourMinuteSecond:
            return `${HH}:${mm}:${ss}`;
        case TimeDisplayFormatEnum.MinuteSecond:
            return `${mm}:${ss}`;
        case TimeDisplayFormatEnum.MinuteSecondMs:
            return `${mm}:${ss}:${SSS}`;
    }
}
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
export function formatChronometerFixed(date, t0, format) {
    const ms = date.getTime() - t0.getTime();
    const parts = millisecondsToParts(ms);
    const totalHours = parts.days * 24 + parts.hours;
    const totalMinutes = totalHours * 60 + parts.minutes;
    switch (format) {
        case TimeDisplayFormatEnum.Full:
            return formatCompact(ms);
        case TimeDisplayFormatEnum.DateOnly:
            return `${parts.days}j`;
        case TimeDisplayFormatEnum.HourMinute:
            return `${totalHours}h${pad2(parts.minutes)}m`;
        case TimeDisplayFormatEnum.HourMinuteSecond:
            return `${totalHours}h${pad2(parts.minutes)}m${pad2(parts.seconds)}s`;
        case TimeDisplayFormatEnum.MinuteSecond:
            return `${totalMinutes}m${pad2(parts.seconds)}s`;
        case TimeDisplayFormatEnum.MinuteSecondMs:
            return `${totalMinutes}m${pad2(parts.seconds)}s${String(parts.milliseconds).padStart(3, '0')}ms`;
    }
}
//# sourceMappingURL=duration.utils.js.map