import { PipeTransform } from '@nestjs/common';
export declare class ParseBoolOrUndefinedPipe implements PipeTransform {
  transform(value: any): boolean | undefined;
}
