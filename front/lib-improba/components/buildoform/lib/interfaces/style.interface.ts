import { ICols, EBreakpoints } from './breakpoints.interface';
import { ISkssSelectors } from './skss.interface';

/**
 * Field style
 * @note very cool
 */
export interface IFieldStyle extends ICols, ISkssSelectors {
  /** Default classes string */
  static?: string;

  directives?: {
    /** some colors */
    color: string;

    outlined: boolean;
    filled: boolean;
    flat: boolean;
    // [key: string]: string
  };
}

enum EOrientation {
  row = 'row',
  column = 'column',
}

enum EPosition {
  start = 'start',
  center = 'center',
  end = 'end',
}

enum EHorizontalPositions {
  around = 'around',
  between = 'between',
  evenly = 'evenly',
}

enum EOrder {
  none = 'none',
  last = 'last',
  first = 'first',
}

export interface IStepStyle {
  container: string;
  title: string;
  desc: string;
}

export interface IRowStyle extends ICols {
  // row?: boolean
  // column?: boolean
  orientation?: EOrientation;

  reverse?: boolean;

  items?: EPosition;
  justify?: EPosition | EHorizontalPositions;

  gutter?: keyof typeof EBreakpoints;
  colGutter?: keyof typeof EBreakpoints;
}

export interface IColStyle {
  order: keyof typeof EOrder;
  self: keyof typeof EPosition;

  offset: ICols;
}
