<template>
  <DChip class="full-height" style="min-width: 15rem">
    <div class="full-width text-center">
      <strong> Accès Professionel </strong>
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
  background-color: $lineColor; /* Yellow base color for warning */
  background-image: repeating-linear-gradient(
    45deg,
    $lineColor,
    $lineColor 10px,
    $backgroundColor 10px,
    $backgroundColor 20px
  );
  background-size: 100% 100%;
  background-position: center;
  background-repeat: repeat;
  opacity: 0.8;
  color: black;
  font-weight: bold;
}
</style>
