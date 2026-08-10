import { Container, Text, type TextStyleFontStyle, type TextStyleFontWeight } from 'pixi.js';
import { selectNonOverlappingLabels } from '../utils/axis-label-layout.utils';

export type AxisLabelKind = 'x-tick' | 'y-tick' | 'format-mention';

export type AxisLabelDescriptor = {
  id: string;
  text: string;
  /** Position monde (espace plot ; reprojetée via worldToOverlay). */
  worldX: number;
  worldY: number;
  angleDeg: number;
  anchorX: number;
  anchorY: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontWeight?: string;
  fontStyle?: string;
  kind: AxisLabelKind;
  /** Largeur horizontale estimée pour l'anti-collision des ticks X. */
  labelWidth?: number;
};

export interface AxisLabelOverlayProjectors {
  worldToOverlay: (p: { x: number; y: number }) => { x: number; y: number };
}

export class AxisLabelOverlay {
  readonly container: Container;
  private worldToOverlay: AxisLabelOverlayProjectors['worldToOverlay'] | null = null;
  private readonly labelById = new Map<string, Text>();
  private lastDescriptors: AxisLabelDescriptor[] = [];

  constructor() {
    this.container = new Container();
    this.container.eventMode = 'none';
  }

  public setProjectors(projectors: AxisLabelOverlayProjectors): void {
    this.worldToOverlay = projectors.worldToOverlay;
  }

  public sync(descriptors: AxisLabelDescriptor[]): void {
    this.lastDescriptors = descriptors;
    this.applyDescriptors(descriptors, { recreate: false });
  }

  public syncPositions(): void {
    this.applyDescriptors(this.lastDescriptors, { recreate: false });
  }

  public clear(): void {
    this.clearLabels();
    this.lastDescriptors = [];
  }

  public destroy(): void {
    this.clearLabels();
    this.container.destroy({ children: true });
  }

  private clearLabels(): void {
    for (const text of this.labelById.values()) {
      text.destroy();
    }
    this.labelById.clear();
  }

  private applyDescriptors(
    descriptors: AxisLabelDescriptor[],
    options: { recreate: boolean },
  ): void {
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
      } else {
        this.updateTextContent(text, descriptor);
      }

      text.x = overlayPos.x;
      text.y = overlayPos.y;
      text.angle = descriptor.angleDeg;
      text.anchor.set(descriptor.anchorX, descriptor.anchorY);
      text.visible = true;
    }
  }

  private computeVisibleXTickIds(descriptors: AxisLabelDescriptor[]): Set<string> {
    if (!this.worldToOverlay) {
      return new Set();
    }

    const xTickItems = descriptors
      .filter((d) => d.kind === 'x-tick')
      .map((d) => {
        const overlay = this.worldToOverlay!({ x: d.worldX, y: d.worldY });
        return {
          id: d.id,
          x: overlay.x,
          width: d.labelWidth ?? d.text.length * d.fontSize * 0.6,
          anchorX: d.anchorX,
        };
      });

    return selectNonOverlappingLabels(xTickItems);
  }

  private createText(descriptor: AxisLabelDescriptor): Text {
    const text = new Text(
      descriptor.text,
      {
        fontSize: descriptor.fontSize,
        fill: descriptor.fill,
        fontFamily: descriptor.fontFamily,
        fontWeight: descriptor.fontWeight as TextStyleFontWeight | undefined,
        fontStyle: descriptor.fontStyle as TextStyleFontStyle | undefined,
      },
    );
    text.eventMode = 'none';
    return text;
  }

  private updateTextContent(text: Text, descriptor: AxisLabelDescriptor): void {
    if (text.text !== descriptor.text) {
      text.text = descriptor.text;
    }
    text.style.fontSize = descriptor.fontSize;
    text.style.fill = descriptor.fill;
    text.style.fontFamily = descriptor.fontFamily;
    text.style.fontWeight = (descriptor.fontWeight ?? 'normal') as TextStyleFontWeight;
    text.style.fontStyle = (descriptor.fontStyle ?? 'normal') as TextStyleFontStyle;
  }
}
