import { Texture, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum, normalizeGraphColor } from '@actograph/core';
import { DEFAULT_GRAPH_COLOR } from './graph-defaults';

/**
 * Cache pour les textures de motifs.
 */
const textureCache = new Map<string, Texture>();

const PATTERN_SIZE = 16;
const LINE_WIDTH = 1;
const LINE_SPACING = 8;

function drawHorizontalLines(ctx: CanvasRenderingContext2D, color: string, size: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  
  for (let y = LINE_SPACING / 2; y < size; y += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

function drawVerticalLines(ctx: CanvasRenderingContext2D, color: string, size: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  
  for (let x = LINE_SPACING / 2; x < size; x += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
}

function drawDiagonalLines(ctx: CanvasRenderingContext2D, color: string, size: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  
  for (let startY = LINE_SPACING; startY <= size; startY += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(startY, 0);
    ctx.stroke();
  }
  
  for (let startX = LINE_SPACING; startX < size; startX += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(startX, size);
    ctx.lineTo(size, size - (size - startX));
    ctx.stroke();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, color: string, size: number): void {
  drawHorizontalLines(ctx, color, size);
  drawVerticalLines(ctx, color, size);
}

function drawDots(ctx: CanvasRenderingContext2D, color: string, size: number): void {
  ctx.fillStyle = color;
  const dotRadius = 1;
  
  for (let x = LINE_SPACING / 2; x < size; x += LINE_SPACING) {
    for (let y = LINE_SPACING / 2; y < size; y += LINE_SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function createPatternCanvas(pattern: BackgroundPatternEnum, hexColor: string): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = PATTERN_SIZE;
  canvas.height = PATTERN_SIZE;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get 2D context for pattern canvas');
    return null;
  }
  
  ctx.clearRect(0, 0, PATTERN_SIZE, PATTERN_SIZE);

  switch (pattern) {
    case BackgroundPatternEnum.Horizontal:
      drawHorizontalLines(ctx, hexColor, PATTERN_SIZE);
      break;
    case BackgroundPatternEnum.Vertical:
      drawVerticalLines(ctx, hexColor, PATTERN_SIZE);
      break;
    case BackgroundPatternEnum.Diagonal:
      drawDiagonalLines(ctx, hexColor, PATTERN_SIZE);
      break;
    case BackgroundPatternEnum.Grid:
      drawGrid(ctx, hexColor, PATTERN_SIZE);
      break;
    case BackgroundPatternEnum.Dots:
      drawDots(ctx, hexColor, PATTERN_SIZE);
      break;
    default:
      return null;
  }
  
  return canvas;
}

/**
 * Crée une texture PixiJS à partir d'un pattern via Canvas.
 */
export function createPatternTexture(
  _app: unknown,
  pattern: BackgroundPatternEnum,
  color: string
): Texture | null {
  if (pattern === BackgroundPatternEnum.Solid) {
    return null;
  }

  const hexColor = normalizeGraphColor(color, DEFAULT_GRAPH_COLOR);
  const cacheKey = `${pattern}-${hexColor}`;
  const cachedTexture = textureCache.get(cacheKey);
  if (cachedTexture) {
    return cachedTexture;
  }

  try {
    const canvas = createPatternCanvas(pattern, hexColor);
    if (!canvas) {
      return null;
    }
    
    const texture = Texture.from(canvas);
    textureCache.set(cacheKey, texture);
    
    return texture;
  } catch (error) {
    console.error(`Failed to create pattern texture for ${pattern} with color ${color}:`, error);
    return null;
  }
}

/**
 * Crée un TilingSprite qui répète le motif avec une échelle constante.
 */
export function createTilingPatternSprite(
  pattern: BackgroundPatternEnum,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
): TilingSprite | null {
  if (pattern === BackgroundPatternEnum.Solid) {
    return null;
  }

  const texture = createPatternTexture(null, pattern, color);
  if (!texture) {
    return null;
  }

  const tilingSprite = new TilingSprite({
    texture,
    width,
    height,
  });
  
  tilingSprite.x = x;
  tilingSprite.y = y;

  return tilingSprite;
}

/**
 * Nettoie le cache des textures.
 */
export function clearPatternTextureCache(): void {
  for (const texture of textureCache.values()) {
    texture.destroy(true);
  }
  textureCache.clear();
}

