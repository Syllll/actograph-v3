import { PipeTransform } from '@nestjs/common';
export declare class ParsePeriodicity implements PipeTransform<string | undefined> {
    transform(value?: string): Promise<string | undefined>;
}
