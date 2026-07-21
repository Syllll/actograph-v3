export interface ViewportState {
  x: number;
  y: number;
  /** Échelle horizontale (temps). Distincte de scaleY pour permettre l'étirement de l'axe X indépendamment. */
  scaleX: number;
  /** Échelle verticale (catégories). Distincte de scaleX pour permettre la compaction de l'axe Y indépendamment. */
  scaleY: number;
}

export interface WorldBounds {
  width: number;
  height: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

const DEFAULT_OVERSCROLL_MARGIN = 24;

/** True when CSS/bitmap dimensions are too small to paint a meaningful frame. */
export function isDegenerateCanvasSize(width: number, height: number): boolean {
  return width <= 2 || height <= 2;
}

/**
 * Scale initial (uniforme) pour faire tenir le plot entier dans le canvas (mode interactif).
 * Ne zoome pas au-delà de 1 si le contenu est déjà plus petit que le canvas.
 * Reste volontairement une échelle unique : c'est la base du zoom pan/molette/+- ;
 * l'étirement par axe (axisStretch) est composé par-dessus par l'appelant.
 */
export function computeFitScale(
  worldBounds: WorldBounds,
  canvasSize: CanvasSize,
  minScale: number,
  maxScale: number,
): number {
  if (worldBounds.width <= 0 || worldBounds.height <= 0) {
    return 1;
  }

  const scaleX = canvasSize.width / worldBounds.width;
  const scaleY = canvasSize.height / worldBounds.height;
  const rawFit = Math.min(scaleX, scaleY, 1);

  return Math.max(minScale, Math.min(maxScale, rawFit));
}

/**
 * Position du viewport pour centrer le plot quand il est plus petit que le canvas.
 */
export function computeFitViewportPosition(
  worldBounds: WorldBounds,
  canvasSize: CanvasSize,
  scaleX: number,
  scaleY: number,
): { x: number; y: number } {
  const scaledWidth = worldBounds.width * scaleX;
  const scaledHeight = worldBounds.height * scaleY;

  const x = scaledWidth < canvasSize.width ? (canvasSize.width - scaledWidth) / 2 : 0;
  const y = scaledHeight < canvasSize.height ? (canvasSize.height - scaledHeight) / 2 : 0;

  return { x, y };
}

/**
 * Borne le viewport pour éviter de montrer une zone vide hors du plot.
 * scaleX/scaleY sont bornés indépendamment (largeur contre scaleX, hauteur contre scaleY).
 */
export function clampViewport(
  viewport: ViewportState,
  worldBounds: WorldBounds,
  canvasSize: CanvasSize,
  margin = DEFAULT_OVERSCROLL_MARGIN,
): ViewportState {
  const { scaleX, scaleY } = viewport;
  const scaledWidth = worldBounds.width * scaleX;
  const scaledHeight = worldBounds.height * scaleY;

  let x = viewport.x;
  let y = viewport.y;

  if (scaledWidth <= canvasSize.width) {
    x = (canvasSize.width - scaledWidth) / 2;
  } else {
    const minX = canvasSize.width - scaledWidth - margin;
    const maxX = margin;
    x = Math.max(minX, Math.min(maxX, x));
  }

  if (scaledHeight <= canvasSize.height) {
    y = (canvasSize.height - scaledHeight) / 2;
  } else {
    const minY = canvasSize.height - scaledHeight - margin;
    const maxY = margin;
    y = Math.max(minY, Math.min(maxY, y));
  }

  return { x, y, scaleX, scaleY };
}

/**
 * Fit viewport for a given world size and canvas (used on init, export, resize).
 * Le fit reste uniforme (scaleX === scaleY) : c'est la base neutre avant application
 * de l'étirement par axe par l'appelant (PixiApp.axisStretch).
 */
export function computeFitViewport(
  worldBounds: WorldBounds,
  canvasSize: CanvasSize,
  minScale: number,
  maxScale: number,
): ViewportState {
  const scale = computeFitScale(worldBounds, canvasSize, minScale, maxScale);
  const position = computeFitViewportPosition(worldBounds, canvasSize, scale, scale);
  return { scaleX: scale, scaleY: scale, x: position.x, y: position.y };
}

/**
 * Re-clamps the current viewport after a canvas resize (preserves user zoom).
 */
export function preserveViewportOnResize(
  viewport: ViewportState,
  worldBounds: WorldBounds,
  canvasSize: CanvasSize,
): ViewportState {
  return clampViewport(viewport, worldBounds, canvasSize);
}
