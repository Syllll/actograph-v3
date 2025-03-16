<template>
    <DChip class="full-height student" style="min-width: 15rem;">
      <div class="full-width text-center">
        <strong>
          Accès Professionel
        </strong>
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

    const methods = {
    };

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
.student {
  &:deep() {
    .q-chip {
      // Add oblique and red lines in the background of the q-chip to simulate a broken license
      // The lines should be oblique and red
      background-image: linear-gradient(to bottom right, red, transparent);
      background-size: 100% 100%;
      background-position: center;
      background-repeat: no-repeat;
      background-blend-mode: color-burn;
    } 
  }
}
</style>
