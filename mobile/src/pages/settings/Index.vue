<template>
  <DPage :padding="true">
    <q-list>
      <!-- App info -->
      <q-item-label header>Application</q-item-label>

      <q-item>
        <q-item-section avatar>
          <q-icon name="mdi-information" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Version</q-item-label>
          <q-item-label caption>{{ state.appVersion }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-separator spaced />

      <!-- Affichage -->
      <q-item-label header>Affichage</q-item-label>

      <q-item>
        <q-item-section avatar>
          <q-icon name="mdi-resize" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Taille de l'interface</q-item-label>
          <q-item-label caption>
            Ajuste la taille globale des catégories et observables sur cet appareil
          </q-item-label>
          <q-slider
            v-model="state.scaleModel"
            :min="uiScale.min"
            :max="uiScale.max"
            :step="uiScale.step"
            color="primary"
            class="q-mt-md"
            :label-value="Math.round(state.scaleModel * 100) + '%'"
            @change="methods.onScaleChange"
          />
          <div class="row items-center justify-between q-mt-xs">
            <q-btn flat dense label="Compact" color="grey-7" size="sm" @click="methods.setScale(uiScale.min)" />
            <q-btn flat dense label="Standard" color="grey-7" size="sm" @click="methods.setScale(1)" />
            <q-btn flat dense label="Grand" color="grey-7" size="sm" @click="methods.setScale(uiScale.max)" />
          </div>
        </q-item-section>
      </q-item>

      <q-separator spaced />

      <!-- Data management -->
      <q-item-label header>Données</q-item-label>

      <q-item>
        <q-item-section avatar>
          <q-icon name="mdi-database" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Chroniques locales</q-item-label>
          <q-item-label caption>
            {{ state.chronicleCount }} chronique(s) enregistrée(s)
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item clickable @click="methods.confirmClearData">
        <q-item-section avatar>
          <q-icon name="mdi-delete" color="negative" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-negative">Supprimer toutes les données</q-item-label>
          <q-item-label caption>
            Supprime toutes les chroniques et observations
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-separator spaced />

      <!-- About -->
      <q-item-label header>À propos</q-item-label>

      <q-item>
        <q-item-section avatar>
          <q-icon name="mdi-copyright" color="grey" />
        </q-item-section>
        <q-item-section>
          <q-item-label>ActoGraph Mobile</q-item-label>
          <q-item-label caption>
            © 2025 SymAlgo Technologies
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Confirm dialog -->
    <q-dialog v-model="state.showConfirmDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-alert" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">Confirmation</span>
        </q-card-section>

        <q-card-section>
          Êtes-vous sûr de vouloir supprimer toutes les données ?
          <br />
          <strong>Cette action est irréversible.</strong>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            flat
            label="Supprimer"
            color="negative"
            @click="methods.clearAllData"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useChronicle } from '@composables/use-chronicle';
import { useUiScale } from '@composables/use-ui-scale';
import { observationService } from '@services/observation.service';
import { sqliteService } from '@database/sqlite.service';
import { DPage } from '@components';

export default defineComponent({
  name: 'SettingsPage',
  components: {
    DPage,
  },
  setup() {
    const $q = useQuasar();
    const chronicle = useChronicle();
    const uiScale = useUiScale();

    const state = reactive({
      appVersion: process.env.APP_VERSION || '0.0.1',
      chronicleCount: 0,
      showConfirmDialog: false,
      // Modèle lié au slider (copie locale de uiScale.state.scale pour édition fluide).
      scaleModel: uiScale.state.scale,
    });

    const methods = {
      loadStats: async () => {
        try {
          const chronicles = await observationService.getAll();
          state.chronicleCount = chronicles.length;
        } catch (error) {
          console.error('Failed to load stats:', error);
        }
      },

      onScaleChange: async (value: number | null) => {
        if (value == null || isNaN(value)) return;
        await uiScale.setScale(value);
      },

      setScale: async (value: number) => {
        state.scaleModel = value;
        await uiScale.setScale(value);
      },

      confirmClearData: () => {
        state.showConfirmDialog = true;
      },

      clearAllData: async () => {
        try {
          // Clear all tables
          await sqliteService.clearAllData();

          // Unload current chronicle
          chronicle.methods.unloadChronicle();

          // Reload stats
          await methods.loadStats();

          state.showConfirmDialog = false;

          $q.notify({
            type: 'positive',
            message: 'Toutes les données ont été supprimées',
          });
        } catch (error) {
          console.error('Failed to clear data:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la suppression des données',
          });
        }
      },
    };

    onMounted(async () => {
      methods.loadStats();
      await uiScale.load();
      state.scaleModel = uiScale.state.scale;
    });

    return {
      state,
      methods,
      uiScale,
    };
  },
});
</script>

