<template>
  <div 
    class="graph-customization-side-container column fit"
    :class="{ 'is-compact': isCompactMode, 'is-minimized': isMinimized }"
  >
    <!-- Header -->
    <div class="drawer-header row items-center q-pa-sm q-mb-xs">
      <div 
        v-if="!isMinimized"
        class="text-h6 text-weight-medium"
        :class="{ 'text-caption': isCompactMode }"
      >
        <span v-if="!isCompactMode">Personnalisation du graphe</span>
        <span v-else class="text-weight-bold">Graphe</span>
      </div>
      <q-space />
    </div>

    <q-separator v-if="!isMinimized" class="q-mb-xs" />

    <!-- Content -->
    <DScrollArea 
      v-if="!isMinimized"
      class="col drawer-content" 
      :class="{ 'has-horizontal-scroll': isCompactMode }"
      style="min-height: 0;"
    >
      <div 
        v-if="protocol?.sharedState?.currentProtocol?._items && Array.isArray(protocol.sharedState.currentProtocol._items)" 
        class="drawer-content-inner"
        :class="{ 'compact-layout': isCompactMode }"
        :style="{ minWidth: `${MIN_CONTENT_WIDTH}px` }"
      >
        <template v-for="(category, index) in protocol.sharedState.currentProtocol._items" :key="category.id">
          <!-- Séparateur avant la catégorie (sauf pour la première) -->
          <q-separator v-if="index > 0" class="q-my-md" />
          
          <!-- Conteneur de catégorie avec ses observables -->
          <div class="category-container">
            <!-- Ligne Catégorie -->
            <div class="category-row row items-center q-col-gutter-sm q-py-sm q-px-xs">
              <!-- Nom de la catégorie -->
              <div 
                class="col-auto category-name text-weight-medium"
                :class="isCompactMode ? 'text-caption' : 'text-body2'"
                :style="isCompactMode ? { minWidth: '80px', maxWidth: '120px' } : { minWidth: '120px' }"
              >
                {{ category.name }}
              </div>

              <!-- Mode d'affichage (désactivé pour les catégories discrètes) -->
              <div 
                class="col-auto"
                :style="isCompactMode ? { minWidth: '100px' } : { minWidth: '120px' }"
              >
                <q-select
                  :model-value="category.graphPreferences?.displayMode || DisplayModeEnum.Normal"
                  :options="methods.getDisplayModeOptionsForCategory(category)"
                  option-label="label"
                  option-value="value"
                  dense
                  outlined
                  emit-value
                  map-options
                  :disable="category.action === ProtocolItemActionEnum.Discrete"
                  @update:model-value="(val) => methods.updateCategoryPreference(category.id, { displayMode: val })"
                >
                  <q-tooltip v-if="category.action === ProtocolItemActionEnum.Discrete">
                    Les catégories discrètes ne peuvent être qu'en mode Normal
                  </q-tooltip>
                </q-select>
              </div>

              <!-- Couleur -->
              <div class="col-auto" style="min-width: 32px;">
                <div
                  class="color-preview-compact"
                  :style="{
                    backgroundColor: category.graphPreferences?.color || '#10b981',
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                  }"
                  @click="methods.openColorPicker('category', category.id, category.graphPreferences?.color)"
                />
              </div>

              <!-- Épaisseur -->
              <div 
                class="col-auto"
                :style="isCompactMode ? { minWidth: '80px' } : { minWidth: '90px' }"
              >
                <q-slider
                  :model-value="category.graphPreferences?.strokeWidth ?? 2"
                  :min="1"
                  :max="10"
                  :step="1"
                  dense
                  :label-value="`${category.graphPreferences?.strokeWidth ?? 2}px`"
                  @update:model-value="(val) => methods.updateCategoryPreference(category.id, { strokeWidth: val ?? undefined })"
                />
              </div>

              <!-- Motif (disponible pour Background et Frieze) -->
              <div 
                class="col-auto"
                :style="isCompactMode ? { minWidth: '120px' } : { minWidth: '140px' }"
              >
                <q-select
                  :model-value="category.graphPreferences?.backgroundPattern || 'solid'"
                  :options="patternOptions"
                  option-label="label"
                  option-value="value"
                  dense
                  outlined
                  emit-value
                  map-options
                  :disable="category.graphPreferences?.displayMode === DisplayModeEnum.Normal"
                  @update:model-value="(val) => methods.updateCategoryPreference(category.id, { backgroundPattern: val })"
                />
              </div>

              <!-- Support (uniquement pour Background) -->
              <div 
                v-if="category.graphPreferences?.displayMode === DisplayModeEnum.Background"
                class="col-auto"
                :style="isCompactMode ? { minWidth: '120px' } : { minWidth: '140px' }"
              >
                <q-select
                  :model-value="category.graphPreferences?.supportCategoryId ?? null"
                  :options="methods.getSupportOptions(category.id)"
                  option-label="label"
                  option-value="value"
                  dense
                  outlined
                  emit-value
                  map-options
                  @update:model-value="(val) => methods.updateCategoryPreference(category.id, { supportCategoryId: val === '' ? null : val })"
                />
              </div>
            </div>

            <!-- Conteneur des observables -->
            <div class="observables-container">
              <!-- Lignes Observables -->
              <div
                v-for="observable in category.children"
                :key="observable.id"
                class="observable-row row items-center q-col-gutter-sm q-py-sm q-px-xs"
              >
                <!-- Nom de l'observable avec indicateur visuel -->
                <div 
                  class="col-auto row items-center q-gutter-xs"
                  :style="isCompactMode ? { minWidth: '80px', maxWidth: '100px' } : { minWidth: '100px' }"
                >
                  <div 
                    class="text-caption"
                    :class="isCompactMode ? 'text-caption' : 'text-body2'"
                  >
                    {{ observable.name }}
                  </div>
                </div>

                <!-- Mode d'affichage (espace réservé) -->
                <div 
                  class="col-auto"
                  :style="isCompactMode ? { minWidth: '100px' } : { minWidth: '120px' }"
                >
                  <!-- Les observables héritent du mode de leur catégorie -->
                </div>

                <!-- Couleur -->
                <div class="col-auto" style="min-width: 32px;">
                  <div
                    class="color-preview-compact"
                    :style="{
                      backgroundColor: methods.getObservableColor(observable.id, category.id) || '#10b981',
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '1px solid rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                    }"
                    @click="methods.openColorPicker('observable', observable.id, methods.getObservableColor(observable.id, category.id))"
                  />
                </div>

                <!-- Épaisseur -->
                <div 
                  class="col-auto"
                  :style="isCompactMode ? { minWidth: '80px' } : { minWidth: '90px' }"
                >
                  <q-slider
                    :model-value="methods.getObservableStrokeWidth(observable.id, category.id) ?? 2"
                    :min="1"
                    :max="10"
                    :step="1"
                    dense
                    :label-value="`${methods.getObservableStrokeWidth(observable.id, category.id) ?? 2}px`"
                    @update:model-value="(val) => methods.updateObservablePreference(observable.id, { strokeWidth: val ?? undefined })"
                  />
                </div>

                <!-- Motif (disponible pour Background et Frieze) -->
                <div 
                  class="col-auto"
                  :style="isCompactMode ? { minWidth: '120px' } : { minWidth: '140px' }"
                >
                  <q-select
                    :model-value="methods.getObservablePattern(observable.id, category.id) || 'solid'"
                    :options="patternOptions"
                    option-label="label"
                    option-value="value"
                    dense
                    outlined
                    emit-value
                    map-options
                    :disable="category.graphPreferences?.displayMode === DisplayModeEnum.Normal"
                    @update:model-value="(val) => methods.updateObservablePreference(observable.id, { backgroundPattern: val })"
                  />
                </div>

                <!-- Support (espace réservé pour Background uniquement) -->
                <div 
                  v-if="category.graphPreferences?.displayMode === DisplayModeEnum.Background"
                  class="col-auto"
                  :style="isCompactMode ? { minWidth: '120px' } : { minWidth: '140px' }"
                >
                  <!-- Les observables n'ont pas de support -->
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-else class="q-pa-md text-center text-grey-7">
        <q-icon name="info" size="2rem" color="grey-7" class="q-mb-sm" />
        <div class="text-subtitle1 q-mt-sm">Aucun protocole chargé</div>
        <div class="text-caption q-mt-xs">
          Veuillez sélectionner une observation pour afficher son protocole.
        </div>
      </div>
    </DScrollArea>

    <!-- Dialog de sélection de couleur -->
    <q-dialog v-model="state.showColorDialog" @hide="methods.onColorDialogHide">
      <DCard
        class="q-dialog-plugin"
        style="min-width: 350px; min-height: 700px; max-height: 85vh; display: flex; flex-direction: column;"
        bgColor="background"
        innerHeader
        title="Choisir une couleur"
      >
        <DCardSection style="flex: 1; min-height: 550px; overflow: auto; display: flex; flex-direction: column;">
          <q-color
            v-model="state.selectedColor"
            format-model="hex"
            no-header-tabs
            style="flex: 1;"
          />
        </DCardSection>

        <DCardSection>
          <div class="row items-center justify-center full-width q-gutter-md">
            <DCancelBtn @click="methods.cancelColor" />
            <DSubmitBtn label="Valider" @click="methods.confirmColor" />
          </div>
        </DCardSection>
      </DCard>
    </q-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useGraphCustomization } from './use-graph-customization';
import { useProtocol } from 'src/composables/use-observation/use-protocol';
import { useObservation } from 'src/composables/use-observation';
import { IGraphPreferences, BackgroundPatternEnum, DisplayModeEnum } from '@services/observations/interface';
import { getObservableGraphPreferences } from '@services/observations/protocol-graph-preferences.utils';
import { protocolService, ProtocolItemActionEnum, ProtocolItem } from '@services/observations/protocol.service';
import { useQuasar } from 'quasar';
import { useGraph } from '../graph/use-graph';
import { DScrollArea, DCard, DCardSection, DCancelBtn, DSubmitBtn } from '@lib-improba/components';

const COMPACT_MODE_THRESHOLD = 400; // Largeur en pixels pour activer le mode compact
const MIN_CONTENT_WIDTH = 700; // Largeur minimale du contenu pour le scroll horizontal
const DRAWER_MIN_WIDTH_PX = 100; // Largeur minimale du drawer en pixels (bloque le drag à cette taille)

export default defineComponent({
  name: 'GraphCustomizationDrawer',
  components: {
    DScrollArea,
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
  props: {
    drawerWidth: {
      type: Number,
      default: 400,
    },
  },
  setup(props) {
    const customization = useGraphCustomization();
    const observation = useObservation();
    const protocol = useProtocol({
      sharedStateFromObservation: observation.sharedState,
    });
    const graph = useGraph(); // Récupère l'instance PixiApp partagée
    const $q = useQuasar();

    const state = reactive({
      saveTimeout: null as ReturnType<typeof setTimeout> | null,
      showColorDialog: false,
      selectedColor: '#10b981',
      currentColorPicker: {
        type: '' as '' | 'category' | 'observable',
        id: '',
      },
    });

    const patternOptions = [
      { label: 'Aucun motif', value: BackgroundPatternEnum.Solid },
      { label: 'Lignes horizontales', value: BackgroundPatternEnum.Horizontal },
      { label: 'Lignes verticales', value: BackgroundPatternEnum.Vertical },
      { label: 'Diagonales', value: BackgroundPatternEnum.Diagonal },
      { label: 'Grille', value: BackgroundPatternEnum.Grid },
      { label: 'Pointillés', value: BackgroundPatternEnum.Dots },
    ];

    const displayModeOptions = [
      { label: 'Normal', value: DisplayModeEnum.Normal },
      { label: 'Arrière-plan', value: DisplayModeEnum.Background },
      { label: 'Frise', value: DisplayModeEnum.Frieze },
    ];

    // Mode compact activé quand la largeur est inférieure au seuil
    const isCompactMode = computed(() => {
      return props.drawerWidth < COMPACT_MODE_THRESHOLD;
    });

    // Mode minimisé : drawer réduit à 100px minimum
    const isMinimized = computed(() => {
      return !customization.sharedState.showDrawer || props.drawerWidth <= DRAWER_MIN_WIDTH_PX + 5; // +5 pour la tolérance
    });

    // Nettoyer le timeout lors du démontage
    onUnmounted(() => {
      if (state.saveTimeout) {
        clearTimeout(state.saveTimeout);
        state.saveTimeout = null;
      }
    });

    // Charger le protocole si nécessaire (de manière asynchrone)
    const loadProtocolIfNeeded = async () => {
      if (observation.sharedState.currentObservation && !protocol.sharedState.currentProtocol) {
        try {
          await protocol.methods.loadProtocol(observation.sharedState.currentObservation);
        } catch (error) {
          console.error('Failed to load protocol:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du chargement du protocole',
          });
        }
      }
    };

    // Charger au montage
    onMounted(() => {
      loadProtocolIfNeeded();
    });

    // Charger si l'observation change
    watch(
      () => observation.sharedState.currentObservation,
      () => {
        loadProtocolIfNeeded();
      },
      { immediate: false }
    );

    const methods = {
      /**
       * Vérifie si un observable hérite des préférences de sa catégorie
       */
      isInheriting: (observableId: string, categoryId: string): boolean => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol) return false;

        // Trouver l'observable
        const category = currentProtocol._items?.find((c) => c.id === categoryId);
        if (!category?.children) return false;

        const observable = category.children.find((o) => o.id === observableId);
        if (!observable) return false;

        // Si l'observable n'a pas de préférences, il hérite
        return !observable.graphPreferences;
      },

      /**
       * Récupère la couleur d'un observable avec héritage
       */
      getObservableColor: (observableId: string, categoryId: string): string | undefined => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol) return undefined;

        const prefs = getObservableGraphPreferences(observableId, currentProtocol);
        return prefs?.color;
      },

      /**
       * Récupère l'épaisseur d'un observable avec héritage
       */
      getObservableStrokeWidth: (observableId: string, categoryId: string): number | undefined => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol) return undefined;

        const prefs = getObservableGraphPreferences(observableId, currentProtocol);
        return prefs?.strokeWidth;
      },

      /**
       * Récupère le motif d'un observable avec héritage
       */
      getObservablePattern: (observableId: string, categoryId: string): string | undefined => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol) return undefined;

        const prefs = getObservableGraphPreferences(observableId, currentProtocol);
        return prefs?.backgroundPattern;
      },

      /**
       * Ouvre le sélecteur de couleur
       */
      openColorPicker: (type: 'category' | 'observable', id: string, currentColor?: string) => {
        state.currentColorPicker = { type, id };
        state.selectedColor = currentColor || '#10b981';
        state.showColorDialog = true;
      },

      /**
       * Confirme la sélection de couleur
       */
      confirmColor: () => {
        const { type, id } = state.currentColorPicker;
        const preference: Partial<IGraphPreferences> = {
          color: state.selectedColor,
        };

        if (type === 'category') {
          methods.updateCategoryPreference(id, preference);
        } else {
          methods.updateObservablePreference(id, preference);
        }

        state.showColorDialog = false;
      },

      /**
       * Annule la sélection de couleur
       */
      cancelColor: () => {
        state.showColorDialog = false;
      },

      /**
       * Gère la fermeture du dialog de couleur
       */
      onColorDialogHide: () => {
        state.selectedColor = '#10b981';
        state.currentColorPicker = { type: '', id: '' };
      },

      /**
       * Met à jour les préférences d'une catégorie
       */
      updateCategoryPreference: async (
        categoryId: string,
        preference: Partial<IGraphPreferences>
      ) => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol?.id) return;

        // Sauvegarder l'état original pour rollback en cas d'erreur
        const originalProtocol = JSON.parse(JSON.stringify(currentProtocol));

        try {
          // Mettre à jour localement (optimistic update)
          // Créer un nouvel objet pour garantir la réactivité Vue
          const category = currentProtocol._items?.find((c) => c.id === categoryId);
          if (category) {
            category.graphPreferences = {
              ...category.graphPreferences,
              ...preference,
            };
            
            // Forcer la réactivité Vue en créant une nouvelle référence
            protocol.sharedState.currentProtocol = {
              ...currentProtocol,
              _items: currentProtocol._items?.map((item) =>
                item.id === categoryId ? category : item
              ),
            };
          }

          // Attendre que Vue ait fini de mettre à jour les données réactives
          // avant de mettre à jour le pixiApp et de redessiner
          await nextTick();

          // Mettre à jour le protocole dans le pixiApp APRÈS nextTick
          // Cela garantit que les données sont à jour avant le redessinage
          if (graph.sharedState.pixiApp && protocol.sharedState.currentProtocol) {
            // Type assertion: le frontend utilise items?: string et _items?: IProtocolItem[]
            // mais setProtocol gère les deux formats en interne
            graph.sharedState.pixiApp.setProtocol(protocol.sharedState.currentProtocol as any);
          }

          // Si on change le mode d'affichage ou le support, redessiner tout
          // car la structure de l'axe Y change (nombre de ticks, positions, etc.)
          if (graph.sharedState.pixiApp && (preference.displayMode !== undefined || preference.supportCategoryId !== undefined)) {
            // Attendre encore un tick pour s'assurer que setProtocol a bien propagé les changements
            // dans yAxis avant de redessiner (évite que les labels se placent sur l'origine)
            await nextTick();
            graph.sharedState.pixiApp.draw();
          } else if (graph.sharedState.pixiApp && category?.children) {
            // Sinon, redessiner uniquement les observables de cette catégorie
            for (const observable of category.children) {
              graph.sharedState.pixiApp.updateObservablePreference(
                observable.id,
                preference
              );
            }
          }

          // Mettre à jour via l'API (après le rendu pour ne pas bloquer l'UI)
          await protocolService.updateItemGraphPreferences(
            currentProtocol.id,
            categoryId,
            preference
          );

          // Sauvegarder avec debounce
          methods.debouncedSave();
        } catch (error) {
          // Rollback en cas d'erreur API
          protocol.sharedState.currentProtocol = originalProtocol;
          
          console.error('Error updating category preference:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la mise à jour des préférences',
          });
        }
      },

      /**
       * Met à jour les préférences d'un observable
       */
      updateObservablePreference: async (
        observableId: string,
        preference: Partial<IGraphPreferences>
      ) => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol?.id) return;

        // Sauvegarder l'état original pour rollback en cas d'erreur
        const originalProtocol = JSON.parse(JSON.stringify(currentProtocol));

        try {
          // Mettre à jour localement (optimistic update)
          // Créer un nouvel objet pour garantir la réactivité Vue
          let updated = false;
          const updatedItems = currentProtocol._items?.map((category) => {
            if (category.children) {
              const updatedChildren = category.children.map((observable) => {
                if (observable.id === observableId) {
                  updated = true;
                  return {
                    ...observable,
                    graphPreferences: {
                      ...observable.graphPreferences,
                      ...preference,
                    },
                  };
                }
                return observable;
              });
              
              if (updated) {
                return {
                  ...category,
                  children: updatedChildren,
                };
              }
            }
            return category;
          });

          if (updated && updatedItems) {
            // Forcer la réactivité Vue en créant une nouvelle référence
            protocol.sharedState.currentProtocol = {
              ...currentProtocol,
              _items: updatedItems,
            };
          }

          // Mettre à jour via l'API
          await protocolService.updateItemGraphPreferences(
            currentProtocol.id,
            observableId,
            preference
          );

          // Mettre à jour le protocole dans le pixiApp et redessiner
          if (graph.sharedState.pixiApp && protocol.sharedState.currentProtocol) {
            // Type assertion: le frontend utilise items?: string et _items?: IProtocolItem[]
            // mais setProtocol gère les deux formats en interne
            graph.sharedState.pixiApp.setProtocol(protocol.sharedState.currentProtocol as any);
            graph.sharedState.pixiApp.updateObservablePreference(
              observableId,
              preference
            );
          }

          // Sauvegarder avec debounce
          methods.debouncedSave();
        } catch (error) {
          // Rollback en cas d'erreur API
          protocol.sharedState.currentProtocol = originalProtocol;
          
          console.error('Error updating observable preference:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la mise à jour des préférences',
          });
        }
      },

      /**
       * Sauvegarde avec debounce (500ms)
       */
      debouncedSave: () => {
        if (state.saveTimeout) {
          clearTimeout(state.saveTimeout);
        }
        state.saveTimeout = setTimeout(() => {
          // La sauvegarde est déjà faite lors de l'appel API
          // Cette fonction peut être utilisée pour des notifications ou autres actions
        }, 500);
      },

      /**
       * Récupère les options de support pour une catégorie
       */
      getSupportOptions: (categoryId: string) => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol?._items) return [];

        const options: { label: string; value: string | null }[] = [
          { label: 'Arrière plan du graph', value: null },
        ];

        // Ajouter les autres catégories en mode "normal"
        const otherCategories = currentProtocol._items.filter(
          (cat) => cat.id !== categoryId && cat.graphPreferences?.displayMode !== DisplayModeEnum.Background
        );

        otherCategories.forEach((cat) => {
          options.push({
            label: cat.name,
            value: cat.id,
          });
        });

        return options;
      },

      /**
       * Récupère les options de mode d'affichage pour une catégorie.
       * Les catégories discrètes ne peuvent être qu'en mode Normal.
       */
      getDisplayModeOptionsForCategory: (category: ProtocolItem) => {
        // Les catégories discrètes ne peuvent être qu'en mode Normal
        if (category.action === ProtocolItemActionEnum.Discrete) {
          return [{ label: 'Normal', value: DisplayModeEnum.Normal }];
        }
        return displayModeOptions;
      },
    };

    return {
      customization,
      protocol,
      state,
      patternOptions,
      displayModeOptions,
      DisplayModeEnum,
      ProtocolItemActionEnum,
      isCompactMode,
      isMinimized,
      MIN_CONTENT_WIDTH,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.graph-customization-side-container {
  overflow: hidden;
  min-width: 100px !important; // Largeur minimale ABSOLUE du drawer (bloque le drag à cette taille)
  flex-shrink: 0 !important; // Empêcher TOUTE compression par le splitter
  width: 100%; // Prendre toute la largeur disponible dans le panneau "after"
  
  &.is-compact {
    .drawer-header {
      padding: 8px;
    }
  }
}

.drawer-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.drawer-content {
  overflow: hidden;
  min-width: 0; // Permettre au contenu de déborder pour activer le scroll
  
  // Toujours permettre le scroll horizontal si nécessaire
  :deep(.q-scrollarea__content) {
    overflow-x: auto !important;
    overflow-y: auto !important;
    min-width: 0; // Important pour permettre le scroll
  }
  
  :deep(.q-scrollarea__thumb) {
    opacity: 1;
  }
}

.drawer-content-inner {
  padding: 8px;
  // Largeur minimale ABSOLUE pour forcer le scroll horizontal quand le drawer est réduit
  min-width: 700px !important;
  width: max-content; // S'adapter au contenu plutôt que 100%
  flex-shrink: 0; // Empêcher toute compression
  
  &.compact-layout {
    padding: 4px;
  }
}

.color-preview-compact {
  position: relative;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
}

.category-container {
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.category-row {
  border-left: 3px solid var(--primary);
  padding-left: 12px;
  padding-right: 4px;
  background-color: rgba(31, 41, 55, 0.05);
  border-radius: 4px 4px 0 0;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(31, 41, 55, 0.08);
  }
}

.observables-container {
  border-left: 3px solid rgba(0, 0, 0, 0.1);
  margin-left: 12px;
  padding-left: 16px;
  background-color: rgba(0, 0, 0, 0.01);
  border-radius: 0 0 4px 4px;
  padding-top: 4px;
  padding-bottom: 4px;
}

.observable-row {
  position: relative;
  transition: background-color 0.2s ease;
  margin-left: 0;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  &:not(:last-child) {
    margin-bottom: 2px;
  }
}

// Styles pour rendre les inputs dense encore plus compacts
:deep(.q-field--dense) {
  .q-field__control {
    min-height: 28px !important;
    height: 28px !important;
  }
  
  .q-field__native {
    min-height: 28px !important;
    padding-top: 4px !important;
    padding-bottom: 4px !important;
    font-size: 0.8125rem !important;
  }
  
  .q-field__marginal {
    height: 28px !important;
  }
  
  .q-field__append,
  .q-field__prepend {
    min-height: 28px !important;
  }
}

:deep(.q-slider--dense) {
  .q-slider__track {
    height: 4px !important;
  }
  
  .q-slider__thumb {
    width: 12px !important;
    height: 12px !important;
  }
  
  .q-slider__label {
    font-size: 0.7rem !important;
    padding: 2px 4px !important;
  }
}
</style>
