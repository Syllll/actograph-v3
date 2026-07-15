import { ProtocolItemActionEnum } from '@services/observations/interface';

export interface IConditionalObservableOption {
  label: string;
  value: string;
}

export interface IConditionalObservableProtocolItem {
  type?: string;
  id?: string;
  action?: string;
  children?: IConditionalObservableProtocolItem[];
}

export function isContinuousCategoryAction(
  action?: string | ProtocolItemActionEnum,
): boolean {
  return !action || action === ProtocolItemActionEnum.Continuous;
}

export function resolveCategoryIsContinuous(
  items: IConditionalObservableProtocolItem[],
  categoryId: string,
): boolean {
  const findCategory = (
    nodes: IConditionalObservableProtocolItem[],
  ): IConditionalObservableProtocolItem | null => {
    for (const item of nodes) {
      if (item.type === 'category' && item.id === categoryId) {
        return item;
      }
      if (item.children?.length) {
        const found = findCategory(item.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  const category = findCategory(items);
  if (!category) {
    return true;
  }

  return isContinuousCategoryAction(category.action);
}

/**
 * Observables proposables comme conditions du mode avancé :
 * catégories continues uniquement, hors observables de la catégorie cible.
 */
export function buildConditionalObservableOptions(
  items: IConditionalObservableProtocolItem[],
  targetCategoryId: string | null,
): IConditionalObservableOption[] {
  const targetCategoryObservableNames = new Set<string>();

  if (targetCategoryId) {
    const targetCategory = items.find(
      (item) => item.type === 'category' && item.id === targetCategoryId,
    );
    if (targetCategory?.children) {
      for (const child of targetCategory.children) {
        if (child.type === 'observable' && child.name) {
          targetCategoryObservableNames.add(child.name);
        }
      }
    }
  }

  const observables: IConditionalObservableOption[] = [];

  for (const item of items) {
    if (
      item.type !== 'category' ||
      !item.children ||
      !isContinuousCategoryAction(item.action)
    ) {
      continue;
    }

    for (const child of item.children) {
      if (
        child.type === 'observable' &&
        child.name &&
        !targetCategoryObservableNames.has(child.name)
      ) {
        observables.push({
          label: child.name,
          value: child.name,
        });
      }
    }
  }

  return observables;
}
