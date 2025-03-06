<template>
  <div :class="`row full-width ${props.outlined ? 'my-field' : ''}`">
    <div
      v-if="props.label && props.labelPosition === 'left'"
      :class="`q-mr-sm ${props.labelColClass}`"
      :style="`max-height: 40px; ${
        props.labelMinWidth ? 'min-width: ' + props.labelMinWidth : ''
      }`"
    >
      <slot name="label">
        <DFormInputLabel
          :label="label"
          :tooltip="props.labelTooltip"
          :bold="props.labelBold"
        />
      </slot>
    </div>
    <div class="col column full-width">
      <div class="col-auto" v-if="props.label && props.labelPosition === 'top'">
        <slot name="inner-label">
          <DFormInputLabel
            :textRight="false"
            :label="label"
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
              <DSelect
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
                :clearable="props.clearable"
                :rules="props.rules"
              />
            </template>
            <template v-else-if="props.type === 'boolean'">
              <DToggle
                :hint="props.hint ? props.hint : undefined"
                :modelValue="props.modelValue"
                @update:model-value="emit('update:modelValue', $event)"
              />
            </template>
            <DInput
              v-else
              :type="props.type === 'array' ? 'text' : props.type"
              :rows="props.rows"
              :rules="props.rules"
              :hint="props.hint ? props.hint : undefined"
              :placeholder="props.placeholder"
              :hide-bottom-space="props.hideBottomSpace"
              class="text-text"
              color="text"
              dense
              :readonly="props.readonly || props.editIcon"
              :disable="props.disable"
              :outlined="props.outlined"
              :rounded="props.rounded"
              :debounce="props.debounce"
              :modelValue="
                props.type === 'select'
                  ? null
                  : props.type === 'array'
                  ? JSON.stringify(props.modelValue)
                  : props.modelValue
              "
              @update:model-value="methods.emitValue"
            >
              <template v-slot:prepend>
                <slot name="input-prepend"> </slot>
              </template>
              <template v-slot:append>
                <DBtn
                  v-if="props.editIcon && !props.readonly"
                  icon="edit"
                  dense
                  round
                  @click="props.editFunction"
                />
                <slot name="input-append"> </slot>
              </template>
              <DTooltip v-if="props.tooltip">
                {{ props.tooltip }}
              </DTooltip>
            </DInput>
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

import DFormInputLabel from './DFormInputLabel.vue';

export default defineComponent({
  components: {
    DFormInputLabel,
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
      default: 'left',
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
      default: false,
    },
    rounded: {
      type: Boolean,
      default: false,
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
    clearable: {
      type: Boolean,
      required: false,
      description: 'Add a clear button to the select input',
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
.my-field {
  .q-field {
    &:deep() {
      .q-field--outlined,
      .q-field--readonly,
      .q-field__control:before {
        border-style: solid;
      }
    }
  }
}
</style>
