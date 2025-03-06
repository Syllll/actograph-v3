<template>
  <q-form ref="formRef">
    <Transition
      enter-active-class="animated bounceInLeft"
      leave-active-class="animated bounceOutRight"
      appear
    >
      <PBBanner
        class="q-mb-md"
        v-if="props.errorInForm && props.errorInForm !== ''"
        :label="props.errorInForm"
      >
      </PBBanner>
    </Transition>
    <slot></slot>
  </q-form>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';
import PBBanner from '../banners/PBBanner.vue';

export default defineComponent({
  components: {
    PBBanner,
  },
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
