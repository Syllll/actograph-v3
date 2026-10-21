import { CanvasTextMetrics, Color, Container, Graphics, Text, TilingSprite, graphicsContextToSvg } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
import { getPatternDescriptor } from '../gpu/pattern-descriptor';
import { PATTERN_SIZE } from '../gpu/pattern-canvas';
import { createSvgDocument, escapeXml, svgBody, svgNumber, type SvgDocument } from '../utils/svg-document';

function exportText(text: Text): string {
  if (!text.text) return '';
  const style = text.style;
  const metrics = CanvasTextMetrics.measureText(text.text, style);
  const bounds = text.getLocalBounds();
  const color = Color.shared.setValue(style.fill as string | number).toHex();
  const font = Array.isArray(style.fontFamily) ? style.fontFamily.join(', ') : (style.fontFamily ?? 'Arial');
  const baseline = metrics.fontProperties.ascent
    + Math.max(0, (metrics.lineHeight - metrics.fontProperties.fontSize) / 2);
  const lines = metrics.lines.map((line, i) => {
    const align = style.align === 'right' ? 1 : style.align === 'center' ? 0.5 : 0;
    const x = bounds.minX + (metrics.maxLineWidth - metrics.lineWidths[i]) * align;
    const y = bounds.minY + baseline + i * (metrics.lineHeight + style.leading);
    const length = metrics.lineWidths[i] > 0
      ? ` textLength="${svgNumber(metrics.lineWidths[i])}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<tspan x="${svgNumber(x)}" y="${svgNumber(y)}"${length}>${escapeXml(line)}</tspan>`;
  }).join('');
  return `<text xml:space="preserve" font-family="${escapeXml(font)}" font-size="${svgNumber(style.fontSize)}" font-weight="${escapeXml(String(style.fontWeight ?? 'normal'))}" font-style="${escapeXml(style.fontStyle ?? 'normal')}" letter-spacing="${svgNumber(style.letterSpacing)}" fill="${color}">${lines}</text>`;
}

function exportPattern(sprite: TilingSprite, id: string): string {
  const descriptor = getPatternDescriptor(sprite);
  if (!descriptor) throw new Error('SVG export: unregistered pattern');
  const color = Color.shared.setValue(descriptor.color).toHex();
  const horizontal = '<path d="M0 4H16M0 12H16"/>';
  const vertical = '<path d="M4 0V16M12 0V16"/>';
  let tile: string;
  switch (descriptor.pattern) {
    case BackgroundPatternEnum.Horizontal: tile = horizontal; break;
    case BackgroundPatternEnum.Vertical: tile = vertical; break;
    case BackgroundPatternEnum.Diagonal: tile = '<path d="M0 8L8 0M0 16L16 0M8 16L16 8"/>'; break;
    case BackgroundPatternEnum.Grid: tile = horizontal + vertical; break;
    case BackgroundPatternEnum.Dots:
      tile = '<circle cx="4" cy="4" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="12" cy="4" r="1"/><circle cx="12" cy="12" r="1"/>';
      break;
    default: throw new Error('SVG export: unsupported pattern');
  }
  const dots = descriptor.pattern === BackgroundPatternEnum.Dots;
  const { a, b, c, d, tx, ty } = sprite.tileTransform.matrix;
  const transform = [a, b, c, d, tx, ty].map(svgNumber).join(' ');
  const x = -sprite.anchor.x * sprite.width;
  const y = -sprite.anchor.y * sprite.height;
  return `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${PATTERN_SIZE}" height="${PATTERN_SIZE}" patternTransform="matrix(${transform})">`
    + `<g fill="${dots ? color : 'none'}" stroke="${dots ? 'none' : color}" stroke-width="1">${tile}</g></pattern></defs>`
    + `<rect x="${svgNumber(x)}" y="${svgNumber(y)}" width="${svgNumber(sprite.width)}" height="${svgNumber(sprite.height)}" fill="url(#${id})"/>`;
}

/** Serializes only the committed, visible scene. No bitmap fallback. */
export function exportSvgScene(
  stage: Container,
  width: number,
  height: number,
  excluded: ReadonlySet<Container> = new Set(),
  origin: { x: number; y: number } = { x: 0, y: 0 },
): SvgDocument {
  let nextId = 0;
  const visit = (node: Container): string => {
    if (excluded.has(node) || !node.visible || !node.renderable || node.alpha <= 0) return '';
    if (node.effects?.length) throw new Error('SVG export: unsupported scene effect');
    node.updateLocalTransform();
    const { a, b, c, d, tx, ty } = node.localTransform;
    const matrix = [a, b, c, d, tx, ty].map(svgNumber).join(' ');
    let body = '';
    if (node instanceof Graphics && node.context.instructions.length) {
      if (node.context.instructions.some((instruction) => instruction.action === 'texture')) {
        throw new Error('SVG export: unsupported graphics texture');
      }
      body = svgBody(graphicsContextToSvg(node, 5), `shape-${nextId++}`);
    } else if (node instanceof Text) {
      body = exportText(node);
    } else if (node instanceof TilingSprite) {
      body = exportPattern(node, `pattern-${nextId++}`);
    } else if ('renderPipeId' in node && node.renderPipeId !== 'graphics') {
      throw new Error(`SVG export: unsupported object ${node.renderPipeId}`);
    }
    body += node.children.map(visit).join('');
    return body ? `<g transform="matrix(${matrix})" opacity="${svgNumber(node.alpha)}">${body}</g>` : '';
  };
  const body = visit(stage);
  return createSvgDocument(width, height,
    `<g transform="translate(${svgNumber(-origin.x)} ${svgNumber(-origin.y)})">${body}</g>`);
}
