import { ref } from 'vue';
import type { IProtocolItemWithChildren } from '@database/repositories/protocol.repository';

/** A disposable protocol draft. No database writes occur before validation. */
export function useProtocolDraft() {
  const categories = ref<IProtocolItemWithChildren[]>([]);
  let nextId = -1;
  const begin = (items: IProtocolItemWithChildren[]) => {
    categories.value = JSON.parse(JSON.stringify(items));
    nextId = -1;
  };
  const assertName = (name: string, type: 'category' | 'observable', exceptId?: number) => {
    const trimmed = name.trim();
    if (!trimmed || (type === 'observable' && trimmed.startsWith('#'))) {
      throw new Error('Le nom est requis ; le préfixe # est réservé aux commentaires.');
    }
    const items = type === 'category' ? categories.value : categories.value.flatMap((category) => category.children ?? []);
    if (items.some((item) => item.id !== exceptId && item.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(type === 'observable' ? 'Un observable avec ce nom existe déjà dans le protocole.' : 'Une catégorie avec ce nom existe déjà.');
    }
    return trimmed;
  };
  const addCategory = (name: string, action: string): IProtocolItemWithChildren => {
    const category: IProtocolItemWithChildren = {
      id: nextId--, protocol_id: categories.value[0]?.protocol_id ?? 0, parent_id: null,
      type: 'category', name: assertName(name, 'category'), action, sort_order: categories.value.length, children: [],
    };
    categories.value.push(category);
    return category;
  };
  const addObservable = (categoryId: number, name: string) => {
    const category = categories.value.find((item) => item.id === categoryId);
    if (!category) throw new Error('Catégorie introuvable');
    const children = category.children ?? (category.children = []);
    children.push({ id: nextId--, protocol_id: category.protocol_id, parent_id: categoryId,
      type: 'observable', name: assertName(name, 'observable'), sort_order: children.length });
  };
  const rename = (id: number, name: string) => {
    const item = categories.value.flatMap((category) => [category, ...(category.children ?? [])]).find((item) => item.id === id);
    if (!item) throw new Error('Élément introuvable');
    item.name = assertName(name, item.type, id);
  };
  const remove = (id: number) => {
    categories.value = categories.value.filter((category) => category.id !== id);
    categories.value.forEach((category) => { category.children = category.children?.filter((item) => item.id !== id); });
  };
  return { categories, begin, addCategory, addObservable, rename, remove };
}
