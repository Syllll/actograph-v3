<template>
  <FormLayout>
    <q-input v-bind="computedState.vbind.value" v-model="state.modelValue">

      <!-- <template v-slot:[props.iconPosition]> -->
      <template v-slot:prepend v-if="props.iconPosition === 'prepend'">
        <q-icon :name="props.icon" class="clickable">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-date v-model="state.modelValue" :color="props.color" mask="YYYY-MM-DD">
              <div class="row items-center justify-end">
                <q-btn v-close-popup :label="props.closeLabel" :color="props.color" flat />
              </div>
            </q-date>
          </q-popup-proxy>
        </q-icon>
      </template>

      <template v-slot:append v-if="props.iconPosition === 'append'">
        <q-icon :name="props.icon" class="clickable">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-date v-model="state.modelValue" :color="props.color" mask="YYYY-MM-DD">
              <div class="row items-center justify-end">
                <q-btn v-close-popup :label="props.closeLabel" :color="props.color" flat />
              </div>
            </q-date>
          </q-popup-proxy>
        </q-icon>
      </template>
    </q-input>
  </FormLayout>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';

import { FormLayout } from './layouts/index'
import { computed } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      required: true
    },
    mask: {
      type: String,
      default: 'DD-MM-YYYY'
    },
    color: {
      type: String,
      default: 'primary'
    },
    closeLabel: {
      type: String,
      default: 'Fermer'
    },
    icon: {
      type: String,
      default: 'mdi-calendar'
    },
    iconPosition: {
      type: String,
      default: 'prepend',
      validator: (v: string) => ['prepend', 'append'].includes(v)
    },
    bind: {
      type: Object
    }
  },
  emits: ['update:modelValue'],
  components: {
    FormLayout
  },
  setup(props, { emit }) {

    const stateless = {
    };

    const state = reactive({
      modelValue: props.modelValue
    });

    const methods = {
    };

    const computedState = {
      vbind: computed(() => props.bind)
    };


    watch(
      () => state.modelValue,
      (v: any) => {
        emit('update:modelValue', v)
      }
    );

    onMounted(() => {
    });

    return {
      props,
      stateless,
      state,
      methods,
      computedState
    };
  },
});
</script>
