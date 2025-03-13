<template>
  <div class="q-mx-xl q-my-lg">
    <h1 class="bg-primary-hover text-italic-hover smooth width-fit">
      Build'O'Form
    </h1>

    <build-o-form
      v-model="state.results"
      :fields="stateless.fields"
      :styles="{
        steps: stateless.stepStyle,
        row: stateless.rowStyle,
        field: stateless.fieldStyle,
      }"
      @event:field-touched="(e: any) => methods.handleEvent('fieldTouched', e)"
      @event:model-updated="(e: any) => methods.handleEvent('modelUpdated', e)"
      @event:form-submitted="(e: any) => methods.handleEvent('formSubmitted', e)"
      @event:step-change="(e: any) => methods.handleEvent('stepChange', e)"
      @submit="methods.submit"
    >
      <template v-slot:header="{ stepInfos, builder }">
        <q-btn
          v-for="(step, si) in stepInfos.steps"
          :key="'step_btn_' + si"
          dense
          @click="builder.methods.goToStep(step)"
        >
          {{ step.name }}
        </q-btn>
      </template>

      <template v-slot:field="scope">
        <div class="row items-center">
          <label>
            {{ scope.title }}
          </label>

          <q-icon
            class="q-ml-xs"
            v-if="scope.infophrase"
            :name="scope.infophraseIcon"
          >
            <q-tooltip>
              <div v-html="scope.infophrase" />
            </q-tooltip>
          </q-icon>
        </div>

        <slot />
      </template>
    </build-o-form>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';

// import { IField } from './../../components/buildoform/lib/interfaces/field.interface';
// import { IFieldStyle, IRowStyle } from './../../components/buildoform/lib/interfaces/style.interface';
import {
  IField,
  IStep,
} from './../../components/buildoform/lib/interfaces/field.interface';
import {
  IFieldStyle,
  IRowStyle,
  IStepStyle,
} from './../../components/buildoform/lib/interfaces/style.interface';

import BuildOForm from '@lib-improba/components/buildoform/Index.vue';
import { useQuasar } from 'quasar';

export default defineComponent({
  props: {},
  emits: [],
  components: {
    BuildOForm,
  },
  setup(props, ctx) {
    const $q = useQuasar();

    const state = reactive({
      results: {},
    });

    const stateless = {
      stepStyle: {
        container: 'q-ml-md',
        title: 'q-mb-none',
        desc: '',
      } as IStepStyle,

      rowStyle: {
        orientation: 'column',

        items: 'start',
        justify: 'center',

        colGutter: 'sm',
      } as IRowStyle,

      fieldStyle: {
        directives: {
          color: 'primary',
          outlined: true,
        },

        static: 'q-pa-sm q-ma-sm smooth-slow',

        bg: {
          // base: 'secondary-100',

          // focus: 'accent-100',
          // hover: 'primary-90',

          errored: 'danger-50',
          erroredHover: 'danger-70',
        },
        shadow: {
          // base: 'secondary-dense',
          // hover: 'primary'
        },
        rounded: {
          base: 'default',
          hover: 'slighter',
        },
      } as IFieldStyle,

      fields: [
        // ENERGY
        {
          is: 'QInput',
          ref: 'energy',
          step: {
            name: 'First base',
            value: 'firstbase',
            desc: 'bip boup',
            display: true,
          },
          cols: {
            base: 12,
            md: 4,
            sm: 6,
          },

          model: 'energy',
          // required: true,

          label: 'La forme ?',
          placeholder: "c'est la patate",
        },

        // READY
        {
          is: 'QuizOptions',
          ref: 'ready',
          step: {
            name: 'First base',
            value: 'firstbase',
            desc: 'bip boup',
            display: true,
          },
          cols: {
            base: 12,
            md: 4,
            sm: 6,
          },

          model: 'ready',
          required: true,

          label: "Est ce que c'est bon pour vous ?",

          options: [
            {
              label: 'Pas du tout',
              value: 0,
            },
            {
              label: 'Un peu',
              value: 1,
            },
            {
              label: 'Imotep',
              value: 2,
            },
          ],
        },

        // HUNGRY
        {
          is: 'QuizOptions',
          ref: 'hungry',
          step: 'firstbase',
          cols: {
            base: 12,
            md: 4,
            sm: 6,
          },

          conditions: [{ model: 'ready', value: 'not:0' }],

          model: 'infos',
          required: true,

          label: 'Vous avez faim ?',

          options: [
            {
              label: 'Pas du tout',
              value: 0,
              conditions: [{ model: 'ready', value: 'not:2' }],
            },
            {
              label: 'Un peu',
              value: 1,
            },
            {
              label: 'Beaucoup',
              value: 2,
            },
          ],
        },

        // LEMONS
        {
          is: 'QuizOptions',
          ref: 'lemons',
          step: {
            name: 'More infos',
            value: 'infos',
            desc: 'moaaar',
            display: true,
          },
          cols: {
            base: 12,
            md: 4,
            sm: 6,
          },

          model: 'lemons',
          required: true,

          label: 'Quand la vie vous donne des citrons, combien y en a-t-il ? ',

          options: [
            {
              label: 'Pas du tout',
              value: 0,
            },
            {
              label: 'Un peu',
              value: 1,
            },
            {
              label: 'Beaucoup',
              value: 2,
            },
          ],
        },

        // WATER
        {
          is: 'QuizOptions',
          ref: 'water',
          step: 'infos',
          cols: {
            base: 12,
            md: 4,
            sm: 6,
          },

          conditions: [{ model: 'ready', value: 'not:0' }],

          model: 'water',
          required: true,

          label: "Vous avez buvez de l'eau ?",

          options: [
            {
              label: 'Pas du tout',
              value: 0,
            },
            {
              label: 'Un peu',
              value: 1,
            },
            {
              label: 'Beaucoup',
              value: 2,
            },
          ],
        },
      ] as IField[],
    };

    const methods = {
      submit(event: any) {
        console.log({ results: state.results, event });
        $q.notify({
          type: 'positive',
          message: 'Yippee',
        });
      },
      handleEvent(type: string, event: any) {
        // console.log({ type, event })
      },
      log(args: any) {
        console.log({ args });
      },
    };

    const computedState = {};

    onMounted(() => {
      $q.dark.set(false);
    });

    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    return {
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
