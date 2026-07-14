/** Semi-transparent pointer so data points stay visible under the cursor. */
const SEMITRANSPARENT_POINTER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
  '<path d="M4 4 L4 20 L10 14 L14 20 L16 18 L12 12 L20 12 Z" fill="black" fill-opacity="0.35"/>' +
  '</svg>';

/** Idle cursor over the graph: faint pointer with crosshair fallback. */
export const GRAPH_CANVAS_CURSOR_IDLE =
  `url("data:image/svg+xml,${encodeURIComponent(SEMITRANSPARENT_POINTER_SVG)}") 4 4, crosshair`;

/** Cursor while panning the graph viewport. */
export const GRAPH_CANVAS_CURSOR_PANNING = 'grabbing';
