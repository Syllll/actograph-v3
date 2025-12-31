import type { IProtocol, IProtocolItem, IGraphPreferences } from '@actograph/core';
export { IProtocolItem as ProtocolItem };
export { ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@actograph/core';
/**
 * Helper function to parse protocol items from JSON string
 */
export declare function parseProtocolItems(protocol: IProtocol): IProtocolItem[];
/**
 * Récupère les préférences graphiques d'un observable avec héritage depuis sa catégorie parente.
 */
export declare function getObservableGraphPreferences(observableId: string, protocol: IProtocol): IGraphPreferences | null;
//# sourceMappingURL=protocol.utils.d.ts.map