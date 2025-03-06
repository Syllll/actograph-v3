import { defineComponent, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQueryParams } from 'src/../lib-improba/composables/use-query-params';

import type { QTablePagination } from 'src/../lib-improba/utils/q-table-types.utils';

export const useUrlProps = {
  // The table will use the url to store the pagination, sorting etc. In query params.
  // Note: several tables on the same page PLUS useQuery is not supported.
  // Note 2: When using useUrl, you must provide a tableUrlId.
  useUrl: {
    type: Boolean,
    default: false,
  },
  // Associate an id to the table, it will be used to store the pagination in the url
  // This is useful when you change page and have a table on the page you come from and the new one.
  // Note: several tables on the same page PLUS useUrl is not supported
  tableUrlId: {
    type: String,
    default: undefined,
  },
};

// A composable to handle the url for the table (query params).
export const useUrl = (options: {
  props: any;
  fetch: () => void; // The fetch function of the table
}) => {
  const route = useRoute();
  const router = useRouter();
  const qp = useQueryParams();

  // The methods of the composable
  const methods = {
    // This function is called when the table emits the 'request' event (when it wants to fetch data).
    // The function will update the query params in the url according to the pagination result.
    async onRequest(options: {
      requestProps?: any;
      pagination: QTablePagination;
      tableUrlId: string;
      onMountedOngoing: boolean;
    }) {
      const { page, rowsPerPage } = options.requestProps.pagination;

      const pagination = {
        ...options.requestProps.pagination,
        page: isNaN(page) ? options.pagination.page : page,
        rowsPerPage: isNaN(rowsPerPage)
          ? options.pagination.rowsPerPage
          : rowsPerPage,
      };
      delete pagination.rowsNumber;

      // Take the pagination and create another object with tableUrlId in front of each key
      const paginationForQueryParams = Object.keys(pagination).reduce(
        (acc, key) => {
          acc[`${options.tableUrlId}_${key}`] = pagination[key];
          return acc;
        },
        {} as { [key: string]: any }
      );

      // Update the query params in the url, using the pagination info
      await qp.methods.updateRouteQuery(
        {
          ...paginationForQueryParams,
        },
        options.onMountedOngoing
      );
    },
    // This is used to parse the query params in the url.
    // And return them as a pagination object (plus tableUrlId)
    parseRouteQueryParams(query: any, tableUrlId: string) {
      const _tableUrlId = tableUrlId;

      const pageQuery = query[_tableUrlId + '_page'];
      const rppQuery = query[_tableUrlId + '_rowsPerPage'];
      const sbQuery = query[_tableUrlId + '_sortBy'];
      const dQuery = query[_tableUrlId + '_descending'];

      const page = pageQuery?.length ? parseInt(pageQuery) : undefined;
      const rowsPerPage = rppQuery?.length ? parseInt(rppQuery) : undefined;
      const sortBy = sbQuery?.length ? sbQuery as string : undefined;
      const descending = dQuery?.length ? dQuery === 'true' : undefined;

      return { page, rowsPerPage, sortBy, descending, tableUrlId };
    },
    async clearRouteQueryParams(tableUrlId: string) {
      await qp.methods.clearRouteQuery([
        tableUrlId + '_page',
        tableUrlId + '_rowsPerPage',
        tableUrlId + '_rowsNumber',
        tableUrlId + '_sortBy',
        tableUrlId + '_descending',
        tableUrlId + '_tableUrlId',
      ]);
    },
  };

  // Reload when a query param changes
  watch(
    () => route.query,
    (newValue, oldValue) => {
      const tableUrlId = options.props.tableUrlId;

      const oldPagination = methods.parseRouteQueryParams(oldValue, tableUrlId);
      const newPagination = methods.parseRouteQueryParams(newValue, tableUrlId);
      if (JSON.stringify(oldPagination) !== JSON.stringify(newPagination)) {
        options.fetch();
      }
    }
  );

  return {
    methods,
  };
};
