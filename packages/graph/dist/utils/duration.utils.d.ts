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
//# sourceMappingURL=duration.utils.d.ts.map