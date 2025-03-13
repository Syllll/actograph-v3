import { defineComponent, reactive, computed, mergeProps } from 'vue';
import { useTree } from './../../../../tree';
import config from './../../../../config';
import { capitalizeFirstLetter } from '@lib-improba/utils/general.utils';
import { INode } from '@lib-improba/components/page-builder/lib/tree/types';

export interface IProp {
  name: string;
  type: string;
  default?: any;
  label?: string;
  description?: string;
  rules?: string[];
  required?: boolean;
  editor?: boolean;
  category?: string;
  class?: string;
  placeholder?: string;
  displayCondition?: (selected: INode) => boolean;
  options?:
    | {
        label: string;
        value: any;
      }[]
    | (() => {
        label: string;
        value: any;
      }[])
    | (() => Promise<
        {
          label: string;
          value: any;
        }[]
      >);
}

const listProps = (component: any): { name: string; props: IProp[] }[] => {
  const props = [] as IProp[];

  if (!component) {
    throw new Error('A component is required');
  }

  if (!component.props) {
    return [];
  }

  const propsArray: [string, any][] = Object.entries(component.props);
  for (const propNotFormatted of propsArray) {
    const name = propNotFormatted[0];
    const propObject = propNotFormatted[1];

    if (propObject.hide) {
      continue;
    }

    const bo = propObject.builderOptions;

    const prop = {
      name: name,
      label: bo?.label,
      type: propObject.type.name,
      default: propObject.default,
      rules: bo?.rules,
      description: bo?.description,
      required: propObject.required,
      editor: bo?.editor,
      options: bo?.options,
      category: bo?.category,
      class: bo?.class,
      placeholder: bo?.placeholder,
      responsive: bo?.responsive,
      displayCondition: bo?.displayCondition,
    } as IProp;

    props.push(prop);
  }

  // Group the props per category
  const propsPerCat = [] as { name: string; props: IProp[] }[];
  for (const prop of props) {
    const category = prop.category || 'default';
    const catIndex = propsPerCat.findIndex((p) => p.name === category);
    if (catIndex >= 0) {
      propsPerCat[catIndex].props.push(prop);
    } else {
      propsPerCat.push({
        name: category,
        props: [prop],
      });
    }
  }

  // Put the default category at the end
  const defaultCatIndex = propsPerCat.findIndex((p) => p.name === 'default');
  if (defaultCatIndex >= 0) {
    const defaultCat = propsPerCat.splice(defaultCatIndex, 1);
    propsPerCat.push(defaultCat[0]);
  }

  return propsPerCat;
};

export const useSelectedComponent = (treeId: string) => {
  const tree = useTree(treeId);

  const computedState = {
    selectedComponent: computed(() => {
      const selected = tree.sharedState.selected;

      if (!selected) {
        return null;
      }

      const compo = tree.methods.findComponentByName(selected.name);
      if (!compo.name) {
        compo.name = selected.name;
      }

      return compo;
    }),
  };

  const methods = {
    listProps,
    findType: (prop: any): any => {
      const propType = prop.type;

      if (prop.options !== undefined) {
        return 'options';
      }

      switch (propType?.toLowerCase()) {
        case 'string':
          return 'text';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        default:
          return 'text';
      }
    },
    rules(prop: IProp): string[] {
      const rules = [] as string[];
      if (prop.rules) {
        rules.push(...prop.rules);
      }
      if (prop.required && !rules.includes('required')) {
        rules.push('required');
      }
      return rules;
    },
    capitalizeFirstLetter,
  };

  return {
    computedState,
    methods,
  };
};
