import { ProtocolItemTypeEnum, ProtocolItemActionEnum } from '../enums';
import { IProtocolItem } from '../types';
import {
  IValidationResult,
  IValidationError,
  validResult,
  invalidResult,
  validationError,
  mergeValidationResults,
} from './types';

/**
 * Validates a protocol item (category or observable)
 */
export function validateProtocolItem(
  item: Partial<IProtocolItem>,
  path: string = 'item',
): IValidationResult {
  const errors: IValidationError[] = [];

  // Validate type
  if (!item.type) {
    errors.push(
      validationError(`${path}.type`, 'Le type est requis', 'REQUIRED'),
    );
  } else if (!Object.values(ProtocolItemTypeEnum).includes(item.type)) {
    errors.push(
      validationError(
        `${path}.type`,
        `Type invalide: ${item.type}`,
        'INVALID_ENUM',
      ),
    );
  }

  // Validate id
  if (!item.id || item.id.trim().length === 0) {
    errors.push(
      validationError(`${path}.id`, 'L\'identifiant est requis', 'REQUIRED'),
    );
  }

  // Validate name
  if (!item.name || item.name.trim().length === 0) {
    errors.push(
      validationError(`${path}.name`, 'Le nom est requis', 'REQUIRED'),
    );
  }

  // Validate action (only for observables/categories with children)
  if (item.action && !Object.values(ProtocolItemActionEnum).includes(item.action)) {
    errors.push(
      validationError(
        `${path}.action`,
        `Action invalide: ${item.action}`,
        'INVALID_ENUM',
      ),
    );
  }

  // Validate children recursively
  if (item.children && Array.isArray(item.children)) {
    const childResults = item.children.map((child, index) =>
      validateProtocolItem(child, `${path}.children[${index}]`),
    );
    const childMerged = mergeValidationResults(childResults);
    if (!childMerged.valid) {
      errors.push(...childMerged.errors);
    }
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

/**
 * Validates protocol structure (array of items)
 */
export function validateProtocolStructure(
  items: IProtocolItem[],
): IValidationResult {
  if (!items || !Array.isArray(items)) {
    return invalidResult([
      validationError(
        'items',
        'Les items du protocole doivent être un tableau',
        'INVALID_TYPE',
      ),
    ]);
  }

  const errors: IValidationError[] = [];

  // Validate each item
  const itemResults = items.map((item, index) =>
    validateProtocolItem(item, `items[${index}]`),
  );
  const itemMerged = mergeValidationResults(itemResults);

  if (!itemMerged.valid) {
    return itemMerged;
  }

  // Validate that all root items are categories
  for (let i = 0; i < items.length; i++) {
    if (items[i].type !== ProtocolItemTypeEnum.Category) {
      errors.push(
        validationError(
          `items[${i}]`,
          'Les items racine doivent être des catégories',
          'INVALID_ROOT_TYPE',
        ),
      );
    }
  }

  // Validate unique IDs
  const allIds = collectAllIds(items);
  const duplicates = findDuplicates(allIds);

  if (duplicates.length > 0) {
    errors.push(
      validationError(
        'items',
        `IDs dupliqués trouvés: ${duplicates.join(', ')}`,
        'DUPLICATE_IDS',
      ),
    );
  }

  // Validate unique names within same level
  for (let i = 0; i < items.length; i++) {
    const category = items[i];
    if (category.children) {
      const childNames = category.children.map((c) => c.name);
      const dupNames = findDuplicates(childNames);
      if (dupNames.length > 0) {
        errors.push(
          validationError(
            `items[${i}].children`,
            `Noms d'observables dupliqués dans la catégorie "${category.name}": ${dupNames.join(', ')}`,
            'DUPLICATE_NAMES',
          ),
        );
      }
    }
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

/**
 * Collects all IDs from protocol items recursively
 */
function collectAllIds(items: IProtocolItem[]): string[] {
  const ids: string[] = [];

  for (const item of items) {
    ids.push(item.id);
    if (item.children) {
      ids.push(...collectAllIds(item.children));
    }
  }

  return ids;
}

/**
 * Finds duplicate values in an array
 */
function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of arr) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return Array.from(duplicates);
}

/**
 * Validates that a category has at least one observable
 */
export function validateCategoryHasObservables(
  category: IProtocolItem,
  path: string = 'category',
): IValidationResult {
  if (category.type !== ProtocolItemTypeEnum.Category) {
    return validResult();
  }

  if (!category.children || category.children.length === 0) {
    return invalidResult([
      validationError(
        `${path}`,
        `La catégorie "${category.name}" doit contenir au moins un observable`,
        'EMPTY_CATEGORY',
      ),
    ]);
  }

  return validResult();
}

