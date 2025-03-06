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
import { i18n, setLang } from '@boot/i18n';

export default defineComponent({
  setup() {
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
        const locale = i18n.locale;
        state.lang = <string>locale;
      },
      setLang(value: string) {
        setLang(value);
      },
    };

    onMounted(() => {
      methods.init();
    });

    watch(
      () => state.lang,
      (val, prevg) => {
        methods.setLang(<string>val);
      }
    );

    return {
      i18n,
      state,
      stateless,
    };
  },
});
</script>
