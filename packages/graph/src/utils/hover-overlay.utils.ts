export interface IHoverOverlayState {
  interactive: boolean;
  suppressed: boolean;
}

/** Whether hover crosshair and dynamic time label should be rendered. */
export function shouldRenderHoverOverlay(state: IHoverOverlayState): boolean {
  return state.interactive && !state.suppressed;
}
