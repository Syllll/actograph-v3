import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class ParseFilterPipe implements PipeTransform {
  constructor();
  parseAndValidate(value: any, metadata: ArgumentMetadata): string;
  transform(value: any, metadata: ArgumentMetadata): string | undefined;
}
