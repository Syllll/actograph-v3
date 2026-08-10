import { BackgroundPatternEnum } from '@actograph/core';

export const PATTERN_SIZE = 16;
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

export function createPatternCanvas(
  pattern: BackgroundPatternEnum,
  hexColor: string,
): HTMLCanvasElement | null {
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
