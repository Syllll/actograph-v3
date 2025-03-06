<template>
  <q-form ref="formRef">
    <Transition
      enter-active-class="animated bounceInLeft"
      leave-active-class="animated bounceOutRight"
      appear
    >
      <DBanner
        class="q-mb-md"
        v-if="props.errorInForm && props.errorInForm !== ''"
        :label="props.errorInForm"
      >
      </DBanner>
    </Transition>
    <slot></slot>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';

export default defineComponent({
  props: {
    errorInForm: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    const formRef: Ref<any> = ref(null);

    return {
      props,
      formRef,
    };
  },
});
</script>
