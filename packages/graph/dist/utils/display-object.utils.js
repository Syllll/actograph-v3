/**
 * PixiJS v8 Graphics.destroy() only frees the owned GraphicsContext when
 * called with no options, `true`, or `{ context: true }`. Passing
 * `{ children: true }` alone leaks the context in the renderer cache.
 */
export const PIXI_DESTROY_OWNED = {
    children: true,
    context: true,
};
/** True when a PixiJS display object has already been destroyed. */
export function isPixiDestroyed(obj) {
    return obj.destroyed === true;
}
//# sourceMappingURL=display-object.utils.js.map