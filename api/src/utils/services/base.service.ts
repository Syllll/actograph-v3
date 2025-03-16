import * as fs from 'fs';
import * as path from 'path';

import { FindOneOptions, ObjectLiteral } from 'typeorm';
import {
  BaseRepository,
  IPaginationOutput,
  IPaginationOptions,
} from '@utils/repositories/base.repositories';

import { createFolderIfNeeded } from '../../utils/files/index';

export type UploadedFile = {
  filename: string;
  filepath: string;
  publicpath: string;
  size: number;
  mimetype: string;
  originalname: string;
  url: string;
};

export class BaseService<Entity extends ObjectLiteral, Repository> {
  constructor(private readonly _repository: Repository) {}

  protected addUniquely(relations: string[], ...strings: string[]) {
    for (const str of strings)
      if (!relations.includes(str)) relations.push(str);
  }

  // protected addUniquely(relations: string[], str: string) {
  //   if (!relations.includes(str)) relations.push(str);
  // }

  public async findAndPaginate(
    options: IPaginationOptions,
  ): Promise<IPaginationOutput<Entity>> {
    const results = await (
      this._repository as unknown as BaseRepository<Entity>
    ).findAndPaginate(options);

    return results;
  }

  public async findAll(): Promise<Partial<Entity>[]> {
    return await (this._repository as unknown as BaseRepository<Entity>).find({
      order: <any>{ id: 'DESC' },
    });
  }

  public async findOne(
    id: number,
    options?: FindOneOptions,
  ): Promise<Partial<Entity> | undefined> {
    return await (
      this._repository as unknown as BaseRepository<Entity>
    ).findOneFromId(id, options);
  }

  async delete(id: number): Promise<Entity | undefined> {
    const entity = await (<BaseRepository<Entity>>(
      (<unknown>this._repository)
    )).findOneFromId(id);
    await (this._repository as unknown as BaseRepository<Entity>).softDelete(
      id,
    );
    return entity;
  }

  async uploadFile(
    file: Express.Multer.File,
    subfolder: string,
  ): Promise<UploadedFile> {
    const folder = path.join(String(process.env.UPLOAD_FOLDER), subfolder);
    await createFolderIfNeeded(folder);
    let filename = file.originalname;
    let filepath = path.join(folder, filename);
    // append number to file name
    if (fs.existsSync(filepath)) {
      const extension = path.extname(filename);
      filename = filename.replace(
        extension,
        `${new Date()
          .toISOString()
          .slice(2, 19)
          .replace(/[-TZ:]/g, '')}.${extension}`,
      );
      filepath = path.join(folder, filename);
      console.log({ extension, filepath });
    }
    fs.appendFileSync(filepath, file.buffer, {
      flag: 'wx',
    });
    const publicPath = filepath.replace(
      `${process.env.PUBLIC_UPLOADS_FOLDER}`,
      '',
    );
    return {
      filename,
      filepath,
      size: file.size,
      mimetype: file.mimetype,
      originalname: file.originalname,
      publicpath: publicPath,
      url: `${process.env.API_URL}${publicPath}`,
    };
  }
}
