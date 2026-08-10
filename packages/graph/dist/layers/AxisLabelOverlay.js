import { Container, Text } from 'pixi.js';
import { selectNonOverlappingLabels } from '../utils/axis-label-layout.utils';
export class AxisLabelOverlay {
    constructor() {
        this.worldToOverlay = null;
        this.labelById = new Map();
        this.lastDescriptors = [];
        this.container = new Container();
        this.container.eventMode = 'none';
    }
    setProjectors(projectors) {
        this.worldToOverlay = projectors.worldToOverlay;
    }
    sync(descriptors) {
        this.lastDescriptors = descriptors;
        this.applyDescriptors(descriptors, { recreate: false });
    }
    syncPositions() {
        this.applyDescriptors(this.lastDescriptors, { recreate: false });
    }
    clear() {
        this.clearLabels();
        this.lastDescriptors = [];
    }
    destroy() {
        this.clearLabels();
        this.container.destroy({ children: true });
    }
    clearLabels() {
        for (const text of this.labelById.values()) {
            text.destroy();
        }
        this.labelById.clear();
    }
    applyDescriptors(descriptors, options) {
        if (!this.worldToOverlay) {
            return;
        }
        const descriptorIds = new Set(descriptors.map((d) => d.id));
        for (const id of this.labelById.keys()) {
            if (!descriptorIds.has(id)) {
                const orphan = this.labelById.get(id);
                if (orphan) {
                    orphan.destroy();
                }
                this.labelById.delete(id);
            }
        }
        const visibleXTickIds = this.computeVisibleXTickIds(descriptors);
        for (const descriptor of descriptors) {
            if (descriptor.kind === 'x-tick' && !visibleXTickIds.has(descriptor.id)) {
                const hidden = this.labelById.get(descriptor.id);
                if (hidden) {
                    hidden.visible = false;
                }
                continue;
            }
            const overlayPos = this.worldToOverlay({
                x: descriptor.worldX,
                y: descriptor.worldY,
            });
            let text = this.labelById.get(descriptor.id);
            if (!text || options.recreate) {
                if (text) {
                    text.destroy();
                }
                text = this.createText(descriptor);
                this.labelById.set(descriptor.id, text);
                this.container.addChild(text);
            }
            else {
                this.updateTextContent(text, descriptor);
            }
            text.x = overlayPos.x;
            text.y = overlayPos.y;
            text.angle = descriptor.angleDeg;
            text.anchor.set(descriptor.anchorX, descriptor.anchorY);
            text.visible = true;
        }
    }
    computeVisibleXTickIds(descriptors) {
        if (!this.worldToOverlay) {
            return new Set();
        }
        const xTickItems = descriptors
            .filter((d) => d.kind === 'x-tick')
            .map((d) => {
            const overlay = this.worldToOverlay({ x: d.worldX, y: d.worldY });
            return {
                id: d.id,
                x: overlay.x,
                width: d.labelWidth ?? d.text.length * d.fontSize * 0.6,
                anchorX: d.anchorX,
            };
        });
        return selectNonOverlappingLabels(xTickItems);
    }
    createText(descriptor) {
        const text = new Text(descriptor.text, {
            fontSize: descriptor.fontSize,
            fill: descriptor.fill,
            fontFamily: descriptor.fontFamily,
            fontWeight: descriptor.fontWeight,
            fontStyle: descriptor.fontStyle,
        });
        text.eventMode = 'none';
        return text;
    }
    updateTextContent(text, descriptor) {
        if (text.text !== descriptor.text) {
            text.text = descriptor.text;
        }
        text.style.fontSize = descriptor.fontSize;
        text.style.fill = descriptor.fill;
        text.style.fontFamily = descriptor.fontFamily;
        text.style.fontWeight = (descriptor.fontWeight ?? 'normal');
        text.style.fontStyle = (descriptor.fontStyle ?? 'normal');
    }
}
//# sourceMappingURL=AxisLabelOverlay.js.map