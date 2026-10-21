// Triangulation is used by the GPU renderer, not by SVG serialization.
jest.mock(require.resolve('earcut', { paths: [require.resolve('pixi.js')] }), () => ({ __esModule: true, default: () => [] }));

import { CanvasTextMetrics, Container, FillGradient, Graphics, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
import { registerPatternDescriptor } from '../gpu/pattern-descriptor';
import { exportSvgScene } from '../engine/svg-scene-exporter';

describe('SVG scene export with real Pixi Graphics', () => {
  it('exports anchored, rotated labels with optional font styles and escaped user text', () => {
    const measure = jest.spyOn(CanvasTextMetrics, 'measureText').mockReturnValue({
      lines: ['Été <A&B>'], lineWidths: [50], maxLineWidth: 50, lineHeight: 12,
      fontProperties: { ascent: 9, descent: 3, fontSize: 12 },
    } as CanvasTextMetrics);
    try {
      const stage = new Container();
      const text = stage.addChild(new Text({ text: 'Été <A&B>', style: {
        fontFamily: 'Arial', fontSize: 12, fontStyle: undefined, fontWeight: undefined,
      } }));
      text.angle = 90;
      jest.spyOn(text, 'getLocalBounds').mockReturnValue({ minX: -25, minY: -6 } as ReturnType<Text['getLocalBounds']>);
      const { markup } = exportSvgScene(stage, 100, 100);
      expect(markup).toContain('Été &lt;A&amp;B&gt;');
      expect(markup).toContain('font-style="normal"');
      expect(markup).toContain('x="-25" y="3"');
      expect(markup).toContain('matrix(0 1 -1 0 0 0)');
    } finally {
      measure.mockRestore();
    }
  });
  it('preserves layer order, nested transforms, opacity and local path coordinates', () => {
    const stage = new Container();
    const group = stage.addChild(new Container());
    group.position.set(25, 40);
    group.scale.set(2, 0.5);
    group.alpha = 0.6;
    group.addChild(new Graphics().rect(30, 20, 50, 10).fill('#ff0000'));
    group.addChild(new Graphics().circle(70, 80, 3).fill('#0000ff'));
    const { markup } = exportSvgScene(stage, 800, 600);
    expect(markup).toContain('matrix(2 0 0 0.5 25 40)');
    expect(markup).toContain('opacity="0.6"');
    expect(markup.indexOf('#ff0000')).toBeLessThan(markup.indexOf('#0000ff'));
    expect(markup).toContain('M30 20');
  });

  it('includes labels outside the canvas through the same frame origin as PNG extraction', () => {
    const stage = new Container();
    stage.addChild(new Graphics().rect(-80, -20, 150, 40).fill('#ff0000'));
    const { markup, width, height } = exportSvgScene(stage, 150, 40, new Set(), { x: -80, y: -20 });
    expect({ width, height }).toEqual({ width: 150, height: 40 });
    expect(markup).toContain('translate(80 20)');
    expect(markup).toContain('M-80 -20');
  });

  it('omits inactive buffers, hidden categories and excluded hover objects', () => {
    const stage = new Container();
    const back = stage.addChild(new Container());
    back.visible = false;
    back.addChild(new Graphics().rect(0, 0, 30, 30).fill('#ff0000'));
    const hover = stage.addChild(new Graphics().circle(10, 10, 3).fill('#0000ff'));
    expect(exportSvgScene(stage, 100, 100, new Set([hover])).markup).not.toContain('<path');
  });

  it('gives gradients from separate Graphics independent identifiers', () => {
    const stage = new Container();
    for (let i = 0; i < 2; i++) {
      const fill = new FillGradient({ type: 'linear', colorStops: [{ offset: 0, color: '#ff0000' }, { offset: 1, color: '#0000ff' }] });
      // Gradient rasterization requires a canvas, SVG only needs its color stops.
      jest.spyOn(fill, 'buildGradient').mockImplementation(() => undefined);
      stage.addChild(new Graphics().rect(i * 40, 0, 30, 30).fill(fill));
    }
    const { markup } = exportSvgScene(stage, 100, 100);
    expect(markup).toContain('id="shape-0-pixi-grad-0"');
    expect(markup).toContain('url(#shape-1-pixi-grad-0)');
  });

  it.each([
    BackgroundPatternEnum.Horizontal, BackgroundPatternEnum.Vertical,
    BackgroundPatternEnum.Diagonal, BackgroundPatternEnum.Grid, BackgroundPatternEnum.Dots,
  ])('exports pattern %s as vector geometry', (pattern) => {
    const stage = new Container();
    const sprite = stage.addChild(new TilingSprite({ texture: Texture.EMPTY, width: 80, height: 40 }));
    sprite.position.set(20, 30);
    sprite.tilePosition.set(3, 5);
    registerPatternDescriptor(sprite, { pattern, color: '#123456' });
    const { markup } = exportSvgScene(stage, 200, 100);
    expect(markup).toContain('<pattern');
    expect(markup).toContain('patternTransform="matrix(1 0 0 1 3 5)"');
    expect(markup).toContain('#123456');
    expect(markup).not.toMatch(/<image|data:image/);
  });

  it('fails explicitly on unknown sprites instead of silently losing content', () => {
    const stage = new Container();
    stage.addChild(new Sprite(Texture.EMPTY));
    expect(() => exportSvgScene(stage, 100, 100)).toThrow('unsupported object');
  });

  it.each([BackgroundPatternEnum.Grid, BackgroundPatternEnum.Dots])(
    'preserves RGBA transparency in pattern %s', (pattern) => {
      const stage = new Container();
      const sprite = stage.addChild(new TilingSprite({ texture: Texture.EMPTY, width: 80, height: 40 }));
      registerPatternDescriptor(sprite, { pattern, color: 'rgba(255, 0, 0, 0.25)' });
      const { markup } = exportSvgScene(stage, 100, 100);
      expect(markup).toContain('#ff0000');
      expect(markup).toContain('fill-opacity="0.25"');
      expect(markup).toContain('stroke-opacity="0.25"');
    },
  );
});
