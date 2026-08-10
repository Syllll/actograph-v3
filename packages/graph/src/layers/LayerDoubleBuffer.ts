import { Container } from 'pixi.js';

/**
 * Front/back container swap for full prepareWorld paints.
 * Public redraw paths schedule a full prepareWorld commit; no in-place display clears.
 */
export class LayerDoubleBuffer {
  readonly root: Container;
  private front: Container;
  private back: Container;

  constructor() {
    this.root = new Container();
    this.front = new Container();
    this.back = new Container();
    this.back.visible = false;
    this.root.addChild(this.front);
    this.root.addChild(this.back);
  }

  get displayBuffer(): Container {
    return this.front;
  }

  get paintBuffer(): Container {
    return this.back;
  }

  swap(): void {
    this.front.visible = false;
    this.back.visible = true;

    const previousFront = this.front;
    this.front = this.back;
    this.back = previousFront;

    this.back.visible = false;
  }

  clearBack(): void {
    this.clearContainer(this.back);
  }

  commit(): void {
    this.swap();
    this.clearBack();
  }

  clearPaintBuffer(): void {
    this.clearContainer(this.back);
  }

  private clearContainer(target: Container): void {
    for (const child of [...target.children]) {
      target.removeChild(child);
      child.destroy({ children: true });
    }
  }
}
