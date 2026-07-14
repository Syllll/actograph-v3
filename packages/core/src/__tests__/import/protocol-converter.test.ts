import { ProtocolV1Converter } from '../../import/chronic-v1/converter/protocol-converter';
import { DisplayModeEnum, ProtocolItemActionEnum } from '../../enums';
import type { IProtocolNodeV1 } from '../../import/chronic-v1/types/chronic-v1.types';

function makeCategoryNode(shape: string, overrides: Partial<IProtocolNodeV1> = {}): IProtocolNodeV1 {
  return {
    name: 'Catégorie test',
    type: 'Category',
    isRootNode: false,
    colorName: '#ff0000',
    shape,
    thickness: 2,
    isVisible: true,
    indexInParentContext: 0,
    isBackground: shape === 'background',
    backgroundCover: '',
    backgroundMotif: 0,
    bX: 0,
    bY: 0,
    bWidth: 0,
    bHeight: 0,
    children: [],
    ...overrides,
  };
}

describe('ProtocolV1Converter - shape → action', () => {
  const converter = new ProtocolV1Converter();

  it('mappe shape point vers discrete', () => {
    const protocol = converter.convert({
      name: 'root',
      type: 'Category',
      isRootNode: true,
      colorName: '',
      shape: 'line',
      thickness: 0,
      isVisible: true,
      indexInParentContext: -1,
      isBackground: false,
      backgroundCover: '',
      backgroundMotif: 0,
      bX: 0,
      bY: 0,
      bWidth: 0,
      bHeight: 0,
      children: [makeCategoryNode('point')],
    });

    expect(protocol.categories?.[0].action).toBe(ProtocolItemActionEnum.Discrete);
  });

  it('mappe shape line vers continuous', () => {
    const protocol = converter.convert({
      name: 'root',
      type: 'Category',
      isRootNode: true,
      colorName: '',
      shape: 'line',
      thickness: 0,
      isVisible: true,
      indexInParentContext: -1,
      isBackground: false,
      backgroundCover: '',
      backgroundMotif: 0,
      bX: 0,
      bY: 0,
      bWidth: 0,
      bHeight: 0,
      children: [makeCategoryNode('line')],
    });

    expect(protocol.categories?.[0].action).toBe(ProtocolItemActionEnum.Continuous);
  });

  it('mappe shape background vers continuous + displayMode background', () => {
    const protocol = converter.convert({
      name: 'root',
      type: 'Category',
      isRootNode: true,
      colorName: '',
      shape: 'line',
      thickness: 0,
      isVisible: true,
      indexInParentContext: -1,
      isBackground: false,
      backgroundCover: '',
      backgroundMotif: 0,
      bX: 0,
      bY: 0,
      bWidth: 0,
      bHeight: 0,
      children: [makeCategoryNode('background')],
    });

    expect(protocol.categories?.[0].action).toBe(ProtocolItemActionEnum.Continuous);
    expect(protocol.categories?.[0].graphPreferences?.displayMode).toBe(DisplayModeEnum.Background);
  });

  it('mappe un observable racine vers une catégorie par défaut avec la bonne action', () => {
    const protocol = converter.convert({
      name: 'root',
      type: 'Category',
      isRootNode: true,
      colorName: '',
      shape: 'line',
      thickness: 0,
      isVisible: true,
      indexInParentContext: -1,
      isBackground: false,
      backgroundCover: '',
      backgroundMotif: 0,
      bX: 0,
      bY: 0,
      bWidth: 0,
      bHeight: 0,
      children: [makeCategoryNode('point', { type: 'Observable', name: 'Tap' })],
    });

    expect(protocol.categories).toHaveLength(1);
    expect(protocol.categories?.[0].name).toBe('Catégorie par défaut');
    expect(protocol.categories?.[0].action).toBe(ProtocolItemActionEnum.Discrete);
    expect(protocol.categories?.[0].observables?.[0].name).toBe('Tap');
  });
});
