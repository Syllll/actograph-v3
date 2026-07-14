import { ProtocolItemActionEnum } from '@services/observations/interface';

export interface IConditionalObservableOption {
  label: string;
  value: string;
}

export interface IConditionalObservableProtocolItem {
  type?: string;
  id?: string;
  action?: string;
  children?: Array<{
    type?: string;
    name?: string;
  }>;
}

export function isContinuousCategoryAction(
  action?: string | ProtocolItemActionEnum,
): boolean {
  return !action || action === ProtocolItemActionEnum.Continuous;
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
