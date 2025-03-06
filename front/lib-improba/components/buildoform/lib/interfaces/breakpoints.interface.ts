export enum EBreakpoints {
  xs = 'xs',
  sm = 'sm',
  md = 'md',
  lg = 'lg',
  xl = 'xl'
}

export interface IBreakpoints {
  base?: string|number;
  xs?: string|number;
  sm?: string|number;
  md?: string|number;
  lg?: string|number;
  xl?: string|number;
}

export interface ICols {
  cols?: string|number|IBreakpoints
}