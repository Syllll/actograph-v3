import { PipeTransform } from '@nestjs/common';
export declare class ParseEnumArrayPipe implements PipeTransform {
    private readonly type;
    private readonly seperator;
    constructor(options: any);
    parseAndValidate(value: any): any;
    transform(value: any): any[];
}
