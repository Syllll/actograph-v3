import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
export declare class ParseIntOrUndefinedPipe implements PipeTransform {
    protected parseAndValidate(value: any, metadata: ArgumentMetadata): number | undefined;
    transform(value: string, metadata: ArgumentMetadata): number | undefined;
}
