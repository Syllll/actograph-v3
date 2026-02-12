/**
 * Duration management composable
 * 
 * This composable provides utilities for formatting, parsing, and converting durations
 * in the format: days, hours, minutes, seconds, milliseconds
 */

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export const useDuration = () => {
  /**
   * Converts milliseconds to duration parts
   * 
   * @param milliseconds - Total milliseconds
   * @returns Duration parts object
   */
  const millisecondsToParts = (milliseconds: number): DurationParts => {
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
  };

  /**
   * Converts duration parts to milliseconds
   * 
   * @param parts - Duration parts object
   * @returns Total milliseconds
   */
  const partsToMilliseconds = (parts: DurationParts): number => {
    return (
      parts.days * 86400000 +
      parts.hours * 3600000 +
      parts.minutes * 60000 +
      parts.seconds * 1000 +
      parts.milliseconds
    );
  };

  /**
   * Formats duration in compact format: "Xj Yh Zm Ws Vms"
   * Example: "2j 3h 15m 30s 500ms" or "1h 30m 15s" or "45s 200ms"
   * 
   * @param milliseconds - Total milliseconds
   * @returns Formatted duration string
   */
  const formatCompact = (milliseconds: number): string => {
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
  };

  /**
   * Formats duration from a Date difference (date - t0)
   * 
   * @param date - The date to convert
   * @param t0 - The reference date (t0)
   * @returns Formatted duration string
   */
  const formatFromDate = (date: Date, t0: Date): string => {
    const milliseconds = date.getTime() - t0.getTime();
    return formatCompact(milliseconds);
  };

  /**
   * Parses a compact duration string to milliseconds
   * Supports formats like: "2j 3h 15m 30s 500ms", "1h 30m", "45s", etc.
   * 
   * @param durationStr - Duration string to parse
   * @returns Total milliseconds or 0 if parsing fails
   */
  const parseCompact = (durationStr: string): number => {
    const parts: DurationParts = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    };

    // Match patterns like "2j", "3h", "15m", "30s", "500ms"
    // Note: "ms" must appear before "m" and "s" in the alternation to match correctly
    const regex = /(\d+)(ms|j|h|m|s)/g;
    let match;

    while ((match = regex.exec(durationStr)) !== null) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 'j':
          parts.days = value;
          break;
        case 'h':
          parts.hours = value;
          break;
        case 'ms':
          parts.milliseconds = value;
          break;
        case 'm':
          parts.minutes = value;
          break;
        case 's':
          parts.seconds = value;
          break;
      }
    }

    return partsToMilliseconds(parts);
  };

  /**
   * Converts a duration (milliseconds) to a Date by adding it to t0
   * 
   * @param milliseconds - Duration in milliseconds
   * @param t0 - The reference date (t0)
   * @returns Date object
   */
  const durationToDate = (milliseconds: number, t0: Date): Date => {
    return new Date(t0.getTime() + milliseconds);
  };

  /**
   * Converts a Date to duration (milliseconds) by subtracting t0
   * 
   * @param date - The date to convert
   * @param t0 - The reference date (t0)
   * @returns Duration in milliseconds
   */
  const dateToDuration = (date: Date, t0: Date): number => {
    return date.getTime() - t0.getTime();
  };

  /**
   * Validates duration parts
   * 
   * @param parts - Duration parts to validate
   * @returns true if valid, false otherwise
   */
  const validateParts = (parts: Partial<DurationParts>): boolean => {
    if (parts.days !== undefined && (parts.days < 0 || !Number.isInteger(parts.days))) {
      return false;
    }
    if (parts.hours !== undefined && (parts.hours < 0 || parts.hours >= 24 || !Number.isInteger(parts.hours))) {
      return false;
    }
    if (parts.minutes !== undefined && (parts.minutes < 0 || parts.minutes >= 60 || !Number.isInteger(parts.minutes))) {
      return false;
    }
    if (parts.seconds !== undefined && (parts.seconds < 0 || parts.seconds >= 60 || !Number.isInteger(parts.seconds))) {
      return false;
    }
    if (parts.milliseconds !== undefined && (parts.milliseconds < 0 || parts.milliseconds >= 1000 || !Number.isInteger(parts.milliseconds))) {
      return false;
    }
    return true;
  };

  return {
    millisecondsToParts,
    partsToMilliseconds,
    formatCompact,
    formatFromDate,
    parseCompact,
    durationToDate,
    dateToDuration,
    validateParts,
  };
};

