import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class ParseStringOrUndefinedPipe implements PipeTransform {
  protected parseAndValidate(
    value: any,
    metadata: ArgumentMetadata & {
      choices?: string[];
    }
  ): string | undefined;
  transform(
    value: any,
    metadata: ArgumentMetadata & {
      choices?: string[];
    }
  ): string | undefined;
}
