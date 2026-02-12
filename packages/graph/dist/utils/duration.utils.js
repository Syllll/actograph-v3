/**
 * Duration management utilities
 */
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
    if (totalDurationMs >= 7 * 24 * 60 * 60 * 1000) {
        // >= 7 jours : JJ/MM/AAAA
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
    else if (totalDurationMs >= 24 * 60 * 60 * 1000) {
        // >= 24h : JJ/MM HH:mm
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    else if (totalDurationMs >= 60 * 60 * 1000) {
        // >= 1h : HH:mm
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    else if (totalDurationMs >= 60 * 1000) {
        // >= 1min : HH:mm:ss
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }
    else {
        // < 1min : mm:ss.SSS
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        const ms = String(date.getMilliseconds()).padStart(3, '0');
        return `${mm}:${ss}.${ms}`;
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
//# sourceMappingURL=duration.utils.js.map