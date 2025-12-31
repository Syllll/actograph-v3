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

    const state = reactive({
      appVersion: process.env.APP_VERSION || '0.0.1',
      chronicleCount: 0,
      showConfirmDialog: false,
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

    onMounted(() => {
      methods.loadStats();
    });

    return {
      state,
      methods,
    };
  },
});
</script>

