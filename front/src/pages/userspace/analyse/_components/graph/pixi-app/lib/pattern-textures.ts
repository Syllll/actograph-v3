import { Texture } from 'pixi.js';
import { BackgroundPatternEnum } from '@services/observations/interface';

/**
 * Cache pour les textures de motifs.
 * Clé : `${pattern}-${color}`
 */
const textureCache = new Map<string, Texture>();

/**
 * Taille de la texture de motif (en pixels).
 * Les motifs seront répétés (tiled) pour remplir les zones.
 * Augmenté pour avoir des lignes plus fines visuellement.
 */
const PATTERN_SIZE = 32;

/**
 * Épaisseur des lignes des motifs.
 * Peut être ajusté entre 1 et 3 pixels selon les besoins.
 */
const LINE_WIDTH = 1;

/**
 * Espacement entre les lignes/points.
 * Augmenté pour avoir un motif plus espacé et des lignes plus fines visuellement.
 */
const LINE_SPACING = 8;

/**
 * Convertit une couleur (hex ou nommée) en format hex avec #.
 */
function colorToHex(color: string): string {
  const cleanColor = color.replace('#', '').toLowerCase();
  
  // Si c'est déjà une valeur hex valide
  if (/^[0-9a-f]{6}$/.test(cleanColor)) {
    return `#${cleanColor}`;
  }
  
  // Couleurs nommées CSS courantes
  const namedColors: Record<string, string> = {
    'green': '#10b981',
    'grey': '#6b7280',
    'gray': '#6b7280',
    'red': '#ef4444',
    'blue': '#3b82f6',
    'yellow': '#fbbf24',
    'orange': '#f97316',
    'purple': '#a855f7',
    'pink': '#ec4899',
    'black': '#000000',
    'white': '#ffffff',
  };
  
  return namedColors[cleanColor] ?? '#10b981';
}

/**
 * Dessine des lignes horizontales sur un canvas.
 */
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

/**
 * Dessine des lignes verticales sur un canvas.
 */
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

/**
 * Dessine des lignes diagonales (/) sur un canvas.
 */
function drawDiagonalLines(ctx: CanvasRenderingContext2D, color: string, size: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  
  // Dessiner les lignes diagonales qui partent du bord gauche
  for (let startY = LINE_SPACING; startY <= size; startY += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(startY, 0);
    ctx.stroke();
  }
  
  // Dessiner les lignes diagonales qui partent du bord bas
  for (let startX = LINE_SPACING; startX < size; startX += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(startX, size);
    ctx.lineTo(size, size - (size - startX));
    ctx.stroke();
  }
}

/**
 * Dessine une grille sur un canvas.
 */
function drawGrid(ctx: CanvasRenderingContext2D, color: string, size: number): void {
  drawHorizontalLines(ctx, color, size);
  drawVerticalLines(ctx, color, size);
}

/**
 * Dessine des points sur un canvas.
 */
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

/**
 * Crée un canvas avec le motif dessiné.
 */
function createPatternCanvas(pattern: BackgroundPatternEnum, color: string): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = PATTERN_SIZE;
  canvas.height = PATTERN_SIZE;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get 2D context for pattern canvas');
    return null;
  }
  
  // Fond transparent
  ctx.clearRect(0, 0, PATTERN_SIZE, PATTERN_SIZE);
  
  const hexColor = colorToHex(color);
  
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
 * Cette version est synchrone et fonctionne immédiatement.
 * 
 * @param _app - Non utilisé, conservé pour compatibilité
 * @param pattern - Type de motif à créer
 * @param color - Couleur du motif
 * @returns Texture PixiJS pour le motif, ou null pour solid
 */
export function createPatternTexture(
  _app: unknown,
  pattern: BackgroundPatternEnum,
  color: string
): Texture | null {
  // Pour solid, pas de motif
  if (pattern === BackgroundPatternEnum.Solid) {
    return null;
  }

  // Vérifier le cache
  const cacheKey = `${pattern}-${color}`;
  const cachedTexture = textureCache.get(cacheKey);
  if (cachedTexture) {
    return cachedTexture;
  }

  try {
    const canvas = createPatternCanvas(pattern, color);
    if (!canvas) {
      return null;
    }
    
    // Créer la texture à partir du canvas
    const texture = Texture.from(canvas);
    
    // Mettre en cache
    textureCache.set(cacheKey, texture);
    
    return texture;
  } catch (error) {
    console.error(`Failed to create pattern texture for ${pattern} with color ${color}:`, error);
    return null;
  }
}

/**
 * Version async (conservée pour compatibilité mais utilise la même implémentation).
 */
export async function createPatternTextureAsync(
  pattern: BackgroundPatternEnum,
  color: string
): Promise<Texture | null> {
  return createPatternTexture(null, pattern, color);
}

/**
 * Précharge toutes les textures de motifs pour une couleur donnée.
 * 
 * @param color - Couleur pour laquelle précharger les textures
 */
export async function preloadPatternTextures(color: string): Promise<void> {
  const patterns = [
    BackgroundPatternEnum.Horizontal,
    BackgroundPatternEnum.Vertical,
    BackgroundPatternEnum.Diagonal,
    BackgroundPatternEnum.Grid,
    BackgroundPatternEnum.Dots,
  ];

  patterns.forEach((pattern) => createPatternTexture(null, pattern, color));
}

/**
 * Nettoie le cache des textures.
 * Utile pour libérer la mémoire si nécessaire.
 */
export function clearPatternTextureCache(): void {
  for (const texture of textureCache.values()) {
    texture.destroy(true);
  }
  textureCache.clear();
}
