<template>
  <DChip class="full-height">
    <div class="full-width text-center">
      <strong>{{ $t('licenseUi.accessProfessional') }}</strong>
    </div>
  </DChip>
</template>

<script lang="ts">
import { defineComponent, computed, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

export default defineComponent({
  setup(props) {
    const quasar = useQuasar();
    const router = useRouter();

    const stateless = {
      quasar,
    };

    const computedState = reactive({
      enable: computed(() => {
        // const currentRoleStr = currentRole();
        return true;
      }),
    });

    const methods = {};

    return {
      stateless,
      computedState,
      methods,
      screen: quasar.screen,
    };
  },
});
</script>

<style lang="scss" scoped>
$lineColor: var(--danger-low);
$backgroundColor: white;

.q-chip {
  color: black;
  font-weight: bold;
  background-color: var(--accent);
  padding-top: 0;
  padding-bottom: 0;
  min-height: 1.6em;
}
</style>
