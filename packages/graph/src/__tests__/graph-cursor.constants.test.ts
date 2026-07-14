import {
  GRAPH_CANVAS_CURSOR_IDLE,
  GRAPH_CANVAS_CURSOR_PANNING,
} from '../utils/graph-cursor.constants';

describe('graph-cursor.constants', () => {
  it('uses a semi-transparent idle cursor so points stay visible under the pointer', () => {
    expect(GRAPH_CANVAS_CURSOR_IDLE).toContain('fill-opacity');
    expect(GRAPH_CANVAS_CURSOR_IDLE).toContain('0.35');
    expect(GRAPH_CANVAS_CURSOR_IDLE).toMatch(/crosshair$/);
  });

  it('uses a panning cursor while dragging the viewport', () => {
    expect(GRAPH_CANVAS_CURSOR_PANNING).toBe('grabbing');
  });
});
