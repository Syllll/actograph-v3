<template>
  <div class="welcome-hero column items-center">
    <div class="text-center q-mb-lg">
      <div class="text-h4 text-weight-bold text-primary q-mb-xs">
        {{ $t('chronicle.welcomeTitle') }}
      </div>
      <div class="text-body1 text-grey-7">
        {{ $t('chronicle.welcomeTagline') }}
      </div>
    </div>

    <div class="row q-gutter-md justify-center q-mb-md">
      <div
        class="action-card column items-center q-pa-lg cursor-pointer"
        v-ripple
        @click="$emit('create')"
      >
        <q-icon name="mdi-plus-circle-outline" size="40px" color="accent" class="q-mb-sm" />
        <div class="text-subtitle1 text-weight-bold">
          {{ $t('chronicle.newChronicle') }}
        </div>
        <div class="text-caption text-grey-6">
          {{ $t('chronicle.newChronicleBlank') }}
        </div>
      </div>

      <div
        class="action-card column items-center q-pa-lg cursor-pointer"
        v-ripple
        @click="$emit('import')"
      >
        <q-icon name="mdi-file-import-outline" size="40px" color="accent" class="q-mb-sm" />
        <div class="text-subtitle1 text-weight-bold">
          {{ $t('chronicle.importShort') }}
        </div>
        <div class="text-caption text-grey-6">
          {{ $t('chronicle.importFromJchronic') }}
        </div>
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
        <div class="text-subtitle1 text-weight-bold">
          {{ $t('chronicle.cloudCardTitle') }}
        </div>
        <div class="text-caption text-grey-6">
          {{
            isCloudAuthenticated
              ? $t('chronicle.cloudSyncCaption')
              : $t('chronicle.cloudLoginCaption')
          }}
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
      {{ $t('chronicle.loadExample') }}
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
  @media (max-width: 600px) {
    width: 100%;
    max-width: 280px;
  }
  border-radius: 0.75rem;
  border: 1px solid $grey-4;
 // Fond adapté au thème (clair/sombre) au lieu d'un blanc fixe, qui rendait
  // le texte illisible en thème sombre (retour bêta-test, "noir sur noir").
  background: var(--secondary);
  color: var(--text);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}
</style>
