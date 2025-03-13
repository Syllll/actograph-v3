/*
  ? use-props

  * This composable is used to easily import/create prebuilt props with builderOptions and stuff
  TODO Write more doc
*/

export const useProps = () => {
  const stateless = {
    defaultCategory: null as string | null,
    propsThemes: {
      tree: ['objectInTreeId', 'myTreeId'],
      style: ['customStyle', 'customClass'],
      size: ['customWidth', 'customHeight'],
    },
    defaultProps: {
      objectInTreeId: {
        type: Number,
        required: true,
        builderOptions: { hide: true },
      },
      myTreeId: {
        type: String,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      customStyle: {
        type: String,
        builderOptions: { label: 'Style' },
      },
      customClass: {
        type: String,
        builderOptions: { label: 'Class' },
      },
      customWidth: {
        type: String,
        builderOptions: { label: 'Width' },
      },
      customHeight: {
        type: String,
        builderOptions: { label: 'Height' },
      },
    },
  };

  // ? Converts every propsThemes/defaultProps key into a typed array (cool for autocomplete)
  type PropsThemesKeys = keyof typeof stateless.propsThemes;
  type DefaultPropsKeys = keyof typeof stateless.defaultProps;

  interface ITheme {
    [key: string]: string[];
  }

  interface IBuilderOptions {
    [key: string]: any;
  }
  interface IDefaultProp {
    [key: string]: {
      type: any;

      default?: string | number | boolean;
      required?: boolean;

      builderOptions?: IBuilderOptions;

      [key: string]: any;
    };
  }
  const methods = {
    getPropByName: (
      name: DefaultPropsKeys,
      category = stateless.defaultCategory
    ) => {
      return {
        ...(stateless.defaultProps as IDefaultProp)[name],
        builderOptions: {
          ...(stateless.defaultProps as IDefaultProp)[name]?.builderOptions,
          category,
        },
      };
    },
    getMultiplePropsByName: (names: DefaultPropsKeys[]) => {
      return names?.map((name) => methods.getPropByName(name));
    },

    getPropsByTheme: (theme: PropsThemesKeys, customCategory?: string) => {
      const target = (stateless.propsThemes as ITheme)[theme];
      if (!target) {
        return [];
      }

      return target
        ?.map((propName: string) => ({
          [propName]: methods.getPropByName(
            propName as DefaultPropsKeys,
            customCategory || theme
          ),
        }))
        ?.reduce((acc, cur) => {
          const [key, value] = Object.entries(cur)[0];
          acc[key] = value;

          return acc;
        }, {});
    },
    getMultiplePropsByThemes: (themes: PropsThemesKeys[]) => {
      return themes?.map((theme) => methods.getPropsByTheme(theme));
    },

    createStringProp: (
      label: string,
      category = stateless.defaultCategory,
      params?: any,
      boParams?: any
    ) => {
      return {
        type: String,
        builderOptions: {
          label,
          category,
          ...boParams,
        },
        ...params,
      };
    },
    createMultipleStringProps: (
      names: string[],
      category = stateless.defaultCategory,
      params?: any,
      boParams?: any
    ) => {
      return names
        ?.map((name) => ({
          [name]: methods.createStringProp(name, category, params, boParams),
        }))
        ?.reduce((acc, cur) => {
          const [key, value] = Object.entries(cur)[0];
          acc[key] = value;

          return acc;
        }, {});
    },
  };

  return {
    stateless,
    methods,
  };
};
