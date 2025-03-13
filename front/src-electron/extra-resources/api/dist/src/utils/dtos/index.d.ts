import { IPaginationOptions } from "@utils/repositories/base.repositories";
export declare const PaginationQueries: (...dataOrPipes: any[]) => ParameterDecorator;
export declare class PaginationDto {
    limit: number;
    offset: number;
    orderBy: string;
    order: IPaginationOptions['order'];
    includes: string[];
}
export declare class PaginationWithSearchDto extends PaginationDto {
    q: string;
}
