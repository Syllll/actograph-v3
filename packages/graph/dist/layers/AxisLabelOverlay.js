import { Container, Text } from 'pixi.js';
import { selectNonOverlappingLabels } from '../utils/axis-label-layout.utils';
export class AxisLabelOverlay {
    constructor() {
        this.worldToOverlay = null;
        this.labelById = new Map();
        this.lastDescriptors = [];
        this.viewportWidth = 0;
        this.container = new Container();
        this.container.eventMode = 'none';
    }
    setProjectors(projectors) {
        this.worldToOverlay = projectors.worldToOverlay;
    }
    setViewportSize(width) {
        this.viewportWidth = width;
    }
    sync(descriptors, options) {
        this.lastDescriptors = descriptors;
        this.applyDescriptors(descriptors, { recreate: options?.recreate ?? false });
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
            this.destroyLabel(text);
        }
        this.labelById.clear();
    }
    destroyLabel(text) {
        if (text.parent === this.container) {
            this.container.removeChild(text);
        }
        text.destroy();
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
                    this.destroyLabel(orphan);
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
            const overlayPos = this.projectDescriptor(descriptor);
            let text = this.labelById.get(descriptor.id);
            if (!text || options.recreate) {
                if (text) {
                    this.destroyLabel(text);
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
    projectDescriptor(descriptor) {
        const overlayPos = this.worldToOverlay({
            x: descriptor.worldX,
            y: descriptor.worldY,
        });
        if (descriptor.kind !== 'format-mention' || this.viewportWidth <= 0) {
            return overlayPos;
        }
        const halfWidth = (descriptor.labelWidth ?? descriptor.text.length * descriptor.fontSize * 0.6) / 2;
        return {
            x: Math.min(this.viewportWidth - halfWidth, Math.max(halfWidth, overlayPos.x)),
            y: overlayPos.y,
        };
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