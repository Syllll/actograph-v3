/** True when the element is laid out, visible, and has non-zero dimensions. */
export function isElementVisible(el: HTMLElement | null | undefined): boolean {
  if (!el) {
    return false;
  }

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
