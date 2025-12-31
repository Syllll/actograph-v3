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

