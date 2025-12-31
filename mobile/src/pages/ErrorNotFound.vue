<template>
  <DPage>
    <div class="flex flex-center fit">
      <div class="text-center">
        <div class="text-h2 text-grey-8 q-mb-md">404</div>
        <div class="text-h5 text-grey-6 q-mb-lg">Page non trouvée</div>
        <q-btn
          color="primary"
          label="Retour à l'accueil"
          @click="$router.push({ name: 'home' })"
        />
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { DPage } from '@components';

export default defineComponent({
  name: 'ErrorNotFound',
  components: {
    DPage,
  },
});
</script>

