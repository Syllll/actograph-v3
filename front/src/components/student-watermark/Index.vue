<template>
  <div v-if="isStudentAccess" class="student-watermark" aria-hidden="true">
    {{ $t('licenseUi.studentWatermark') }}
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useLicense } from 'src/composables/use-license';

export default defineComponent({
  name: 'StudentWatermark',
  setup() {
    const license = useLicense();

    const isStudentAccess = computed(
      () => license.sharedState.license === null && license.sharedState.type === 'student',
    );

    return {
      isStudentAccess,
    };
  },
});
</script>

<style scoped lang="scss">
.student-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
  font-size: clamp(2rem, 8vw, 4.5rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.08);
  transform: rotate(-24deg);
  user-select: none;
  white-space: nowrap;
}
</style>
