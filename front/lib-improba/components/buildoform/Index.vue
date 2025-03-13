<template>
  <div>
    <slot
      name="header"
      v-bind="{ stepInfos: builder.stepInfos?.value, builder }"
    />

    <!-- ? CURRENT STEP STUFF -->
    <div
      v-if="builder.sharedState.step"
      :class="`${props.styles?.steps.container}`"
    >
      <!-- ? NAME -->
      <h3
        v-if="builder.sharedState.step?.display"
        :class="`${props.styles?.steps.title}`"
      >
        <slot
          :name="builder.sharedState.step.value + '-title'"
          v-bind="{ step: builder.sharedState.step }"
        >
          {{ builder.sharedState.step?.name }}
        </slot>
      </h3>

      <!-- ? DESC -->
      <span
        v-if="
          builder.sharedState.step?.display && builder.sharedState.step?.desc
        "
        :class="`${props.styles?.steps.desc}`"
      >
        <slot
          :name="builder.sharedState.step.value + '-desc'"
          v-bind="{ step: builder.sharedState.step }"
        >
          {{ builder.sharedState.step?.desc }}
        </slot>
      </span>
    </div>

    <div :class="classMapper.methods.mapRowClasses(props.styles?.row)">
      <div
        v-for="(field, fi) in builder.displayedFields.value"
        :key="'field_' + field.name + '_' + fi"
        :id="'field_' + field.ref"
        :class="classMapper.methods.mapBreakpointClasses(field)"
      >
        <component
          :is="field.is"
          v-bind="{
            ...field,
            ...props.styles?.field.directives,
          }"
          :bind="{
            ...field,
            ...props.styles?.field.directives,
          }"
          :class="
            classMapper.methods.mapColClasses(props.styles?.field, {
              errored: field.error,
            })
          "
          :options="builder.methods.filterAvailableOptions(field)"
          :modelValue="builder.methods.getDynamicModel(field.model)"
          @update:modelValue="builder.methods.handleInput(field, $event)"
        >
          <template
            v-for="([slotKey], index) in Object.entries($slots)"
            :key="index"
            v-slot:[slotKey]="scope"
          >
            <slot
              v-if="$slots[slotKey]"
              :name="slotKey"
              v-bind="{ ...scope }"
            ></slot>
          </template>
        </component>
      </div>

      <slot
        name="footer"
        v-bind="{ stepInfos: builder.stepInfos?.value, builder }"
      />

      <slot
        name="actions"
        v-bind="{ stepInfos: builder.stepInfos?.value, builder }"
      >
        <div class="col-12 q-pa-md row justify-center q-gutter-sm">
          <!-- ? pro tip: don't use the :disable directive so you can trigger some stuff through submit() on click -->
          <slot
            name="previous"
            v-bind="{ stepInfos: builder.stepInfos?.value, builder }"
          >
            <q-btn
              v-if="
                !builder.stepInfos?.value?.isFirstStep &&
                builder.stepInfos?.value?.hasStep
              "
              flat
              class="smooth bg-primary-10"
              icon="mdi-chevron-left"
              @click="builder.methods.goToPreviousStep"
            />
          </slot>
          <slot
            name="submit"
            v-bind="{ stepInfos: builder.stepInfos?.value, builder }"
          >
            <q-btn
              flat
              :class="`
                smooth
                bg-primary${
                  builder.sharedState.allowSubmit ? '' : '-10 not-clickable'
                }
              `"
              :icon="
                !builder.stepInfos?.value?.hasStep ||
                builder.stepInfos?.value?.isLastStep
                  ? 'mdi-check'
                  : 'mdi-chevron-right'
              "
              @click="methods.submit"
            />
          </slot>
        </div>
      </slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';

import { useBuilder } from './../../components/buildoform/lib/composables/use-buildoform';
import { useTools } from './../../components/buildoform/lib/composables/use-tools';
import { useClassMapper } from './../../components/buildoform/lib/composables/use-class-mapper';

import { IField } from './../../components/buildoform/lib/interfaces/field.interface';
import { QInput, QSelect, QOptionGroup, QSlider } from 'quasar';

import * as BComp from './lib/forms/index';

export default defineComponent({
  props: {
    // <!-- ? Defines the model to update -->
    modelValue: {
      type: Object,
    },
    // <!-- ? Defines the fields -->
    fields: {
      type: Object,
    },
    // <!-- ? Defines the style -->
    styles: {
      type: Object,
      default: () => {
        steps: ({
          container: '',
          title: '',
          desc: '',
        });
        row: ({});
        field: ({});
      },
    },
  },
  emits: [
    'event:fieldTouched',
    'event:modelUpdated',
    'event:stepChange',
    'event:formSubmitted',
    'update:modelValue',
    'submit',
  ],
  components: {
    QInput,
    QSlider,
    QSelect,
    QOptionGroup,

    ...BComp,
    ...BComp.custom,
    // BSlider,
    // BDatePicker,
    // BOptionGroup
  },
  setup(props, { emit }) {
    const stateless = {};
    const state = reactive({});

    const builder = useBuilder({
      model: props.modelValue,
      fields: props.fields as IField[],
      emit,
    }) as any;
    const tools = useTools() as any;
    const classMapper = useClassMapper() as any;

    const methods = {
      submit() {
        if (builder.methods.submit()) {
          return emit('submit', props.modelValue);
        }
      },
    };

    const computedState = {};

    onMounted(() => {
      // do something
    });

    watch(
      () => props.modelValue,
      (v: any) => {
        emit('update:modelValue', v);
      }
    );

    return {
      props,
      stateless,
      builder,
      tools,
      classMapper,
      state,
      methods,
      computedState,
    };
  },
});
</script>
