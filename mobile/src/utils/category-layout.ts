export interface LayoutCard {
  id: number;
  width: number;
  height: number;
  position?: { x: number; y: number };
}

/** Preserve free placement where possible, and move colliding cards to a free slot. */
export function arrangeCategoryCards(cards: LayoutCard[], containerWidth: number, gap = 16) {
  const width = Math.max(gap * 2 + 1, containerWidth);
  const placed: { x: number; y: number; width: number; height: number }[] = [];
  const positions: Record<number, { x: number; y: number }> = {};
  for (const card of cards) {
    const cardWidth = Math.max(1, Math.min(card.width, width - gap * 2));
    const height = Math.max(1, card.height);
    const fits = (x: number, y: number) => x >= gap && x + cardWidth <= width - gap + 0.1 && placed.every((other) => (
      x + cardWidth + gap <= other.x + 0.1 || x >= other.x + other.width + gap - 0.1 ||
      y + height + gap <= other.y + 0.1 || y >= other.y + other.height + gap - 0.1
    ));
    let position = card.position && Number.isFinite(card.position.x) && Number.isFinite(card.position.y)
      ? { x: Math.max(gap, Math.min(card.position.x, width - gap - cardWidth)), y: Math.max(gap, card.position.y) }
      : undefined;
    if (!position || !fits(position.x, position.y)) {
      const ys = [...new Set([gap, ...placed.map((other) => other.y + other.height + gap)])].sort((a, b) => a - b);
      const xs = [...new Set([gap, ...placed.map((other) => other.x + other.width + gap)])].sort((a, b) => a - b);
      for (const y of ys) {
        const x = xs.find((x) => fits(x, y));
        if (x !== undefined) { position = { x, y }; break; }
      }
    }
    const resolved = position!;
    positions[card.id] = resolved;
    placed.push({ ...resolved, width: cardWidth, height });
  }
  return positions;
}
