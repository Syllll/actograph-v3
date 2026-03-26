<template>
  <div class="welcome-hero column items-center">
    <div class="text-center q-mb-lg">
      <div class="text-h4 text-weight-bold text-primary q-mb-xs">
        Bienvenue sur ActoGraph
      </div>
      <div class="text-body1 text-grey-7">
        Créez ou chargez une chronique pour commencer votre observation
      </div>
    </div>

    <div class="row q-gutter-md justify-center q-mb-md">
      <div
        class="action-card column items-center q-pa-lg cursor-pointer"
        v-ripple
        @click="$emit('create')"
      >
        <q-icon name="mdi-plus-circle-outline" size="40px" color="accent" class="q-mb-sm" />
        <div class="text-subtitle1 text-weight-bold">Nouvelle chronique</div>
        <div class="text-caption text-grey-6">Créer une chronique vierge</div>
      </div>

      <div
        class="action-card column items-center q-pa-lg cursor-pointer"
        v-ripple
        @click="$emit('import')"
      >
        <q-icon name="mdi-file-import-outline" size="40px" color="accent" class="q-mb-sm" />
        <div class="text-subtitle1 text-weight-bold">Importer</div>
        <div class="text-caption text-grey-6">Depuis un fichier .jchronic</div>
      </div>

      <div
        class="action-card column items-center q-pa-lg cursor-pointer"
        v-ripple
        @click="$emit('cloud')"
      >
        <q-icon
          :name="isCloudAuthenticated ? 'mdi-cloud-sync-outline' : 'mdi-cloud-upload-outline'"
          size="40px"
          :color="isCloudAuthenticated ? 'positive' : 'accent'"
          class="q-mb-sm"
        />
        <div class="text-subtitle1 text-weight-bold">Cloud</div>
        <div class="text-caption text-grey-6">
          {{ isCloudAuthenticated ? 'Synchroniser vos chroniques' : 'Se connecter au cloud' }}
        </div>
      </div>
    </div>

    <q-btn
      flat
      no-caps
      color="primary"
      class="text-body2"
      @click="$emit('load-example')"
    >
      <q-icon name="mdi-play-circle-outline" size="xs" class="q-mr-xs" />
      Découvrir avec l'exemple intégré
    </q-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'WelcomeHero',
  props: {
    isCloudAuthenticated: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['create', 'import', 'cloud', 'load-example'],
});
</script>

<style lang="scss" scoped>
.welcome-hero {
  padding: 2rem 1rem;
}

.action-card {
  width: 180px;
  border-radius: 0.75rem;
  border: 1px solid $grey-4;
  background: white;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}
</style>
