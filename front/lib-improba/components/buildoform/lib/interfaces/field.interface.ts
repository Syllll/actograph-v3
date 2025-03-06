import { ICols } from './breakpoints.interface';

enum ESlotPosition {
  append = 'append',
  prepend = 'prepend'
}

enum ERadioType {
  checkbox = 'checkbox',
  radio = 'radio',
  toggle = 'toggle'
}

enum ETextFieldType {
  text = 'text',
  password = 'password',
  textarea = 'textarea',
  email = 'email',
  search = 'search',
  tel = 'tel',
  file = 'file',
  number = 'number',
  url = 'url',
  time = 'time',
  date = 'date',
  'datetime-local' = 'datetime-local'
}

export interface IStep {
  name: string;
  value: string;

  desc?: string;

  display?: boolean;
}

export interface IStep {
  name: string;
  value: string;

  desc?: string;

  display?: boolean;

  index?: number;
}

interface ICondition {
  model: string;
  value: string;
}

interface IOptions {
  options?: string[]|{ label: string, value: string|number|boolean, conditions?: ICondition[] }[]
  base?: string[]|{ label: string, value: string|number|boolean, conditions?: ICondition[] }[]
}

interface IBaseInput extends ICols {
  // ? Style
  label?: string|boolean;
  placeholder?: string;
  color?: string;

  // ? Type
  type?: keyof typeof ERadioType | keyof typeof ETextFieldType;

  // ? Dependance
  dependance?: string;
  conditions?: ICondition[];

  // ? State
  touched?: null|boolean;
  error?: boolean;
  disabled?: boolean;
}

interface IDateNumberInput {
  min?: number|Date;
  max?: number|Date;
}

interface IFormLayout {
  infophrase?: string;
  infophraseIcon?: string;
}

interface ISelect extends IOptions {
  emitValue?: boolean;
  mapOptions?: boolean
  optionValue?: string;
  optionLabel?: string;
}

interface IRadio {
  val?: string|number;
  leftLabel?: boolean;

  checkedIcon?: string;
  uncheckedIcon?: string;
}

// interface IOptionGroup extends IOptions {
// }

interface ISlider extends IDateNumberInput {
  vertical?: boolean;

  innerMin?: number;
  innerMax?: number;

  labelAlways?: boolean;
  switchLabelSide?: boolean;
}

interface IDatePicker extends IDateNumberInput {
  mask?: string;

  closeLabel?: string;
  // confirmLabel?: string;

  icon?: string;
  iconPosition?: keyof typeof ESlotPosition;
}

export interface IField
extends
  IBaseInput,
  IDateNumberInput,
  IFormLayout,
  ISelect,
  IRadio,
  // IOptionGroup,
  ISlider,
  IDatePicker
{
  // ? Identification
  is: string;
  ref: string;
  step?: string|IStep;

  // ? Validation
  model: string;
  required?: boolean;
  rules?: string[];
}