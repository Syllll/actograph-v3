import {
  BadRequestException,
  createParamDecorator,
  DefaultValuePipe,
  ExecutionContext,
  ParseIntPipe,
} from '@nestjs/common';
import { IPaginationOptions } from '@utils/repositories/base.repositories';
import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ValidateIf,
} from 'class-validator';
import {
  ParseFilterPipe,
  ParseIntOrUndefinedPipe,
  ParseStringOrUndefinedPipe,
} from '@utils/pipes';

export const PaginationQueries = createParamDecorator(
  async (data: any, ctx: ExecutionContext) => {
    const parseIntOrUndefinedPipe = new ParseIntOrUndefinedPipe();
    const parseStringOrUndefinedPipe = new ParseStringOrUndefinedPipe();
    const parseFilterPipe = new ParseFilterPipe();

    const limit = parseIntOrUndefinedPipe.transform('limit', {
      type: 'query',
      metatype: Number,
      data: 'limit',
    });

    const offset = parseIntOrUndefinedPipe.transform('offset', {
      type: 'query',
      metatype: Number,
      data: 'offset',
    });

    const orderBy = parseStringOrUndefinedPipe.transform('orderBy', {
      type: 'query',
      metatype: String,
      data: 'orderBy',
    });

    const order = parseStringOrUndefinedPipe.transform('order', {
      type: 'query',
      metatype: String,
      data: 'order',
      choices: ['ASC', 'DESC'],
    });

    const q = parseFilterPipe.transform('q', {
      type: 'query',
      metatype: String,
      data: 'q',
    });

    return {
      limit: limit || 10,
      offset: offset || 0,
      orderBy: orderBy || 'id',
      order: order || 'DESC',
      q,
    };
  },
);

export class PaginationDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value), { toClassOnly: true })
  limit: number = 100;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value), { toClassOnly: true })
  offset: number = 0;

  @IsString()
  @IsOptional()
  orderBy: string = 'id';

  @ValidateIf((o) => o.order === 'ASC' || o.order === 'DESC')
  @IsOptional()
  order: IPaginationOptions['order'] = 'DESC';

  @ValidateIf((o) => {
    const includes = o.includes;
    if (typeof includes === 'string') {
      return true;
    } else {
      return false;
    }
  })
  @IsOptional()
  @Transform(
    ({ value }) => {
      if (!value || value.length === 0) {
        return [];
      }
      return value.split(',');
    },
    { toClassOnly: true },
  )
  includes: string[] = [];
}

export class PaginationWithSearchDto extends PaginationDto {
  @IsString()
  @IsOptional()
  q: string = '*';
}
