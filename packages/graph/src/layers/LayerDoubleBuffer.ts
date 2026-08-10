import { Container } from 'pixi.js';

/**
 * Front/back container swap for full prepareWorld paints.
 * Partial redrawCategory updates the visible display buffer in place.
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

  commit(): void {
    this.front.visible = false;
    this.back.visible = true;

    const previousFront = this.front;
    this.front = this.back;
    this.back = previousFront;

    this.back.visible = false;
    this.clearContainer(this.back);
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
