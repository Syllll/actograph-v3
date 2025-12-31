import {
  validateProtocolItem,
  validateProtocolStructure,
  validateCategoryHasObservables,
} from '../../validation/protocol.validation';
import { ProtocolItemTypeEnum, ProtocolItemActionEnum } from '../../enums';
import { IProtocolItem } from '../../types';

describe('protocol.validation', () => {
  describe('validateProtocolItem', () => {
    it('should fail for missing type', () => {
      const result = validateProtocolItem({ id: '1', name: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('type'))).toBe(true);
    });

    it('should fail for missing id', () => {
      const result = validateProtocolItem({
        type: ProtocolItemTypeEnum.Category,
        name: 'Test',
      } as IProtocolItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('id'))).toBe(true);
    });

    it('should fail for missing name', () => {
      const result = validateProtocolItem({
        type: ProtocolItemTypeEnum.Category,
        id: '1',
      } as IProtocolItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('name'))).toBe(true);
    });

    it('should pass for valid category', () => {
      const result = validateProtocolItem({
        type: ProtocolItemTypeEnum.Category,
        id: 'cat1',
        name: 'Category 1',
      });
      expect(result.valid).toBe(true);
    });

    it('should validate children recursively', () => {
      const result = validateProtocolItem({
        type: ProtocolItemTypeEnum.Category,
        id: 'cat1',
        name: 'Category 1',
        children: [
          { type: ProtocolItemTypeEnum.Observable, id: '', name: 'Obs 1' }, // Invalid: empty id
        ],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateProtocolStructure', () => {
    it('should fail for non-array input', () => {
      const result = validateProtocolStructure(null as unknown as IProtocolItem[]);
      expect(result.valid).toBe(false);
    });

    it('should fail for root items that are not categories', () => {
      const items: IProtocolItem[] = [
        {
          type: ProtocolItemTypeEnum.Observable,
          id: 'obs1',
          name: 'Observable 1',
        },
      ];
      const result = validateProtocolStructure(items);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_ROOT_TYPE')).toBe(true);
    });

    it('should fail for duplicate IDs', () => {
      const items: IProtocolItem[] = [
        {
          type: ProtocolItemTypeEnum.Category,
          id: 'same-id',
          name: 'Category 1',
          children: [
            { type: ProtocolItemTypeEnum.Observable, id: 'same-id', name: 'Obs 1' },
          ],
        },
      ];
      const result = validateProtocolStructure(items);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DUPLICATE_IDS')).toBe(true);
    });

    it('should fail for duplicate names within category', () => {
      const items: IProtocolItem[] = [
        {
          type: ProtocolItemTypeEnum.Category,
          id: 'cat1',
          name: 'Category 1',
          children: [
            { type: ProtocolItemTypeEnum.Observable, id: 'obs1', name: 'Same Name' },
            { type: ProtocolItemTypeEnum.Observable, id: 'obs2', name: 'Same Name' },
          ],
        },
      ];
      const result = validateProtocolStructure(items);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DUPLICATE_NAMES')).toBe(true);
    });

    it('should pass for valid protocol', () => {
      const items: IProtocolItem[] = [
        {
          type: ProtocolItemTypeEnum.Category,
          id: 'cat1',
          name: 'Category 1',
          action: ProtocolItemActionEnum.Continuous,
          children: [
            { type: ProtocolItemTypeEnum.Observable, id: 'obs1', name: 'Observable 1' },
            { type: ProtocolItemTypeEnum.Observable, id: 'obs2', name: 'Observable 2' },
          ],
        },
        {
          type: ProtocolItemTypeEnum.Category,
          id: 'cat2',
          name: 'Category 2',
          action: ProtocolItemActionEnum.Discrete,
          children: [
            { type: ProtocolItemTypeEnum.Observable, id: 'obs3', name: 'Observable 3' },
          ],
        },
      ];
      const result = validateProtocolStructure(items);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCategoryHasObservables', () => {
    it('should pass for non-category items', () => {
      const item: IProtocolItem = {
        type: ProtocolItemTypeEnum.Observable,
        id: 'obs1',
        name: 'Observable 1',
      };
      const result = validateCategoryHasObservables(item);
      expect(result.valid).toBe(true);
    });

    it('should fail for empty category', () => {
      const item: IProtocolItem = {
        type: ProtocolItemTypeEnum.Category,
        id: 'cat1',
        name: 'Category 1',
        children: [],
      };
      const result = validateCategoryHasObservables(item);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('EMPTY_CATEGORY');
    });

    it('should pass for category with observables', () => {
      const item: IProtocolItem = {
        type: ProtocolItemTypeEnum.Category,
        id: 'cat1',
        name: 'Category 1',
        children: [
          { type: ProtocolItemTypeEnum.Observable, id: 'obs1', name: 'Obs 1' },
        ],
      };
      const result = validateCategoryHasObservables(item);
      expect(result.valid).toBe(true);
    });
  });
});

