import { normalizeGraphColor } from '../../utils/graph-color';
import { DEFAULT_GRAPH_COLOR } from '../../utils/graph-preferences';

describe('normalizeGraphColor', () => {
  it('convertit un nom CSS en hexadécimal', () => {
    expect(normalizeGraphColor('black', DEFAULT_GRAPH_COLOR)).toBe('#000000');
    expect(normalizeGraphColor('Black', DEFAULT_GRAPH_COLOR)).toBe('#000000');
    expect(normalizeGraphColor('red', DEFAULT_GRAPH_COLOR)).toBe('#ff0000');
  });

  it('normalise un hexadécimal avec ou sans #', () => {
    expect(normalizeGraphColor('#FF0000', DEFAULT_GRAPH_COLOR)).toBe('#ff0000');
    expect(normalizeGraphColor('00ff00', DEFAULT_GRAPH_COLOR)).toBe('#00ff00');
  });

  it('étend un hexadécimal court', () => {
    expect(normalizeGraphColor('#f00', DEFAULT_GRAPH_COLOR)).toBe('#ff0000');
    expect(normalizeGraphColor('abc', DEFAULT_GRAPH_COLOR)).toBe('#aabbcc');
  });

  it('ignore l\'alpha d\'un hexadécimal 8 chiffres', () => {
    expect(normalizeGraphColor('#ff000080', DEFAULT_GRAPH_COLOR)).toBe('#ff0000');
    expect(normalizeGraphColor('ff000080', DEFAULT_GRAPH_COLOR)).toBe('#ff0000');
  });

  it('rejette hsl/hsla et transparent au profit du fallback', () => {
    expect(normalizeGraphColor('hsl(0, 0%, 0%)', DEFAULT_GRAPH_COLOR)).toBe(DEFAULT_GRAPH_COLOR);
    expect(normalizeGraphColor('hsla(0, 0%, 0%, 0.5)', DEFAULT_GRAPH_COLOR)).toBe(DEFAULT_GRAPH_COLOR);
    expect(normalizeGraphColor('transparent', DEFAULT_GRAPH_COLOR)).toBe(DEFAULT_GRAPH_COLOR);
  });

  it('laisse passer rgb et rgba', () => {
    expect(normalizeGraphColor('rgb(0, 0, 0)', DEFAULT_GRAPH_COLOR)).toBe('rgb(0, 0, 0)');
    expect(normalizeGraphColor('rgba(0,0,0,0.5)', DEFAULT_GRAPH_COLOR)).toBe('rgba(0,0,0,0.5)');
  });

  it('retombe sur le fallback pour une couleur inconnue', () => {
    expect(normalizeGraphColor('not-a-color', DEFAULT_GRAPH_COLOR)).toBe(DEFAULT_GRAPH_COLOR);
    expect(normalizeGraphColor('   ', DEFAULT_GRAPH_COLOR)).toBe(DEFAULT_GRAPH_COLOR);
    expect(normalizeGraphColor('#gggggg', DEFAULT_GRAPH_COLOR)).toBe(DEFAULT_GRAPH_COLOR);
  });
});
