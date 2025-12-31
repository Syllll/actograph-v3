<template>
  <DSubmitBtn @click="methods.selectFile" dense size="0.8rem" no-caps flat>
    <q-input
      ref="fileInputRef"
      style="display: none"
      v-model="state.file"
      type="file"
      color="primary"
    ></q-input>
    <DTooltip v-if="props.tooltip && props.tooltip !== ''">{{
      props.tooltip
    }}</DTooltip>
  </DSubmitBtn>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch } from 'vue';

import { useI18n } from 'vue-i18n';

import DBtn from './DBtn.vue';

export default defineComponent({
  props: {
    file: {
      type: Object,
      default: null,
    },
    tooltip: {
      type: String,
      required: false,
    },
  },
  components: {},
  emits: ['fileSelected'],
  setup(props, context) {
    const { t } = useI18n();
    const fileInputRef = ref(null);

    const state = reactive({
      file: null as any,
    });

    const methods = {
      selectFile() {
        if (!fileInputRef.value) {
          return;
        }

        state.file = null;
        (<any>fileInputRef.value).$el.click();
      },
    };

    watch(
      () => state.file,
      () => {
        if (state.file && state.file[0]) {
          context.emit('fileSelected', state.file[0]);
        }
      }
    );

    return {
      i18n: { t },
      props,
      emit: context.emit,
      state,
      fileInputRef,
      methods,
    };
  },
});
</script>
