<template>
  <div :class="`row full-width ${props.outlined ? 'my-field' : ''}`">
    <div
      v-if="props.label && props.labelPosition === 'left'"
      :class="`q-mr-sm ${props.labelColClass}`"
      :style="`
        max-height: 40px;
        ${ props.labelMinWidth ? 'min-width: ' + props.labelMinWidth : ''}
      `"
    >
      <slot name="label">
        <PBFormInputLabel
          :label="props.label"
          :tooltip="props.labelTooltip"
          :bold="props.labelBold"
        />
      </slot>
    </div>
    <div class="col column full-width">
      <div class="col-auto row" v-if="props.label && props.labelPosition === 'top'">
        <slot name="inner-label" :props="$props">
          <PBFormInputLabel class="col-auto"
            :textRight="false"
            :label="label || ''"
            :tooltip="props.labelTooltip"
            :bold="props.labelBold"
          />
        </slot>
      </div>
      <div class="row full-width">
        <div class="col">
          <slot>
            <template
              v-if="props.type === 'options' || props.type === 'select'"
            >
              <PBSelect
                :minWidth="props.minWidth"
                :outlined="props.outlined"
                :hint="props.hint ? props.hint : undefined"
                emit-value
                map-options
                :readonly="props.readonly || props.editIcon"
                :disable="props.disable"
                :modelValue="props.modelValue"
                @update:model-value="emit('update:modelValue', $event)"
                :options="props.options"
              />
            </template>
            <template v-else-if="props.type === 'boolean'">
              <PBToggle
                :hint="props.hint ? props.hint : undefined"
                color="pb-editor-primary"
                :modelValue="props.modelValue"
                @update:model-value="emit('update:modelValue', $event)"
              />
            </template>
            <PBInput
              v-else
              :type="props.type === 'array' ? 'text' : props.type"
              :rows="props.rows"
              :rules="props.rules"
              :hint="props.hint ? props.hint : undefined"
              :placeholder="props.placeholder"
              :hide-bottom-space="props.hideBottomSpace"
              dense
              :readonly="props.readonly || props.editIcon"
              :disable="props.disable"
              :outlined="props.outlined"
              :debounce="props.debounce"
              :modelValue="
                props.type === 'array'
                  ? JSON.stringify(props.modelValue)
                  : props.modelValue
              "
              @update:model-value="methods.emitValue"
            >
              <template v-slot:prepend>
                <slot name="input-prepend"> </slot>
              </template>
              <template v-slot:append>
                <PBBtn
                  v-if="props.editIcon && !props.readonly"
                  icon="edit"
                  dense
                  round
                  @click="props.editFunction"
                />
                <slot name="input-append"> </slot>
              </template>
              <PBTooltip v-if="props.tooltip">
                {{ props.tooltip }}
              </PBTooltip>
            </PBInput>
          </slot>
        </div>
        <div class="col-auto row items-center">
          <slot name="append"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType } from 'vue';

import PBFormInputLabel from './PBFormInputLabel.vue';
import PBInput from './PBInput.vue';
import PBBtn from '../buttons/PBBtn.vue';
import PBTooltip from '../tooltips/PBTooltip.vue';
import PBSelect from '../select/PBSelect.vue';
import PBToggle from '../toggles/PBToggle.vue';
import { onMounted } from 'vue';

export default defineComponent({
  components: {
    PBFormInputLabel,
    PBInput,
    PBBtn,
    PBTooltip,
    PBSelect,
    PBToggle,
  },
  props: {
    options: {
      type: Array,
      default: null,
    },
    tooltip: {
      type: String,
      default: null,
    },
    labelColClass: {
      type: String,
      default: 'col-2',
    },
    labelBold: {
      type: Boolean,
      default: true,
    },
    hint: {
      type: String,
      default: null,
    },
    hideBottomSpace: {
      type: Boolean,
      default: true,
    },
    labelTooltip: {
      type: String,
      default: null,
    },
    rules: {
      type: Array,
      required: false,
    },
    label: {
      type: String,
      required: false,
      default: undefined,
    },
    labelPosition: {
      type: String as PropType<'left' | 'top'>,
      default: 'top',
      description: 'Position of the label relatively to the input',
    },
    placeholder: {
      type: String,
      required: false,
    },
    labelMinWidth: {
      type: String,
      required: false,
    },
    modelValue: {
      required: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    outlined: {
      type: Boolean,
      default: true,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    editIcon: {
      type: Boolean,
      default: false,
    },
    editFunction: {
      type: Function as PropType<() => void>,
      default: () => {},
    },
    debounce: {
      type: Number,
      default: 300,
    },
    type: {
      // text: text input
      // textarea: textarea input
      // Number: to choose number
      // array: represents an array as string, technical view
      // boolean: switch button
      // options: select view
      // select: ?
      type: String as PropType<
        | 'text'
        | 'textarea'
        | 'number'
        | 'array'
        | 'boolean'
        | 'options'
        | 'select'
        | undefined
      >,
      default: undefined,
    },
    rows: {
      type: Number,
      default: undefined,
    },
    minWidth: {
      type: String,
      default: undefined,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const methods = {
      emitValue($event: any) {
        if (props.type === 'number') {
          const value =
            typeof $event !== 'number' ? parseFloat($event) : $event;
          if (!isNaN(value)) {
            emit('update:modelValue', value);
          }
        } else if (props.type === 'array') {
          emit('update:modelValue', JSON.parse($event));
        } else {
          emit('update:modelValue', $event);
        }
      },
    };

    return {
      emit,
      props,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
// .my-field {
//   .q-field {
//   }
// }
</style>
