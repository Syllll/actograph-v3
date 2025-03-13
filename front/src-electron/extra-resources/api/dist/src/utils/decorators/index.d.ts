export interface ISearchQueryParams {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    q?: string;
}
export declare const SearchQueryParams: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | {
    pagination?: boolean | undefined;
    useQ?: boolean | undefined;
} | undefined)[]) => ParameterDecorator;
