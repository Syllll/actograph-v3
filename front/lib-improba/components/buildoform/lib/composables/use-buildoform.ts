import { computed, onMounted, reactive, watch } from 'vue';
import { IField, IStep } from '../interfaces/field.interface';
import { useTools } from './use-tools';

const sharedState = reactive({
  step: null as IStep | null,

  allowSubmit: false,
});

export const useBuilder = (context: {
  fields: IField[];
  model: any;
  emit: any;
  step?: string | IStep;
}) => {
  const tools = useTools() as any;

  // bleh | use to update fields on checkErrors()
  context.fields = reactive(context.fields);

  // ? Init the global step to the first one if they are some
  onMounted(() => {
    const { step } = sharedState;
    if (!step && step !== 0) {
      methods.goToNextStep();
    }

    methods.canSubmit();
  });

  const displayedFields = computed(() => {
    const { fields } = context;
    const { step } = sharedState;

    return (
      fields
        // ? Filter by *SHARED.STEP
        ?.filter((f) => {
          if (!step) {
            return true;
          }
          const fstep = typeof f.step === 'string' ? f.step : f.step?.value;

          return fstep === step.value;
        })

        // ? Filter by *CONDITIONS
        ?.filter((f) => {
          if (!f.conditions) {
            return true;
          }
          return f.conditions?.every(({ model, value }) => {
            return methods.compareAndExists(model, value);
          });
        }) || []
    );
  });

  // ? Returns a new *SET of every steps mapped and ordered by first appereance in *CONTEXT.FIELDS
  const mappedSteps = computed(() => {
    const steps = context.fields
      ?.map((f) => f.step || '')

      // _ Map every steps into a mapped IStep
      ?.map((s, i) =>
        typeof s === 'string'
          ? ({ name: '', value: s, index: i } as IStep)
          : ({ ...s, index: i } as IStep)
      )

      // _ Ensure that every step exists
      ?.filter((s) => tools.methods.exists(s.name))
      ?.reduce((acc: IStep[], cur: IStep) => {
        if (!acc?.find(({ value }) => value === cur.value)) {
          acc.push(cur);
        }
        return acc;
      }, [] as IStep[]);

    return steps;
  });

  // ? Global *INFORMATIONS on steps. *STEPINFOS
  const stepInfos = computed(() => {
    const { step } = sharedState;
    const steps = mappedSteps?.value;

    const stepIndex = steps.findIndex((s) => s.value === step?.value);

    const hasStep = steps?.length >= 1;
    const isFirstStep = JSON.stringify(step) === JSON.stringify(steps[0]);
    const isLastStep = !steps[stepIndex + 1];

    return { step, steps, stepIndex, hasStep, isFirstStep, isLastStep };
  });

  const methods = {
    // ? Used in get/setDynamicModel, just don't touch if it's not broken
    // * Index is used in arrays paths
    splittedPath(path: string, index?: number): string[] {
      return path?.replace(/[0-9]/g, String(index))?.split('.') || [];
    },

    /**
     * ? Check if a given model matches a given value
     * @param model - Path of the targeted model
     * @param value - Value to compare
     *
     * @returns A boolean confirming or not the match
     */
    compareAndExists(model: string, value: string | boolean) {
      if (!value) {
        return true;
      }

      const isExclusion =
        typeof value !== 'boolean' && value.startsWith('not:');

      const targetValue = String(isExclusion ? value?.slice(4) : value);
      const targetModel = String(methods.getDynamicModel(model))?.trim();

      const checkExists = targetValue === 'null';

      const compare = checkExists
        ? ['', null, undefined].includes(targetModel)
        : targetModel.includes(targetValue);

      return isExclusion ? !compare : compare;
    },

    goToPreviousStep() {
      const { steps, stepIndex, isFirstStep } = stepInfos?.value;
      if (isFirstStep) {
        return;
      }

      sharedState.step = steps[stepIndex - 1];

      methods.canSubmit();
    },

    goToNextStep() {
      const { steps, stepIndex, isLastStep } = stepInfos?.value;
      if (isLastStep) {
        return;
      }

      sharedState.step = steps[stepIndex + 1];

      methods.canSubmit();
    },

    goToStep(step: IStep) {
      if (!step) {
        return;
      }

      sharedState.step = step;
    },

    /**
     * ? Goes recursively through the *CONTEXT.MODEL to *GET the value of the given path
     *
     * @param path - Model to get
     * @param index - Index of the array if necessary
     * @returns The value of the given model
     */
    getDynamicModel(path: string, index?: number) {
      if (!path) {
        return null;
      }

      return methods
        .splittedPath(path, index)
        ?.reduce(
          (model: any, key: string) => model?.[key] ?? null,
          context.model
        );
    },

    /**
     * ? Goes recursively through the *CONTEXT.MODEL to *SET the value of the given path
     * * Clears every *DEPENDANCIES linked to the model if necessary
     *
     * @param path - Model to get
     * @param value - Value to update the model with
     * @param index - Index of the array if necessary
     */
    setDynamicModel(path: string, value: any, index?: number) {
      if (!path) {
        return;
      }
      const mappedPath = methods.splittedPath(path, index);
      const lastKey = mappedPath?.pop() as string;

      let model = context.model;
      mappedPath?.forEach((key) => (model = model?.[key]));

      model[lastKey] = value;

      // ? Clear field dependancies if condition is no longer filled
      const dependances = context.fields?.filter((field) => {
        if (!field.options && !field.conditions) {
          return false;
        }
        const { options, conditions } = field;

        if (conditions?.some((c) => c.model === path)) {
          return true;
        }

        return options?.some((opt) => {
          if (typeof opt === 'string' || !opt.conditions) {
            return false;
          }
          const { conditions } = opt;

          return conditions?.some(({ model }) => model === path);
        });
      });

      dependances?.forEach((dependance) => {
        const { model } = dependance;
        const resetModel = () => (context.model[model] = null);

        const target = context.model[model];
        if (!target) {
          return null;
        }

        const availableOptions = methods.filterAvailableOptions(dependance);
        if (!availableOptions) {
          resetModel();
        }

        const isSelectedAvailable =
          (
            availableOptions?.filter((opt) => {
              if (typeof opt === 'string') {
                return false;
              }
              return opt.value === target;
            }) || []
          )?.length >= 1;

        if (!isSelectedAvailable) {
          resetModel();
        }
      });
    },

    /**
     * ? Handle the *TOUCH of a field
     * @param field - Basic IField
     * @param value - Value to update the field model with
     */
    handleInput(field: IField, value: any) {
      field.touched = true;
      context.emit('event:fieldTouched', field);
      methods.setDynamicModel(field.model, value);
    },

    /**
     * ? Returns a filtered array of available options from a given field
     *
     * @param field - A basic IField
     * @returns Available options of the given field
     */
    filterAvailableOptions(field: IField) {
      if (!field) {
        return null;
      }

      const { options } = field;
      if (!options) {
        return null;
      }

      const filtered = options?.filter((opt) => {
        if (typeof opt === 'string' || !opt.conditions) {
          return true;
        }
        const { conditions } = opt;

        return conditions?.every(({ model, value }) => {
          return methods.compareAndExists(model, value);
        });
      });

      return filtered;
    },

    /**
     * ? Finds the first errored field and *SMOOTHLY scrolls it *INTOVIEW
     */
    scrollToFirstError() {
      const firstError = context.fields.find((f) => f.error);

      if (firstError) {
        // TODO use refs instead
        const el = document.getElementById('field_' + firstError.ref);

        if (!el) {
          return;
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },

    /**
     * ? Goes throught every *CONTEXT.FIELDS and determines if they are errored
     * @param origin - Origin of the function call (only submit for now)
     */
    checkErrors(origin?: string) {
      context.fields = context.fields?.map((f: IField) => {
        const fromSubmit = origin === 'submit';
        const isTouched = f.touched;
        // const isErrored = f.error
        const isRequired = f.required;

        // const isDeep = f.model.match(/\./g)?.length > 1
        const hasVal = tools.methods.exists(
          methods.getDynamicModel(f.model, Number(f.model.match(/\d/)))
        );

        if ([''].includes(f.model)) {
          console.log({
            fromSubmit,
            isTouched,
            isRequired,
            hasVal,
            val: methods.getDynamicModel(f.model, Number(f.model.match(/\d/))),
          });
        }

        if (isTouched || fromSubmit) {
          f.error = !!(isRequired && !hasVal);
        }

        return f;
      });

      methods.canSubmit();
    },

    /**
     * ? Check the value of every *DISPLAYEDFIELDS
     * @returns A boolean
     */
    canSubmit() {
      const fields = displayedFields?.value;

      const allow = fields?.every((f) => {
        if (f.required) {
          const val = methods.getDynamicModel(f.model);
          return tools.methods.exists(val);
        }

        return true;
      });

      sharedState.allowSubmit = allow;
      return allow;
    },

    /**
     * ? Handle the actions following a *CTA click
     * @returns A boolean confirming the submit
     */
    submit() {
      const canSubmit = methods.canSubmit();
      const { isLastStep } = stepInfos?.value;

      if (!canSubmit) {
        methods.checkErrors('submit');
        methods.scrollToFirstError();
        return false;
      }

      if (!isLastStep) {
        methods.goToNextStep();
        return false;
      }

      context.emit('event:formSubmitted', canSubmit);

      if (canSubmit) {
        return true;
      }
    },
  };

  // ? Emits an event when the global model gets updated
  watch(
    () => context.model,
    () => {
      if (context.model) {
        methods.checkErrors();
        context.emit('event:modelUpdated', context.model);
      }
    },
    { deep: true }
  );

  // ? Emits an event when the *SHAREDSTEP changes
  watch(
    () => sharedState.step,
    (current) => {
      // TODO Detect the next step with atleatst 1 displayedFields and go to it
      if (displayedFields?.value?.length <= 0) {
        methods.goToNextStep();
      }

      methods.checkErrors();
      context.emit('event:stepChange', current);
    }
  );

  return {
    sharedState,
    displayedFields,
    mappedSteps,
    stepInfos,
    methods,
  };
};
