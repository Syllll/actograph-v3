/// <reference types="multer" />
import { FindOneOptions, ObjectLiteral } from 'typeorm';
import { IPaginationOutput, IPaginationOptions } from '@utils/repositories/base.repositories';
export declare type UploadedFile = {
    filename: string;
    filepath: string;
    publicpath: string;
    size: number;
    mimetype: string;
    originalname: string;
    url: string;
};
export declare class BaseService<Entity extends ObjectLiteral, Repository> {
    private readonly _repository;
    constructor(_repository: Repository);
    protected addUniquely(relations: string[], ...strings: string[]): void;
    findAndPaginate(options: IPaginationOptions): Promise<IPaginationOutput<Entity>>;
    findAll(): Promise<Partial<Entity>[]>;
    findOne(id: number, options?: FindOneOptions): Promise<Partial<Entity> | undefined>;
    delete(id: number): Promise<Entity | undefined>;
    uploadFile(file: Express.Multer.File, subfolder: string): Promise<UploadedFile>;
}
