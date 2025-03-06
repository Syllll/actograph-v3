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

export interface ISearchQueryParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  q?: string;
}

// This is a custom decorator that will parse the query parameters
// and return an object with the parsed values
export const SearchQueryParams = createParamDecorator(
  async (
    data: {
      // This is an optional object that will allow you to disable
      // the pagination parameters
      pagination?: boolean;
      // This is an optional object that will allow you to disable
      // the search parameters (q)
      useQ?: boolean;
    } = {
      pagination: true,
      useQ: true,
    },
    ctx: ExecutionContext,
  ) => {
    // Create instances of the pipes to be used later
    const parseIntOrUndefinedPipe = new ParseIntOrUndefinedPipe();
    const parseStringOrUndefinedPipe = new ParseStringOrUndefinedPipe();
    const parseFilterPipe = new ParseFilterPipe();

    const query = ctx.switchToHttp().getRequest().query;

    let output: ISearchQueryParams = {};

    // If the pagination parameter is enabled, parse the pagination parameters
    if (data.pagination) {
      const limit = parseIntOrUndefinedPipe.transform(query.limit, {
        type: 'query',
        metatype: Number,
        data: 'limit',
      });

      const offset = parseIntOrUndefinedPipe.transform(query.offset, {
        type: 'query',
        metatype: Number,
        data: 'offset',
      });

      const orderBy = parseStringOrUndefinedPipe.transform(query.orderBy, {
        type: 'query',
        metatype: String,
        data: 'orderBy',
      });

      const order = parseStringOrUndefinedPipe.transform(query.order, {
        type: 'query',
        metatype: String,
        data: 'order',
        choices: ['ASC', 'DESC'],
      });

      output = {
        ...output,
        limit: limit || 10,
        offset: offset || 0,
        orderBy: orderBy || 'id',
        order: <any>order || 'DESC',
      };
    }

    // If the search parameter is enabled, parse the search parameter
    if (data.useQ) {
      const q = parseFilterPipe.transform(query.q, {
        type: 'query',
        metatype: String,
        data: 'q',
      });

      output = {
        ...output,
        q,
      };
    }

    return output;
  },
);
