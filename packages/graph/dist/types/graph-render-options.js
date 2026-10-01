/**
 * Graph-level render options (not per-category protocol preferences).
 */
import { TimeDisplayFormatEnum } from '@actograph/core';
export const DEFAULT_GRAPH_RENDER_OPTIONS = {
    maskPauses: false,
    timeDisplayFormat: TimeDisplayFormatEnum.Auto,
};
function resolvedMaskPauses(options) {
    return options.maskPauses ?? DEFAULT_GRAPH_RENDER_OPTIONS.maskPauses;
}
function resolvedTimeDisplayFormat(options) {
    return options.timeDisplayFormat ?? DEFAULT_GRAPH_RENDER_OPTIONS.timeDisplayFormat;
}
/** True when format or pause-mask actually differ (omitted fields use defaults). */
export function hasGraphRenderOptionsChanged(previous, next) {
    return (resolvedTimeDisplayFormat(previous) !== resolvedTimeDisplayFormat(next) ||
        resolvedMaskPauses(previous) !== resolvedMaskPauses(next));
}
/**
 * True when the only meaningful change is the time display format.
 * A pause-mask change still needs a world rebuild (pause overlay geometry).
 */
export function isTimeFormatOnlyChange(previous, next) {
    const formatChanged = resolvedTimeDisplayFormat(previous) !== resolvedTimeDisplayFormat(next);
    const maskPausesChanged = resolvedMaskPauses(previous) !== resolvedMaskPauses(next);
    return formatChanged && !maskPausesChanged;
}
//# sourceMappingURL=graph-render-options.js.map