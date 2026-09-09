/**
 * PixiJS v8 Graphics.destroy() only frees the owned GraphicsContext when
 * called with no options, `true`, or `{ context: true }`. Passing
 * `{ children: true }` alone leaks the context in the renderer cache.
 */
export declare const PIXI_DESTROY_OWNED: {
    readonly children: true;
    readonly context: true;
};
/** True when a PixiJS display object has already been destroyed. */
export declare function isPixiDestroyed(obj: {
    destroyed?: boolean;
}): boolean;
//# sourceMappingURL=display-object.utils.d.ts.map