import {
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
  BackgroundPatternEnum,
  DisplayModeEnum,
} from '../enums';

/**
 * Graph preferences for protocol items
 */
export interface IGraphPreferences {
  color?: string;
  strokeWidth?: number;
  backgroundPattern?: BackgroundPatternEnum;
  displayMode?: DisplayModeEnum;
  supportCategoryId?: string | null;
  /** Référence portable par nom de catégorie (export/import sans IDs). */
  supportCategoryName?: string | null;
  /** Visibilité de la catégorie sur le graphe. Non défini = visible (opt-out). Catégorie uniquement, non héritée par les observables. */
  visible?: boolean;
}

/**
 * Protocol item interface (category or observable)
 */
export interface IProtocolItem {
  type: ProtocolItemTypeEnum;
  id: string;
  name: string;
  description?: string | null;
  action?: ProtocolItemActionEnum;
  meta?: Record<string, unknown> | null;
  graphPreferences?: IGraphPreferences;
  children?: IProtocolItem[];
}

/**
 * Protocol interface (without TypeORM decorators)
 */
export interface IProtocol {
  id?: number;
  name?: string | null;
  description?: string | null;
  items: IProtocolItem[];
}

