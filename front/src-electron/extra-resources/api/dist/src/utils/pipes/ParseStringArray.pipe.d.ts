import { PipeTransform } from '@nestjs/common';
export declare class ParseStringArrayPipe implements PipeTransform {
    private readonly outputType;
    private readonly separator;
    constructor(options: {
        outputType?: 'array' | 'string';
        separator?: string;
    });
    parseAndValidate(value: any): string;
    transform(value: any): any;
}
