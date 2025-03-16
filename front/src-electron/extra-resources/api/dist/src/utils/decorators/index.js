'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SearchQueryParams = void 0;
const common_1 = require('@nestjs/common');
const pipes_1 = require('../pipes');
exports.SearchQueryParams = (0, common_1.createParamDecorator)(
  async (
    data = {
      pagination: true,
      useQ: true,
    },
    ctx
  ) => {
    const parseIntOrUndefinedPipe = new pipes_1.ParseIntOrUndefinedPipe();
    const parseStringOrUndefinedPipe = new pipes_1.ParseStringOrUndefinedPipe();
    const parseFilterPipe = new pipes_1.ParseFilterPipe();
    const query = ctx.switchToHttp().getRequest().query;
    let output = {};
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
      output = Object.assign(Object.assign({}, output), {
        limit: limit || 10,
        offset: offset || 0,
        orderBy: orderBy || 'id',
        order: order || 'DESC',
      });
    }
    if (data.useQ) {
      const q = parseFilterPipe.transform(query.q, {
        type: 'query',
        metatype: String,
        data: 'q',
      });
      output = Object.assign(Object.assign({}, output), { q });
    }
    return output;
  }
);
//# sourceMappingURL=index.js.map
