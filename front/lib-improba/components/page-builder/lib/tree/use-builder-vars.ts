import { reactive, watch, onMounted, onBeforeMount, nextTick, onUnmounted } from 'vue';
import { replaceAll } from '@lib-improba/utils/general.utils';
import { useQuasar } from 'quasar';
import { useTree } from './use-tree';

export const useBuilderVars = (props: any, context?: any) => {
  const quasar = useQuasar();
  const screen = quasar.screen;

  const stateless = {};

  const state = reactive({
    populatedProps: {} as any,
  });

  const methods = {
    populatePropsWithScreenSize: () => {
      let componentProps = props.builderJson.props;

      if (props.builderJson.props.__screen) {
        const screenProps = props.builderJson.props.__screen as any;
        if (screenProps.sm && screen.lt.sm) {
          componentProps = {...componentProps, ...screenProps.sm};
        } else if (screenProps.md && screen.lt.md ) {
          componentProps = {...componentProps, ...screenProps.md};
        } else if ( screenProps.lg && screen.lt.lg) {
          componentProps = {...componentProps, ...screenProps.lg};
        } else if (screenProps.xl && screen.lt.xl) {
          componentProps = {...componentProps, ...screenProps.xl};
        }
      }

      return componentProps
    },
    populateProps: () => {// We have two things:
      // - props.builderJson.props: the props of the component
      // - props.builderVars: the variables that we want to replace in the props
      // In this methods, we will look for the variables in the props ({{ MESSAGE }}) and replace them by the given variables in props.builderVars (builderVars.MESSAGE='toto' for example)

      // const componentProps = props.builderJson.props;
      const componentProps = methods.populatePropsWithScreenSize();

      // Skip everything if there is no props or no builderVars
      if (!props.builderVars || !componentProps) {
        return { ...componentProps };
      }

      // Regex to extract the content brackets: "tata {{ toto }}" => "toto"
      const regex = /\{{(.*?)\}}/g;

      const rawBuilderPropNames = Object.keys(componentProps);
      const processedBuilderProps = {} as any;
      // Loop on each prop
      for (const rawBuilderPropName of rawBuilderPropNames) {
        const rawBuilderProp = componentProps[rawBuilderPropName];
        const propValue = rawBuilderProp;

        // Check the type is string
        if (!propValue || typeof propValue !== 'string') {
          processedBuilderProps[rawBuilderPropName] = rawBuilderProp;
          continue;
        }

        // Find all vars with: {{ var }}
        const matchArray = propValue.match(regex);
        if (!matchArray) {
          processedBuilderProps[rawBuilderPropName] = rawBuilderProp;
          continue;
        }

        let newPropValue = propValue;
        // Loop on each var that was found in the prop
        for (const v of matchArray) {
          /*
          const varName =
            .replace(/\{\{/g, '')
            .replace(/\}\}/g, '')
            .replace(/ /g, '');
          */

          // {{ TOTO }} => TOTO
          let varName = replaceAll(v, '{{', '');
          varName = replaceAll(varName, '}}', '');
          varName = replaceAll(varName, ' ', '');

          if (props.builderVars[varName] === undefined) {
            processedBuilderProps[rawBuilderPropName] = rawBuilderProp;
            continue;
          }

          // Replace the value by the given variable
          newPropValue = replaceAll(
            newPropValue,
            v,
            props.builderVars[varName]
          );
        }

        // Replace the value by the given variable
        processedBuilderProps[rawBuilderPropName] = newPropValue;
      }

      return processedBuilderProps;
    },
    populate: () => {
      // Populate the props
      state.populatedProps = {};
      state.populatedProps = methods.populateProps();
    },
    onResize: () => {
      state.populatedProps = methods.populateProps();
    },
  };

  onBeforeMount(() => {
    methods.populate();
  });

  onMounted(() => {
    nextTick(() => {
      window.addEventListener('resize', methods.onResize);
    });
  })

  onUnmounted(() => {
    window.removeEventListener('resize', methods.onResize);
  });

  watch(
    () => [props.builderJson, props.builderVars],
    () => {
      methods.populate();
    },
    {
      deep: true,
    }
  );

  return {
    stateless,
    state,
    methods,
  };
};
