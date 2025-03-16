import { PipeTransform } from '@nestjs/common';
export declare class ParseEnumPipe implements PipeTransform {
  private readonly type;
  constructor(options: any);
  private isInEnum;
  parseAndValidate(value: any): any;
  transform(value: any): any;
}
