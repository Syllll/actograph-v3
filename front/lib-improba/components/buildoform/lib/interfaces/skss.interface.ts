enum EColors {
  primary = 'primary',
  secondary = 'secondary',
  accent = 'accent',
  success = 'success',
  warning = 'warning',
  danger = 'danger',
}
type TAccentuations =
  | ''
  | '-50'
  | '-100'
  | '-300'
  | '-400'
  | '-500'
  | '-700'
  | '-800'
  | '-900'
  | '-950';
type TOpacities =
  | ''
  | '-10'
  | '-20'
  | '-30'
  | '-40'
  | '-50'
  | '-60'
  | '-70'
  | '-80'
  | '-90';
type TVariatedColor = `${keyof typeof EColors}${TAccentuations}${TOpacities}`;

interface IColorStates {
  base?: TVariatedColor;

  hover?: TVariatedColor;
  focus?: TVariatedColor;

  errored?: TVariatedColor;
  erroredHover?: TVariatedColor;
  erroredFocus?: TVariatedColor;
}

interface ISelectorStates {
  /** Default stuff */
  base?: string;

  /** On hover */
  hover?: string;
  focus?: string;

  errored?: string;
  erroredHover?: string;
  erroredFocus?: string;
}

export interface ISkssSelectors {
  text?: string | ISelectorStates;

  bg?: string | ISelectorStates;
  border?: string | ISelectorStates;
  innerBorder?: string | ISelectorStates;
  shadow?: string | ISelectorStates;

  rounded?: string | ISelectorStates;

  width?: string | ISelectorStates;
  height?: string | ISelectorStates;
}
