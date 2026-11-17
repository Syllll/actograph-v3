import { ProtocolItemActionEnum, ProtocolItemTypeEnum } from '../../enums';
import { IProtocolItem } from '../../types/protocol.types';
import { createProtocolExchange, assertValidExchangeDocument } from '../../exchange/documents';
import { ExchangeParseError, ProtocolExchangeDocument } from '../../exchange/types';
import { ProtocolV1Converter } from './converter/protocol-converter';
import { IChronicV1, IProtocolNodeV1 } from './types/chronic-v1.types';

/** Extract only the protocol. Never invoke the reading normalizer or rename source labels. */
export function extractChronicV1Protocol(chronic: IChronicV1): ProtocolExchangeDocument {
  const source = chronic.protocol;
  const fail = (message: string): never => {
    throw new ExchangeParseError([{ code: 'legacy_protocol', message }]);
  };
  const check = (node: IProtocolNodeV1, category: boolean): void => {
    if (typeof node.name !== 'string' || !node.name.trim())
      fail('Le protocole V1 contient un nom vide : aucune correction automatique n’est appliquée.');
    // Match the converter's exact supported spellings. A broader case-folded
    // check would allow nodes that the converter silently drops.
    const supportedTypes = category ? ['category', 'Category'] : ['observable', 'Observable'];
    if (!supportedTypes.includes(node.type))
      fail(
        'Structure V1 non représentable sans transformation : seules les catégories contenant des observables sont acceptées.',
      );
    if (!category && node.children.length)
      fail('Un observable V1 possède des enfants : extraction refusée pour éviter une perte.');
    for (const child of node.children) check(child, false);
  };
  for (const node of source.children) check(node, true);
  const normalized = new ProtocolV1Converter().convert(source);
  const items = (normalized.categories ?? []).map((category, index): IProtocolItem => {
    const raw = source.children[index];
    const legacyMeta = (node: IProtocolNodeV1): Record<string, unknown> => {
      const { children: _children, ...attributes } = node;
      return { legacyV1: attributes };
    };
    return {
      id: `legacy-category-${index}`,
      type: ProtocolItemTypeEnum.Category,
      name: category.name,
      action: category.action as ProtocolItemActionEnum,
      meta: legacyMeta(raw),
      graphPreferences: { ...category.graphPreferences, visible: raw.isVisible },
      children: (category.observables ?? []).map(
        (observable, childIndex): IProtocolItem => ({
          id: `legacy-observable-${index}-${childIndex}`,
          type: ProtocolItemTypeEnum.Observable,
          name: observable.name,
          meta: legacyMeta(raw.children[childIndex]),
          action:
            raw.children[childIndex].shape === 'point'
              ? ProtocolItemActionEnum.Discrete
              : ProtocolItemActionEnum.Continuous,
          ...(observable.graphPreferences ? { graphPreferences: observable.graphPreferences } : {}),
        }),
      ),
    };
  });
  for (const item of items) {
    const supportName = item.graphPreferences?.supportCategoryName;
    if (!supportName) continue;
    const matches = items.filter((candidate) => candidate.name === supportName);
    if (matches.length === 1) item.graphPreferences!.supportCategoryId = matches[0].id;
  }
  const document = createProtocolExchange(items);
  assertValidExchangeDocument(document);
  return document;
}
