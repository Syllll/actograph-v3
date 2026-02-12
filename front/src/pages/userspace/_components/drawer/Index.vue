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
              icon="mdi-file-import"
              tooltip="Importer une chronique"
              label="Importer depuis un fichier"
              @click="methods.importObservation"
            />
          </div>
        </div>

        <div class="q-mt-sm"><q-separator /></div>

        <!-- Menu -->
        <q-list>
          <!-- Accueil -->
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
            >
              <q-item-section avatar>
                <q-icon :name="menuItem.icon" />
              </q-item-section>
              <q-item-section>
                {{ menuItem.label }}
              </q-item-section>
            </q-item>
            <q-separator :key="'sep' + index" v-if="menuItem.separator" />
          </template>

          <!-- Chronique active avec sous-menus -->
          <template v-if="observation.sharedState.currentObservation">
            <q-expansion-item
              :default-opened="true"
            >
              <template v-slot:header>
                <q-item-section avatar>
                  <q-icon name="mdi-book-open-variant" />
                </q-item-section>
                <q-item-section>
                  <div class="row items-center">
                    <q-tooltip>
                      {{ observation.sharedState.currentObservation.name }}
                    </q-tooltip>
                    <span 
                      class="text-truncate" 
                      style="max-width: 200px"
                    >
                      {{ computedState.chronicleDisplayName.value ?? '' }}
                    </span>
                  </div>
                </q-item-section>
              </template>

              <!-- Sous-menus -->
              <q-list>
                <template
                  v-for="(subMenuItem, subIndex) in computedState.chronicleSubMenu.value"
                  :key="subIndex"
                >
                  <q-item
                    clickable
                    :active="subMenuItem.isActive()"
                    v-ripple
                    @click="() => {
                      const isDisabled = subMenuItem.disabled ? subMenuItem.disabled(observation) : false;
                      if (isDisabled) {
                        const tooltip = subMenuItem.tooltip ? subMenuItem.tooltip(observation) : '';
                        if (tooltip) {
                          if (subMenuItem.label === 'Graphe') {
                            notifications.methods.showGraphWarning();
                          } else if (subMenuItem.label === 'Statistiques') {
                            notifications.methods.showStatsWarning();
                          } else {
                            notifications.methods.warning(tooltip);
                          }
                        }
                      } else {
                        if (subMenuItem.label === 'Exporter la chronique') {
                          methods.exportObservation();
                        } else if (subMenuItem.label === 'Enregistrer sous...') {
                          methods.saveAsObservation();
                        } else if (subMenuItem.action) {
                          subMenuItem.action();
                        }
                      }
                    }"
                    active-class="active"
                    :disable="
                      subMenuItem.disabled ? subMenuItem.disabled(observation) : false
                    "
                    class="q-pl-lg"
                  >
                    <q-item-section avatar>
                      <q-icon :name="subMenuItem.icon" />
                    </q-item-section>
                    <q-item-section>
                      {{ subMenuItem.label }}
                      <q-tooltip v-if="subMenuItem.tooltip && subMenuItem.tooltip(observation)">
                        {{ subMenuItem.tooltip(observation) }}
                      </q-tooltip>
                    </q-item-section>
                  </q-item>
                  <q-separator :key="'sub-sep' + subIndex" v-if="subMenuItem.separator" />
                </template>
              </q-list>
            </q-expansion-item>
          </template>
        </q-list>

        <q-space />
      </div>
    </div>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, nextTick } from 'vue';
import { menu, chronicleSubMenu } from './menu';
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
import { useNotifications } from 'src/composables/use-notifications';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import SaveAsDialog from '@pages/userspace/home/_components/active-chronicle/SaveAsDialog.vue';

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
    const notifications = useNotifications();

    const computedState = {
      menuList: computed(() => menu(router)),
      chronicleSubMenu: computed(() => chronicleSubMenu(router)),
      chronicleDisplayName: computed(() => {
        const name = observation.sharedState.currentObservation?.name;
        if (!name) return '';
        return name.trim();
      }),
      isChronicleActive: computed(() => {
        const routeName = router.currentRoute.value.name;
        return routeName === 'user_protocol' || 
               routeName === 'user_observation' || 
               routeName === 'user_analyse' || 
               routeName === 'user_statistics';
      }),
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

        // Construire les options en incluant videoPath s'il est présent
        const createOptions: {
          name: string;
          description?: string;
          mode: any;
          videoPath?: string;
        } = {
          name: diagRes.name,
          description: diagRes.description,
          mode: diagRes.mode,
        };
        
        // Inclure videoPath s'il est présent dans diagRes
        if (diagRes.videoPath) {
          createOptions.videoPath = diagRes.videoPath;
        }

        try {
          // Créer l'observation (cette méthode charge déjà l'observation complète)
          await observation.methods.createObservation(createOptions);

          // Attendre que Vue ait mis à jour le DOM avec la nouvelle observation
          await nextTick();
          
          // Petit délai supplémentaire pour s'assurer que tout est bien chargé
          await new Promise(resolve => setTimeout(resolve, 100));

          // Rediriger vers la page d'accueil après la création
          await router.push({ name: 'user_home' });
        } catch (error) {
          console.error('Erreur lors de la création de l\'observation:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la création de la chronique',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
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

          // Attendre la propagation des mises à jour (évite affichage incorrect)
          await nextTick();
          await new Promise((resolve) => setTimeout(resolve, 150));

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

      saveAsObservation: async () => {
        const currentObservation = observation.sharedState.currentObservation;

        if (!currentObservation) {
          $q.notify({
            type: 'warning',
            message: 'Aucune chronique chargée',
          });
          return;
        }

        const newName = await createDialog({
          component: SaveAsDialog,
          componentProps: {
            currentName: currentObservation.name,
          },
          persistent: true,
        });

        if (!newName || typeof newName !== 'string') {
          return;
        }

        try {
          const newObservation = await exportService.saveAsObservation(
            currentObservation,
            newName
          );

          await observation.methods.loadObservation(newObservation.id);

          $q.notify({
            type: 'positive',
            message: 'Chronique enregistrée sous un nouveau nom',
            caption: newObservation.name,
          });
        } catch (error) {
          console.error('Erreur lors de l\'enregistrement sous:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'enregistrement',
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
      notifications,
    };
  },
});
</script>

<style scoped lang="scss">
.active {
  color: var(--accent);
}
</style>
