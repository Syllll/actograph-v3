<template>
  <div v-if="isStudentAccess" class="student-watermark" aria-hidden="true">
    {{ $t('licenseUi.studentWatermark') }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useLicense } from 'src/composables/use-license';

export default defineComponent({
  name: 'StudentWatermark',
  setup() {
    const { isStudentAccess } = useLicense();

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
  color: rgba(0, 0, 0, 0.14);

  .body--dark & {
    color: rgba(255, 255, 255, 0.14);
  }
  transform: rotate(-24deg);
  user-select: none;
  white-space: nowrap;
}
</style>
