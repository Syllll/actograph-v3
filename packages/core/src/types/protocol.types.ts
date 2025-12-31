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

