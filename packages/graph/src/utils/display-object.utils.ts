/** True when a PixiJS display object has already been destroyed. */
export function isPixiDestroyed(obj: { destroyed?: boolean }): boolean {
  return obj.destroyed === true;
}
