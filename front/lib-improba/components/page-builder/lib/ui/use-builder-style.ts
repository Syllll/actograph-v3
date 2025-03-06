import { watch, PropType, onMounted, reactive } from 'vue';
import { setCssVar, getCssVar } from '@lib-improba/utils/style';

export interface IColors {
  primary?: string;
  secondary?: string;
  positive?: string;
  negative?: string;
  neutral?: string;
  warning?: string;
  text?: string;
}
export interface IBuilderStyle {
  colors?: IColors;
}

export const builderStyleProps = {
  builderStyle: {
    type: Object as PropType<null | IBuilderStyle>,
    default: null,
    required: false,
  },
};

export const sharedState = reactive({
  colors: {} as IColors,
});

export const useBuilderStyle = (treeId: string, props?: any) => {
  const methods = {
    setCssColor: (colorName: string, color: string) => {
      setCssVar(`--pb-${colorName}`, color, `#pb-tree-${treeId}`);
      (<any>sharedState.colors)[colorName] = color;
    },
    getCssColor: (colorName: string) => {
      return getCssVar(`--pb-${colorName}`, `#pb-tree-${treeId}`);
    },
    initColors: (styleProp: any) => {
      // Colors
      const colors = styleProp.colors;
      if (colors) {
        sharedState.colors = {};
        const keys = Object.keys(colors);
        for (const colorName of keys) {
          const color = colors[colorName];
          methods.setCssColor(colorName, color);
          (<any>sharedState.colors)[colorName] = color;
        }
      }
    },
  };

  const styleProp = props?.builderStyle;
  if (styleProp) {
    onMounted(() => {
      methods.initColors(styleProp);
    });

    watch(
      () => styleProp,
      () => {
        if (!styleProp?.colors) {
          return;
        }

        // Colors
        methods.initColors(styleProp);
      },
      { deep: true }
    );
  }

  return {
    methods,
    sharedState,
  };
};
