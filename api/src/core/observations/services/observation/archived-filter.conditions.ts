import {
  IConditions,
  OperatorEnum,
  TypeEnum,
} from '@utils/repositories/base.repositories';

/**
 * Exclude archived observations: include rows with no local meta OR localMeta.archived = false.
 * OR leaves must carry type: TypeEnum.OR so processQuery applies them when i > 0.
 */
export function buildExcludeArchivedFilterConditions(): IConditions {
  return {
    type: TypeEnum.AND,
    conditions: [
      {
        type: TypeEnum.OR,
        conditions: [
          {
            type: TypeEnum.OR,
            key: 'localMeta.id',
            operator: OperatorEnum.IS_NULL,
          },
          {
            type: TypeEnum.OR,
            key: 'localMeta.archived',
            operator: OperatorEnum.EQUAL,
            value: false,
          },
        ],
      },
    ],
  };
}
