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

    <div class="action-cards q-mb-md">
      <div
        class="action-card cursor-pointer"
        v-ripple
        @click="$emit('create')"
      >
        <q-icon name="mdi-plus-circle-outline" size="40px" color="accent" class="action-card__icon" />
        <div class="action-card__title text-subtitle1 text-weight-bold">
          {{ $t('chronicle.newChronicle') }}
        </div>
        <div class="action-card__caption text-caption text-grey-6">
          {{ $t('chronicle.newChronicleBlank') }}
        </div>
      </div>

      <div
        class="action-card cursor-pointer"
        v-ripple
        @click="$emit('import')"
      >
        <q-icon name="mdi-file-import-outline" size="40px" color="accent" class="action-card__icon" />
        <div class="action-card__title text-subtitle1 text-weight-bold">
          {{ $t('chronicle.importShort') }}
        </div>
        <div class="action-card__caption text-caption text-grey-6">
          {{ $t('chronicle.importFromJchronic') }}
        </div>
      </div>

      <div
        class="action-card cursor-pointer"
        v-ripple
        @click="$emit('cloud')"
      >
        <q-icon
          :name="isCloudAuthenticated ? 'mdi-cloud-sync-outline' : 'mdi-cloud-upload-outline'"
          size="40px"
          :color="isCloudAuthenticated ? 'positive' : 'accent'"
          class="action-card__icon"
        />
        <div class="action-card__title text-subtitle1 text-weight-bold">
          {{ $t('chronicle.cloudCardTitle') }}
        </div>
        <div class="action-card__caption text-caption text-grey-6">
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

.action-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 1rem;
  width: 100%;
  max-width: 40.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    max-width: 280px;
  }
}

.action-card {
  display: grid;
  grid-template-rows: 40px 3.5rem 2.5rem;
  justify-items: center;
  align-items: start;
  row-gap: 0.5rem;
  text-align: center;
  min-width: 0;
  box-sizing: border-box;
  padding: 1.5rem 1rem;
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

.action-card__icon {
  width: 40px;
  height: 40px;
}

// Fixed row heights: wrapped FR titles/captions stay on the same
// horizontal lines as the one-line cards (Importer / Cloud).
.action-card__title {
  width: 100%;
  margin: 0;
  line-height: 1.75rem;
}

.action-card__caption {
  width: 100%;
  margin: 0;
  line-height: 1.25rem;
}

/* Captions : .text-grey-6 est un gris Quasar fixe, illisible sur var(--secondary) en sombre */
.body--dark .action-card .text-grey-6 {
  color: rgba(255, 255, 255, 0.7) !important;
}
</style>
