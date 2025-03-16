import { PipeTransform } from '@nestjs/common';
export declare class ParseIncludePipe implements PipeTransform {
  private readonly relations;
  private readonly outputType;
  private readonly separator;
  constructor(options: {
    relations: string[];
    outputType?: 'array' | 'string';
    separator?: string;
  });
  parseAndValidate(value: any): string;
  transform(value: any): any;
}
