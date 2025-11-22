<template>
  <q-drawer
    v-model="drawer.sharedState.showDrawer"
    show-if-above
    :width="250"
    :breakpoint="500"
    elevated
    bordered
    behavior="desktop"
    :class="$q.dark.isActive ? 'bg-secondary' : 'bg-secondary'"
  >
    <div class="fit">
      <div class="fit column q-col-gutter-md">
        <div class="q-mt-md">
          <!--
          <q-separator />
          -->
        </div>

        <!-- tools in a row -->
        <div class="column q-mx-md">
          <!--
            <div class="text-h4 text-weight-bold text-center q-mb-md">Outils</div>
          -->
          <div class="row justify-center q-gutter-sm">
            <d-action-btn
              icon="mdi-new-box"
              tooltip="Créer une chronique"
              label="Nouvelle chronique"
              @click="methods.startObservation"
            />
            <d-action-btn
              icon="mdi-new-box"
              tooltip="Importer une chronique"
              label="Importer"
              @click="methods.importObservation"
            />
            <d-action-btn
              icon="mdi-new-box"
              tooltip="Exporter une chronique"
              label="Exporter"
              :disabled="!observation.sharedState.currentObservation"
              @click="methods.exportObservation"
            />
          </div>
        </div>

        <div class="q-mt-sm"><q-separator /></div>

        <!-- Menu -->
        <q-list>
          <template
            v-for="(menuItem, index) in computedState.menuList.value"
            :key="index"
          >
            <q-item
              clickable
              :active="menuItem.isActive()"
              v-ripple
              @click="menuItem.action()"
              active-class="active"
              :disable="
                menuItem.disabled ? menuItem.disabled(observation) : false
              "
            >
              <q-item-section avatar>
                <q-icon :name="menuItem.icon" />
              </q-item-section>
              <q-item-section>
                {{ menuItem.label }}
                <q-tooltip v-if="menuItem.tooltip && menuItem.tooltip(observation)">
                  {{ menuItem.tooltip(observation) }}
                </q-tooltip>
              </q-item-section>
            </q-item>
            <q-separator :key="'sep' + index" v-if="menuItem.separator" />
          </template>

          
        </q-list>

        <q-space />
        
          <div><q-separator /></div>

          <!-- Current observation card -->
        <DCard class="q-mx-sm q-ml-md" bgColor="primary">
        <div class="column text-text-invert">
          <div class="text-h4 text-weight-bold text-center q-mb-md">
            Votre chronique
          </div>
          <div class="text-center">
            {{
              observation.sharedState.currentObservation?.name ??
              "Aucune chronique n'est chargée"
            }}
          </div>

          <div
            v-if="observation.sharedState.currentObservation?.name && observation.readings.sharedState.currentReadings"
            class="row q-mt-sm"
          >
            Relevés : {{ observation.readings.sharedState.currentReadings.length }}
          </div>
        </div>
      </DCard>
        
      </div>
    </div>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { menu } from './menu';
import { useDrawer } from './use-drawer';
import { useRouter } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useAuth } from '@lib-improba/composables/use-auth';
import { userMenuItems } from '@lib-improba/components/layouts/standard/user-menu-items';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import ThemeToggler from '@lib-improba/components/layouts/theme-toggler/ThemeToggler.vue';
import CreateObservationDialog from '@pages/userspace/home/_components/active-chronicle/CreateObservationDialog.vue';
import { exportService } from '@services/observations/export.service';
import { importService } from '@services/observations/import.service';

export default defineComponent({
  props: {
    showDrawer: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:showDrawer'],
  components: {
    ThemeToggler,
  },
  setup(props) {
    const drawer = useDrawer();
    const router = useRouter();
    const state = reactive({});
    const observation = useObservation();
    const auth = useAuth(router);
    const i18n = useI18n();
    const $q = useQuasar();

    const computedState = {
      menuList: computed(() => menu(router)),
      userName: computed(() => {
        const user = auth.sharedState?.user;
        let userName =
          user?.firstname ?? user?.userJwt?.username ?? '-';

        // Remove the username prefix if it exists
        if (userName.startsWith('_pc-')) {
          userName = userName.slice(4);
        }

        return userName;
      }),
      userMenuItems: computed(() => userMenuItems(i18n, auth)),
    }

    const methods = {
      startObservation: async () => {
        // Open a dialog for the user to name its observation
        const diagRes = await createDialog({
          component: CreateObservationDialog,
          componentProps: {},
          persistent: true,
        });

        if (!diagRes || diagRes === false) {
          return;
        }

        await observation.methods.createObservation({
          name: diagRes.name,
          description: diagRes.description,
          mode: diagRes.mode,
        });
      },

      importObservation: async () => {
        // Vérifier que l'API Electron est disponible
        if (!window.api || !window.api.showOpenDialog || !window.api.readFile) {
          $q.notify({
            type: 'negative',
            message: 'L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron.',
          });
          return;
        }

        try {
          // Ouvrir le dialogue de sélection de fichier
          const dialogResult = await window.api.showOpenDialog({
            filters: [
              { name: 'Fichiers Chronique', extensions: ['jchronic', 'chronic'] },
              { name: 'Tous les fichiers', extensions: ['*'] },
            ],
          });

          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
            return; // Utilisateur a annulé
          }

          const filePath = dialogResult.filePaths[0];

          // Importer l'observation depuis le fichier (via le backend)
          const newObservation = await importService.importFromFile(filePath);

          // Recharger l'observation complète
          await observation.methods.loadObservation(newObservation.id);

          $q.notify({
            type: 'positive',
            message: 'Chronique importée avec succès',
            caption: newObservation.name,
          });
        } catch (error: any) {
          // Gestion des erreurs : afficher une notification d'erreur avec le message
          // Les erreurs Axios contiennent le message du backend dans error.response.data.message
          console.error('Erreur lors de l\'import:', error);
          
          // Extraire le message d'erreur du backend si disponible
          const errorMessage = 
            error?.response?.data?.message || 
            error?.message || 
            'Erreur inconnue lors de l\'import';
          
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'import de la chronique',
            caption: errorMessage,
          });
        }
      },

      /**
       * Exporte l'observation actuellement chargée au format .jchronic
       * 
       * Même logique que dans Index.vue - voir les commentaires détaillés là-bas
       * Le service d'export gère tout : appel API backend, dialogue de sauvegarde, écriture fichier
       */
      exportObservation: async () => {
        const currentObservation = observation.sharedState.currentObservation;
        
        if (!currentObservation) {
          $q.notify({
            type: 'warning',
            message: 'Aucune chronique chargée à exporter',
          });
          return;
        }

        if (!currentObservation.id) {
          $q.notify({
            type: 'negative',
            message: 'Impossible d\'exporter : ID de l\'observation manquant',
          });
          return;
        }

        try {
          // Le service d'export gère tout le processus :
          // 1. Appel API backend pour récupérer les données (sans IDs)
          // 2. Ouverture du dialogue de sauvegarde dans Documents
          // 3. Écriture du fichier .jchronic
          const filePath = await exportService.exportObservation(currentObservation);

          if (filePath) {
            $q.notify({
              type: 'positive',
              message: 'Chronique exportée avec succès',
              caption: filePath,
            });
          }
          // Si filePath est null, l'utilisateur a annulé, pas besoin de notification
        } catch (error) {
          console.error('Erreur lors de l\'export:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'export de la chronique',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      },
    };

    return {
      methods,
      state,
      computedState,
      drawer,
      observation,
      auth,
    };
  },
});
</script>

<style scoped lang="scss">
.active {
  color: var(--accent);
}
</style>
