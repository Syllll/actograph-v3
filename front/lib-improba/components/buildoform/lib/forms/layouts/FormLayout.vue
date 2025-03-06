<style>
</style>

<template>
  <!-- <slot name="field" v-bind="{ ...props }"> -->
  <div class="row items-center">
    <slot name="label" v-bind="{ ...props }">
      <label>
        {{ props.title }}
      </label>
    </slot>

    <q-icon class="q-ml-xs" v-if="props.infophrase" :name="props.infophraseIcon">
      <slot name="tooltip" v-bind="{ ...props }">
        <q-tooltip>
          <div v-html="props.infophrase" />
        </q-tooltip>
      </slot>
    </q-icon>

    <div class="col-12">
      <slot />
    </div>
  </div>
  <!-- </slot> -->
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';

export default defineComponent({
  props: {
    // <!-- ? use title instead of label in case the <slot> uses label for whatever reason -->
    title: {
      type: String
    },
    disabled: {
      type: Boolean,
    },
    infophrase: {
      type: String,
    },
    infophraseIcon: {
      type: String,
      default: 'mdi-help-circle'
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {

    const stateless = {
    };

    const state = reactive({
    });

    const methods = {
    };

    const computedState = {
    };


    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {
      // do something
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
