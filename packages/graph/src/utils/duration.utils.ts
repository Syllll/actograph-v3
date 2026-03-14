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

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Converts milliseconds to duration parts
 */
export function millisecondsToParts(milliseconds: number): DurationParts {
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
export function formatCompact(milliseconds: number): string {
  const parts = millisecondsToParts(milliseconds);
  const components: string[] = [];
  
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
export function formatFromDate(date: Date, t0: Date): string {
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
export function formatAxisLabel(date: Date, totalDurationMs: number): string {
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
  } else if (totalDurationMs >= 24 * 60 * 60 * 1000) {
    // >= 24h : JJ/MM HH:mm:ss
    return `${dd}/${MM} ${HH}:${mm}:${ss}`;
  } else if (totalDurationMs >= 60 * 60 * 1000) {
    // >= 1h : JJ/MM HH:mm:ss (évite l'ambiguïté entre jours)
    return `${dd}/${MM} ${HH}:${mm}:${ss}`;
  } else if (totalDurationMs >= 60 * 1000) {
    // >= 1min : HH:mm:ss.SSS
    return `${HH}:${mm}:${ss}.${SSS}`;
  } else {
    // < 1min : HH:mm:ss.SSS
    return `${HH}:${mm}:${ss}.${SSS}`;
  }
}

/**
 * Format adaptatif pour le mode chronomètre
 */
export function formatChronoAxisLabel(
  date: Date,
  t0: Date,
  totalDurationMs: number
): string {
  const ms = date.getTime() - t0.getTime();
  const parts = millisecondsToParts(ms);

  if (totalDurationMs >= 24 * 60 * 60 * 1000) {
    // >= 24h : Xj Yh Zm
    const components: string[] = [];
    if (parts.days > 0) components.push(`${parts.days}j`);
    components.push(`${parts.hours}h`);
    components.push(`${String(parts.minutes).padStart(2, '0')}m`);
    return components.join(' ');
  } else if (totalDurationMs >= 60 * 60 * 1000) {
    // >= 1h : Yh Zm Ws
    return `${parts.hours}h ${String(parts.minutes).padStart(2, '0')}m ${String(parts.seconds).padStart(2, '0')}s`;
  } else if (totalDurationMs >= 60 * 1000) {
    // >= 1min : Zm Ws
    const totalMinutes = parts.days * 24 * 60 + parts.hours * 60 + parts.minutes;
    return `${totalMinutes}m ${String(parts.seconds).padStart(2, '0')}s`;
  } else {
    // < 1min : Ws Vms
    return `${parts.seconds}s ${String(parts.milliseconds).padStart(3, '0')}ms`;
  }
}

