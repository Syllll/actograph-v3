<template>
  <div>
    <DSelect
      class="q-pa-none"
      v-model="state.lang"
      :options="stateless.languages"
      map-options
      emit-value
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { locale } = useI18n();
    
    const stateless = {
      languages: [
        {
          label: 'Français',
          value: 'fr',
        },
        {
          label: 'English',
          value: 'en-US',
        },
      ],
    };

    const state = reactive({
      lang: null as string | null,
    });

    const methods = {
      init() {
        state.lang = locale.value as string;
      },
      setLang(value: string) {
        locale.value = value;
      },
    };

    onMounted(() => {
      methods.init();
    });

    watch(
      () => state.lang,
      (val, prevg) => {
        if (val) {
          methods.setLang(val);
        }
      }
    );

    return {
      state,
      stateless,
    };
  },
});
</script>
