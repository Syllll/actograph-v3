import { Container } from 'pixi.js';
/**
 * Front/back container swap for full prepareWorld paints.
 * Public redraw paths schedule a full prepareWorld commit; no in-place display clears.
 */
export class LayerDoubleBuffer {
    constructor() {
        this.root = new Container();
        this.front = new Container();
        this.back = new Container();
        this.back.visible = false;
        this.root.addChild(this.front);
        this.root.addChild(this.back);
    }
    get displayBuffer() {
        return this.front;
    }
    get paintBuffer() {
        return this.back;
    }
    swap() {
        this.front.visible = false;
        this.back.visible = true;
        const previousFront = this.front;
        this.front = this.back;
        this.back = previousFront;
        this.back.visible = false;
    }
    clearBack() {
        this.clearContainer(this.back);
    }
    commit() {
        this.swap();
        this.clearBack();
    }
    clearPaintBuffer() {
        this.clearContainer(this.back);
    }
    clearContainer(target) {
        for (const child of [...target.children]) {
            target.removeChild(child);
            child.destroy({ children: true });
        }
    }
}
//# sourceMappingURL=LayerDoubleBuffer.js.map