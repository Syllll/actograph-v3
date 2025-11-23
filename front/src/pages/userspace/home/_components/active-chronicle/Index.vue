<template>
  <div class="active-chronicle fit column">
    <q-scroll-area class="col">
      <div class="column items-center justify-center fit">
        <!-- Si chronique chargée : afficher les informations -->
        <template v-if="observation.sharedState.currentObservation">
          <!-- Header avec nom de la chronique -->
          <div class="chronicle-header q-pa-md q-mb-md full-width">
            <div class="text-h5 text-weight-bold q-mb-xs text-center text-primary">
              {{ observation.sharedState.currentObservation.name }}
            </div>
            <div v-if="observation.sharedState.currentObservation.description" class="text-body1 text-grey-8 q-mt-xs text-center">
              {{ observation.sharedState.currentObservation.description }}
            </div>
          </div>

          <!-- Informations sur la chronique dans une card -->
          <div class="info-card q-pa-md q-mb-md full-width">
            <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
              Informations
            </div>
            <div class="column q-gutter-sm">
              <div class="row items-center">
                <q-icon name="mdi-calendar" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  Créée le {{ methods.formatDate(observation.sharedState.currentObservation.createdAt) }}
                </span>
              </div>
              <div class="row items-center">
                <q-icon name="mdi-update" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  Modifiée le {{ methods.formatDate(observation.sharedState.currentObservation.updatedAt) }}
                </span>
              </div>
              <div class="row items-center">
                <q-icon name="mdi-database" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  {{ readingsCount }} relevé{{ readingsCount > 1 ? 's' : '' }}
                </span>
              </div>
              <div class="row items-center">
                <q-icon name="mdi-folder-multiple" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  {{ categoriesCount }} catégorie{{ categoriesCount > 1 ? 's' : '' }}
                </span>
              </div>
              <div class="row items-center">
                <q-icon name="mdi-eye" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  {{ observablesCount }} observable{{ observablesCount > 1 ? 's' : '' }}
                </span>
              </div>
              <div v-if="hasReadings" class="row items-center">
                <q-icon name="mdi-clock-outline" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  {{ lastReadingDateText }}
                </span>
              </div>
            </div>
          </div>

          <!-- Boutons d'action principaux -->
          <div class="q-px-md q-mb-md full-width">
            <div class="row q-gutter-sm">
              <!-- Constituer mon Protocole -->
              <q-btn
                label="Constituer mon Protocole"
                @click="methods.navigateToProtocol"
                :class="[
                  'col',
                  'action-btn',
                  { 'primary-action': !hasObservables }
                ]"
                :outline="hasObservables"
                color="primary"
                no-caps
              />

              <!-- Faire mon observation -->
              <q-btn
                label="Faire mon observation"
                @click="methods.navigateToObservation"
                :class="[
                  'col',
                  'action-btn',
                  { 'primary-action': hasObservables && !hasReadings }
                ]"
                :outline="hasObservables && hasReadings"
                color="primary"
                no-caps
                :disable="!hasObservables"
              />

              <!-- Voir mon graph d'activité -->
              <q-btn
                label="Voir mon graph d'activité"
                @click="methods.navigateToGraph"
                :class="[
                  'col',
                  'action-btn',
                  { 'primary-action': hasObservables && hasReadings }
                ]"
                :outline="!(hasObservables && hasReadings)"
                color="primary"
                no-caps
                :disable="!(hasObservables && hasReadings)"
              />
            </div>
          </div>

          <!-- Bouton secondaire -->
          <div class="q-px-md full-width">
            <q-btn
              label="Charger une autre chronique"
              @click="methods.openSelectDialog"
              outline
              color="accent"
              no-caps
              class="full-width"
              flat
            />
          </div>
        </template>

        <!-- Si aucune chronique : afficher les boutons d'action -->
        <template v-else>
          <div class="empty-state q-pa-md q-mb-md text-center full-width">
            <q-icon name="mdi-folder-open-outline" size="64px" class="text-grey-5 q-mb-md" />
            <div class="text-body1 text-grey-7 q-mb-lg">
              Aucune chronique n'est actuellement chargée.
            </div>
            <div class="text-body2 text-grey-6 q-mb-md">
              Créez-en une nouvelle ou importez une chronique existante.
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="q-px-md q-pb-md full-width">
            <div class="column q-gutter-sm">
              <DSubmitBtn
                label="Nouvelle chronique"
                @click="methods.createNewObservation"
              />
              <q-btn
                label="Importer"
                @click="methods.importObservation"
                outline
                color="primary"
                no-caps
                class="full-width"
              />
              <q-btn
                label="Exporter"
                @click="methods.exportObservation"
                outline
                color="primary"
                no-caps
                :disable="!observation.sharedState.currentObservation"
                class="full-width"
              />
            </div>
          </div>
        </template>
      </div>
    </q-scroll-area>

    <!-- Dialog de sélection de chronique -->
    <SelectChronicleDialog
      v-model="state.showSelectDialog"
      @selected="methods.loadSelectedObservation"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, nextTick } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import SelectChronicleDialog from './SelectChronicleDialog.vue';
import CreateObservationDialog from './CreateObservationDialog.vue';
import { DSubmitBtn } from '@lib-improba/components';
import { useQuasar } from 'quasar';
import { ObservationModeEnum } from '@services/observations/interface';
import { useRouter, useRoute } from 'vue-router';
import { ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { exportService } from '@services/observations/export.service';
import { importService } from '@services/observations/import.service';

export default defineComponent({
  name: 'ActiveChronicle',
  components: {
    SelectChronicleDialog,
    CreateObservationDialog,
    DSubmitBtn,
  },
  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const route = useRoute();
    const observation = useObservation();

    const state = reactive({
      showSelectDialog: false,
    });

    const hasObservables = computed(() => {
      return observablesCount.value > 0;
    });

    const hasReadings = computed(() => {
      return observation.readings.sharedState.currentReadings.length > 0;
    });

    const readingsCount = computed(() => {
      return observation.readings.sharedState.currentReadings.length;
    });

    const categoriesCount = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return 0;
      }
      return protocol._items.filter(
        (item: any) => item.type === ProtocolItemTypeEnum.Category
      ).length;
    });

    const observablesCount = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return 0;
      }
      let count = 0;
      // Compter les observables directs
      count += protocol._items.filter(
        (item: any) => item.type === ProtocolItemTypeEnum.Observable
      ).length;
      // Compter les observables dans les enfants des catégories
      protocol._items.forEach((item: any) => {
        if (item.type === ProtocolItemTypeEnum.Category && item.children) {
          count += item.children.filter(
            (child: any) => child.type === ProtocolItemTypeEnum.Observable
          ).length;
        }
      });
      return count;
    });

    const lastReadingDateText = computed(() => {
      const readings = observation.readings.sharedState.currentReadings;
      if (readings.length === 0) {
        return 'Aucun relevé enregistré';
      }
      
      // Trier par date décroissante pour obtenir le dernier
      const sortedReadings = [...readings].sort((a, b) => {
        const dateA = new Date(a.dateTime).getTime();
        const dateB = new Date(b.dateTime).getTime();
        return dateB - dateA;
      });
      
      const lastReading = sortedReadings[0];
      const date = new Date(lastReading.dateTime);
      return `Dernière observation : ${date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    });

    const methods = {
      formatDate: (dateString: string | Date | undefined) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },

      openSelectDialog: () => {
        state.showSelectDialog = true;
      },

      loadSelectedObservation: async (observationId: number) => {
        await observation.methods.loadObservation(observationId);
        state.showSelectDialog = false;
      },

      createNewObservation: async () => {
        const diagRes = await createDialog({
          component: CreateObservationDialog,
          componentProps: {},
          persistent: true,
        });

        if (!diagRes || diagRes === false) {
          return;
        }

        // Attendre que le dialog soit complètement fermé avant de créer l'observation
        // Cela évite les erreurs de démontage (__qtouchpan, unmount)
        // Utiliser nextTick pour s'assurer que Vue a fini de traiter le démontage
        await new Promise(resolve => {
          // Double nextTick + délai pour garantir que tout est nettoyé
          setTimeout(() => {
            resolve(undefined);
          }, 200);
        });

        // Construire les options en incluant videoPath s'il est présent
        const createOptions: {
          name: string;
          description?: string;
          mode: ObservationModeEnum;
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

          // Toujours rediriger vers la page d'accueil après la création
          // Même si on est déjà sur la page d'accueil, cela garantit que le composant
          // se met à jour avec la nouvelle observation chargée
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

      /**
       * Importe une observation depuis un fichier .jchronic ou .chronic
       * 
       * Flux d'exécution :
       * 1. Vérifie que l'API Electron est disponible
       * 2. Ouvre le dialogue de sélection de fichier
       * 3. Appelle le service d'import qui :
       *    - Lit le fichier localement
       *    - Envoie le fichier au backend
       *    - Le backend parse, normalise et crée l'observation
       * 4. Recharge l'observation complète dans l'application
       * 5. Affiche une notification de succès
       * 
       * Note : Le backend gère toute la logique d'import :
       * - Détection du format (.jchronic vs .chronic)
       * - Parsing et validation du JSON
       * - Normalisation des données
       * - Création de l'observation avec protocole et readings
       * - Génération des nouveaux IDs
       */
      importObservation: async () => {
        // VÉRIFICATION : L'API Electron doit être disponible pour lire le fichier
        if (!window.api || !window.api.showOpenDialog || !window.api.readFile) {
          $q.notify({
            type: 'negative',
            message: 'L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron.',
          });
          return;
        }

        try {
          // ÉTAPE 1 : Ouvrir le dialogue de sélection de fichier
          // L'utilisateur peut sélectionner un fichier .jchronic ou .chronic
          const dialogResult = await window.api.showOpenDialog({
            filters: [
              { name: 'Fichiers Chronique', extensions: ['jchronic', 'chronic'] },
              { name: 'Tous les fichiers', extensions: ['*'] },
            ],
          });

          // Si l'utilisateur a annulé, ne rien faire
          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
            return; // Utilisateur a annulé
          }

          const filePath = dialogResult.filePaths[0];

          // ÉTAPE 2 : Importer l'observation depuis le fichier (via le backend)
          // Le service gère :
          // - La lecture du fichier localement
          // - L'envoi au backend pour traitement
          // Le backend fait tout le reste : parsing, normalisation, création
          const newObservation = await importService.importFromFile(filePath);

          // ÉTAPE 3 : Recharger l'observation complète dans l'application
          // Cela permet d'afficher immédiatement l'observation importée
          // avec toutes ses relations (protocol, readings)
          await observation.methods.loadObservation(newObservation.id);

          // ÉTAPE 4 : Afficher une notification de succès
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
       * Flux d'exécution :
       * 1. Vérifie qu'une observation est chargée
       * 2. Vérifie que l'observation a un ID
       * 3. Appelle le service d'export qui :
       *    - Appelle l'API backend pour récupérer les données formatées
       *    - Ouvre le dialogue de sauvegarde dans Documents
       *    - Sauvegarde le fichier .jchronic
       * 4. Affiche une notification de succès avec le chemin du fichier
       * 
       * Note : Si l'utilisateur annule le dialogue de sauvegarde,
       * le service retourne null et aucune notification n'est affichée
       */
      exportObservation: async () => {
        const currentObservation = observation.sharedState.currentObservation;
        
        // Vérification 1 : Une observation doit être chargée
        if (!currentObservation) {
          $q.notify({
            type: 'warning',
            message: 'Aucune chronique chargée à exporter',
          });
          return;
        }

        // Vérification 2 : L'observation doit avoir un ID pour l'export
        // L'ID est nécessaire pour appeler l'API backend
        if (!currentObservation.id) {
          $q.notify({
            type: 'negative',
            message: 'Impossible d\'exporter : ID de l\'observation manquant',
          });
          return;
        }

        try {
          // Appel du service d'export
          // Le service gère :
          // - L'appel API backend (qui récupère toutes les données nécessaires)
          // - Le dialogue de sauvegarde Electron
          // - L'écriture du fichier
          // Le backend charge automatiquement protocol et readings, pas besoin de les passer
          const filePath = await exportService.exportObservation(currentObservation);

          // Si filePath est défini, l'export a réussi
          // Afficher une notification avec le chemin du fichier pour confirmation
          if (filePath) {
            $q.notify({
              type: 'positive',
              message: 'Chronique exportée avec succès',
              caption: filePath, // Afficher le chemin complet du fichier
            });
          }
          // Si filePath est null, l'utilisateur a annulé le dialogue
          // Pas besoin de notification dans ce cas (comportement attendu)
        } catch (error) {
          // Gestion des erreurs : afficher une notification d'erreur avec le message
          console.error('Erreur lors de l\'export:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'export de la chronique',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      },

      navigateToProtocol: () => {
        router.push({ name: 'user_protocol' });
      },

      navigateToObservation: () => {
        router.push({ name: 'user_observation' });
      },

      navigateToGraph: () => {
        router.push({ name: 'user_analyse' });
      },
    };

    return {
      observation,
      state,
      hasObservables,
      hasReadings,
      readingsCount,
      categoriesCount,
      observablesCount,
      lastReadingDateText,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.active-chronicle {
  .chronicle-header {
    background: linear-gradient(135deg, rgba(31, 41, 55, 0.08) 0%, rgba(31, 41, 55, 0.05) 100%);
    border-left: 4px solid var(--primary);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .info-card {
    background: linear-gradient(135deg, rgba(31, 41, 55, 0.08) 0%, rgba(31, 41, 55, 0.05) 100%);
    border-left: 4px solid var(--primary);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .empty-state {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .action-btn {
    transition: all 0.3s ease;
    
    &.primary-action {
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    &:not(.primary-action) {
      opacity: 0.7;
      
      &:hover {
        opacity: 1;
      }
    }
  }
}
</style>

