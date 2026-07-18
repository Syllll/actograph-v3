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
        <span v-if="!isCompactMode">{{ $t('graphUi.drawerTitleFull') }}</span>
        <span v-else class="text-weight-bold">{{ $t('graphUi.drawerTitleShort') }}</span>
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
        :style="drawerContentStyle"
      >
        <template v-for="(category, index) in protocol.sharedState.currentProtocol._items" :key="category.id">
          <!-- Séparateur avant la catégorie (sauf pour la première) -->
          <q-separator v-if="index > 0" class="q-my-md" />
          
          <!-- Conteneur de catégorie avec ses observables -->
          <div class="category-container">
            <!-- Ligne Catégorie -->
            <div class="category-row customization-row">
              <!-- Nom de la catégorie -->
              <DrawerLabelCell
                :text="category.name ?? ''"
                :text-class="[
                  'category-name text-weight-medium',
                  isCompactMode ? 'text-caption' : 'text-body2',
                ]"
              />

              <!-- Mode d'affichage (désactivé pour les catégories discrètes) -->
              <div class="cell-select">
                <div
                  class="display-mode-select-host"
                  :class="{ 'is-disabled': methods.isDiscreteCategory(category) }"
                >
                  <q-select
                    :model-value="methods.getCategoryDisplayMode(category)"
                    :options="methods.getDisplayModeOptionsForCategory(category)"
                    option-label="label"
                    option-value="value"
                    dense
                    outlined
                    emit-value
                    map-options
                    :disable="methods.isDiscreteCategory(category)"
                    @update:model-value="methods.onCategoryDisplayModeChange(category.id, $event)"
                  />
                  <q-tooltip v-if="methods.isDiscreteCategory(category)">
                    {{ $t('graphUi.discreteCategoryNormalOnly') }}
                  </q-tooltip>
                </div>
              </div>

              <!-- Couleur -->
              <div class="cell-color">
                <div
                  class="color-preview-compact"
                  :style="{
                    backgroundColor: category.graphPreferences?.color || DEFAULT_GRAPH_COLOR,
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                  }"
                  @click="methods.openColorPicker('category', category.id, category.graphPreferences?.color)"
                >
                  <q-tooltip>{{ $t('graphUi.chooseColorTitle') }}</q-tooltip>
                </div>
              </div>

              <!-- Épaisseur -->
              <div class="cell-stroke">
                <q-slider
                  :model-value="category.graphPreferences?.strokeWidth ?? 2"
                  :min="1"
                  :max="10"
                  :step="1"
                  dense
                  :label-value="`${category.graphPreferences?.strokeWidth ?? 2}px`"
                  @update:model-value="methods.onCategoryStrokeWidthChange(category.id, $event)"
                />
              </div>

              <!-- Motif (disponible pour Background et Frieze) -->
              <div class="cell-select">
                <q-select
                  :model-value="category.graphPreferences?.backgroundPattern || 'solid'"
                  :options="patternOptions"
                  option-label="label"
                  option-value="value"
                  dense
                  outlined
                  emit-value
                  map-options
                  :disable="methods.getCategoryDisplayMode(category) === DisplayModeEnum.Normal"
                  @update:model-value="methods.onCategoryPatternChange(category.id, $event)"
                />
              </div>

              <!-- Support (uniquement pour Background) - bug 3.5 : sélecteur "arrière-plan de quelle catégorie ?" -->
              <div class="cell-select">
                <q-select
                  v-if="methods.getCategoryDisplayMode(category) === DisplayModeEnum.Background"
                  :model-value="methods.getCategorySupportCategoryId(category)"
                  :options="methods.getSupportOptions(category.id)"
                  option-label="label"
                  option-value="value"
                  dense
                  outlined
                  emit-value
                  map-options
                  :placeholder="$t('graphUi.placeholderBgCategory')"
                  @update:model-value="methods.onCategorySupportChange(category.id, $event)"
                />
              </div>
            </div>

            <!-- Conteneur des observables -->
            <div class="observables-container">
              <!-- Lignes Observables -->
              <div
                v-for="observable in category.children ?? []"
                :key="observable.id"
                class="observable-row customization-row"
              >
                <!-- Nom de l'observable -->
                <DrawerLabelCell
                  :text="observable.name ?? ''"
                  :text-class="isCompactMode ? 'text-caption' : 'text-body2'"
                  class="observable-label-cell"
                />

                <!-- Mode d'affichage (espace réservé) -->
                <div class="cell-select" aria-hidden="true" />

                <!-- Couleur -->
                <div class="cell-color">
                  <div
                    class="color-preview-compact"
                    :style="{
                      backgroundColor: methods.getObservableColor(observable.id, category.id) || DEFAULT_GRAPH_COLOR,
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '1px solid rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                    }"
                    @click="methods.openColorPicker('observable', observable.id, methods.getObservableColor(observable.id, category.id))"
                  >
                    <q-tooltip>{{ $t('graphUi.chooseColorTitle') }}</q-tooltip>
                  </div>
                </div>

                <!-- Épaisseur -->
                <div class="cell-stroke">
                  <q-slider
                    :model-value="methods.getObservableStrokeWidth(observable.id, category.id) ?? 2"
                    :min="1"
                    :max="10"
                    :step="1"
                    dense
                    :label-value="`${methods.getObservableStrokeWidth(observable.id, category.id) ?? 2}px`"
                    @update:model-value="methods.onObservableStrokeWidthChange(observable.id, $event)"
                  />
                </div>

                <!-- Motif (disponible pour Background et Frieze) -->
                <div class="cell-select">
                  <q-select
                    :model-value="methods.getObservablePattern(observable.id, category.id) || 'solid'"
                    :options="patternOptions"
                    option-label="label"
                    option-value="value"
                    dense
                    outlined
                    emit-value
                    map-options
                    :disable="methods.getCategoryDisplayMode(category) === DisplayModeEnum.Normal"
                    @update:model-value="methods.onObservablePatternChange(observable.id, $event)"
                  />
                </div>

                <!-- Support (espace réservé) -->
                <div class="cell-select" aria-hidden="true" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-else class="q-pa-md text-center text-grey-7">
        <q-icon name="info" size="2rem" color="grey-7" class="q-mb-sm" />
        <div class="text-subtitle1 q-mt-sm">{{ $t('observation.noProtocolLoadedTitle') }}</div>
        <div class="text-caption q-mt-xs">
          {{ $t('observation.noProtocolLoadedHint') }}
        </div>
      </div>
    </DScrollArea>

    <!-- Dialog de sélection de couleur -->
    <q-dialog v-model="state.showColorDialog" class="actograph-dialog" @hide="methods.onColorDialogHide">
      <DDialogCard
        :title="$t('graphUi.chooseColorTitle')"
        size="auto"
        :cancelLabel="$t('dialogs.cancel')"
        :submitLabel="$t('graphUi.validate')"
        @cancel="methods.cancelColor"
        @submit="methods.confirmColor"
      >
        <q-color
          v-model="state.selectedColor"
          format-model="hex"
          no-header-tabs
          flat
          class="color-picker-widget"
        />
      </DDialogCard>
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
import { useI18n } from 'vue-i18n';
import { useGraph } from '../graph/use-graph';
import { DScrollArea, DDialogCard } from '@lib-improba/components';
import { DEFAULT_GRAPH_COLOR } from '@actograph/graph';
import DrawerLabelCell from './DrawerLabelCell.vue';
import {
  collectCategoryPreferenceRepairs,
  getObservablePropagationPatch,
  isDiscreteCategory,
  resolveCategoryDisplayMode,
  resolveSupportCategoryId,
  sanitizeGraphPreferencePatch,
  shouldApplyDisplayModeUpdate,
} from './graph-preferences.utils';

const COMPACT_MODE_THRESHOLD = 400; // Largeur en pixels pour activer le mode compact
const GRID_COLUMN_WIDTHS = [140, 120, 36, 90, 140, 140];
const GRID_COLUMN_WIDTHS_COMPACT = [100, 100, 36, 80, 120, 120];
const GRID_GAP = 8;
const GRID_GAP_COMPACT = 4;
const ROW_PADDING_X = 16; // padding-left 12px + padding-right 4px
const INNER_PADDING_X = 16; // padding 8px de chaque côté dans drawer-content-inner

const computeMinContentWidth = (compact: boolean): number => {
  const columns = compact ? GRID_COLUMN_WIDTHS_COMPACT : GRID_COLUMN_WIDTHS;
  const gap = compact ? GRID_GAP_COMPACT : GRID_GAP;
  const innerPaddingX = compact ? 8 : INNER_PADDING_X;
  const columnsWidth = columns.reduce((sum, width) => sum + width, 0);
  return columnsWidth + gap * (columns.length - 1) + ROW_PADDING_X + innerPaddingX;
};

const GRID_LAYOUT_KEYS = [
  'name',
  'display',
  'color',
  'stroke',
  'pattern',
  'support',
] as const;

const buildDrawerContentStyle = (compact: boolean): Record<string, string> => {
  const columns = compact ? GRID_COLUMN_WIDTHS_COMPACT : GRID_COLUMN_WIDTHS;
  const style: Record<string, string> = {
    minWidth: `${computeMinContentWidth(compact)}px`,
  };

  GRID_LAYOUT_KEYS.forEach((key, index) => {
    style[`--gc-col-${key}`] = `${columns[index]}px`;
  });

  return style;
};

const DRAWER_MIN_WIDTH_PX = 100; // Largeur minimale du drawer en pixels (bloque le drag à cette taille)

export default defineComponent({
  name: 'GraphCustomizationDrawer',
  components: {
    DScrollArea,
    DDialogCard,
    DrawerLabelCell,
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
    const { t, locale } = useI18n();

    const state = reactive({
      saveTimeout: null as ReturnType<typeof setTimeout> | null,
      showColorDialog: false,
      selectedColor: DEFAULT_GRAPH_COLOR,
      currentColorPicker: {
        type: '' as '' | 'category' | 'observable',
        id: '',
      },
    });

    const patternOptions = computed(() => {
      void locale.value;
      return [
        { label: t('graphUi.patternNone'), value: BackgroundPatternEnum.Solid },
        { label: t('graphUi.patternHorizontal'), value: BackgroundPatternEnum.Horizontal },
        { label: t('graphUi.patternVertical'), value: BackgroundPatternEnum.Vertical },
        { label: t('graphUi.patternDiagonal'), value: BackgroundPatternEnum.Diagonal },
        { label: t('graphUi.patternGrid'), value: BackgroundPatternEnum.Grid },
        { label: t('graphUi.patternDots'), value: BackgroundPatternEnum.Dots },
      ];
    });

    const displayModeOptions = computed(() => {
      void locale.value;
      return [
        { label: t('graphUi.displayNormal'), value: DisplayModeEnum.Normal },
        { label: t('graphUi.displayBackground'), value: DisplayModeEnum.Background },
        { label: t('graphUi.displayFrieze'), value: DisplayModeEnum.Frieze },
      ];
    });

    // Mode compact activé quand la largeur est inférieure au seuil
    const isCompactMode = computed(() => {
      return props.drawerWidth < COMPACT_MODE_THRESHOLD;
    });

    const drawerContentStyle = computed(() => buildDrawerContentStyle(isCompactMode.value));

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
            message: t('graphUi.protocolLoadError'),
          });
        }
      }
    };

    // Charger au montage
    onMounted(async () => {
      await loadProtocolIfNeeded();
      await repairStaleCategoryPreferences();
    });

    // Charger si l'observation change
    watch(
      () => observation.sharedState.currentObservation,
      async () => {
        await loadProtocolIfNeeded();
        await repairStaleCategoryPreferences();
      },
      { immediate: false }
    );

    // Sync structurel : setData+draw via requestRedraw (pas setProtocol+draw seuls).
    // dataArea ne reconstruit readingsPerCategory que dans setData ; un draw
    // après setProtocol seul laisse Y et data potentiellement désalignés.
    const syncGraphProtocol = () => {
      graph.requestRedraw();
    };

    let isRepairingPreferences = false;

    const repairStaleCategoryPreferences = async () => {
      const currentProtocol = protocol.sharedState.currentProtocol;
      if (!currentProtocol?.id || !currentProtocol._items || isRepairingPreferences) {
        return;
      }

      const repairs = collectCategoryPreferenceRepairs(currentProtocol._items);
      if (repairs.length === 0) {
        return;
      }

      isRepairingPreferences = true;
      try {
        await Promise.all(
          repairs.map(({ categoryId, patch }) =>
            protocolService.updateItemGraphPreferences(currentProtocol.id, categoryId, patch)
          )
        );

        if (observation.sharedState.currentObservation) {
          const reloaded = await protocolService.findOneFromObservationId(
            observation.sharedState.currentObservation.id
          );
          protocol.sharedState.currentProtocol = reloaded;
          syncGraphProtocol();
        }
      } catch (error) {
        console.error('Failed to repair stale category graph preferences:', error);
      } finally {
        isRepairingPreferences = false;
      }
    };

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

      isDiscreteCategory,

      getCategoryDisplayMode: (category: ProtocolItem): DisplayModeEnum => {
        return resolveCategoryDisplayMode(category);
      },

      getCategorySupportCategoryId: (category: ProtocolItem): string | null => {
        const currentProtocol = protocol.sharedState.currentProtocol;
        if (!currentProtocol?._items) {
          return null;
        }

        return resolveSupportCategoryId(
          category.id,
          category.graphPreferences?.supportCategoryId,
          currentProtocol._items as ProtocolItem[],
          resolveCategoryDisplayMode
        );
      },

      updateCategoryDisplayMode: (categoryId: string, val: DisplayModeEnum | null) => {
        if (val === null || val === undefined) {
          return;
        }

        const currentProtocol = protocol.sharedState.currentProtocol;
        const category = currentProtocol?._items?.find((item) => item.id === categoryId);
        if (!category) {
          return;
        }

        if (!shouldApplyDisplayModeUpdate(category as ProtocolItem, val)) {
          return;
        }

        methods.updateCategoryPreference(categoryId, { displayMode: val });
      },

      onCategoryDisplayModeChange: (categoryId: string, val: DisplayModeEnum | null) => {
        methods.updateCategoryDisplayMode(categoryId, val);
      },

      onCategoryStrokeWidthChange: (categoryId: string, val: number | null) => {
        methods.updateCategoryPreference(categoryId, { strokeWidth: val ?? undefined });
      },

      onCategoryPatternChange: (categoryId: string, val: BackgroundPatternEnum) => {
        methods.updateCategoryPreference(categoryId, { backgroundPattern: val });
      },

      onCategorySupportChange: (categoryId: string, val: string | null) => {
        methods.updateCategoryPreference(categoryId, {
          supportCategoryId: val === '' ? null : val,
        });
      },

      onObservableStrokeWidthChange: (observableId: string, val: number | null) => {
        methods.updateObservablePreference(observableId, { strokeWidth: val ?? undefined });
      },

      onObservablePatternChange: (observableId: string, val: BackgroundPatternEnum) => {
        methods.updateObservablePreference(observableId, { backgroundPattern: val });
      },

      /**
       * Ouvre le sélecteur de couleur
       */
      openColorPicker: (type: 'category' | 'observable', id: string, currentColor?: string) => {
        state.currentColorPicker = { type, id };
        state.selectedColor = currentColor || DEFAULT_GRAPH_COLOR;
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
        state.selectedColor = DEFAULT_GRAPH_COLOR;
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
        const sanitizedPreference = sanitizeGraphPreferencePatch(preference);
        if (Object.keys(sanitizedPreference).length === 0) return;

        // Sauvegarder l'état original pour rollback en cas d'erreur
        const originalProtocol = JSON.parse(JSON.stringify(currentProtocol));

        try {
          // Mettre à jour localement (optimistic update)
          // Créer un nouvel objet pour garantir la réactivité Vue
          const category = currentProtocol._items?.find((c) => c.id === categoryId);
          if (category) {
            category.graphPreferences = {
              ...category.graphPreferences,
              ...sanitizedPreference,
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
          const isStructuralCategoryChange =
            sanitizedPreference.displayMode !== undefined ||
            sanitizedPreference.supportCategoryId !== undefined;

          if (graph.sharedState.pixiApp && protocol.sharedState.currentProtocol) {
            if (isStructuralCategoryChange) {
              // displayMode / supportCategoryId affectent l'axe Y et le layout :
              // setData + draw (chemin unique), pas setProtocol + draw seuls.
              await nextTick();
              graph.requestRedraw();
            } else {
              graph.sharedState.pixiApp.setProtocol(
                protocol.sharedState.currentProtocol as any
              );
              // Préférences visuelles : un seul redraw de la catégorie
              graph.sharedState.pixiApp.redrawCategory(categoryId);
            }
          }

          // Mettre à jour via l'API (après le rendu pour ne pas bloquer l'UI)
          await protocolService.updateItemGraphPreferences(
            currentProtocol.id,
            categoryId,
            sanitizedPreference
          );

          // Propager les préférences visuelles aux observables (couleur, épaisseur, motif).
          // displayMode et supportCategoryId restent au niveau catégorie uniquement.
          const observablePatch = getObservablePropagationPatch(sanitizedPreference);
          if (category?.children && Object.keys(observablePatch).length > 0) {
            await Promise.all(
              category.children
                .filter((o) => o.type === 'observable')
                .map((observable) =>
                  protocolService.updateItemGraphPreferences(
                    currentProtocol.id,
                    observable.id,
                    observablePatch
                  )
                )
            );
          }

          // Recharger le protocole depuis l'API pour garantir la persistance (bug 3.7)
          if (observation.sharedState.currentObservation) {
            const reloaded = await protocolService.findOneFromObservationId(
              observation.sharedState.currentObservation.id
            );
            protocol.sharedState.currentProtocol = reloaded;
            if (graph.sharedState.pixiApp) {
              // Rendu optimiste déjà effectué : synchroniser le protocole sans redraw.
              graph.sharedState.pixiApp.setProtocol(reloaded as any);
            }
            await repairStaleCategoryPreferences();
          }

          // Sauvegarder avec debounce
          methods.debouncedSave();
        } catch (error: any) {
          protocol.sharedState.currentProtocol = originalProtocol;
          syncGraphProtocol();
          
          const apiMessage = error?.response?.data?.message;
          const validationErrors = error?.response?.data?.errors;
          const message = Array.isArray(validationErrors)
            ? validationErrors.join(', ')
            : apiMessage || t('graphUi.prefsUpdateFailed');
          
          console.error('Error updating category preference:', error);
          $q.notify({
            type: 'negative',
            message,
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
        const sanitizedPreference = sanitizeGraphPreferencePatch(preference);
        if (Object.keys(sanitizedPreference).length === 0) return;

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
                      ...sanitizedPreference,
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

          await nextTick();

          if (graph.sharedState.pixiApp && protocol.sharedState.currentProtocol) {
            graph.sharedState.pixiApp.setProtocol(protocol.sharedState.currentProtocol as any);
            graph.sharedState.pixiApp.updateObservablePreference(
              observableId,
              sanitizedPreference,
              { redraw: false },
            );
            graph.sharedState.pixiApp.redrawObservable(observableId);
          }

          // Mettre à jour via l'API
          await protocolService.updateItemGraphPreferences(
            currentProtocol.id,
            observableId,
            sanitizedPreference
          );

          // Recharger le protocole depuis l'API pour garantir la persistance (bug 3.7)
          if (observation.sharedState.currentObservation) {
            const reloaded = await protocolService.findOneFromObservationId(
              observation.sharedState.currentObservation.id
            );
            protocol.sharedState.currentProtocol = reloaded;
            if (graph.sharedState.pixiApp) {
              graph.sharedState.pixiApp.setProtocol(reloaded as any);
            }
          }

          // Sauvegarder avec debounce
          methods.debouncedSave();
        } catch (error: any) {
          protocol.sharedState.currentProtocol = originalProtocol;
          syncGraphProtocol();
          
          const apiMessage = error?.response?.data?.message;
          const validationErrors = error?.response?.data?.errors;
          const message = Array.isArray(validationErrors)
            ? validationErrors.join(', ')
            : apiMessage || t('graphUi.prefsUpdateFailed');
          
          console.error('Error updating observable preference:', error);
          $q.notify({
            type: 'negative',
            message,
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
          { label: t('graphUi.graphBackgroundOption'), value: null },
        ];

        // Ajouter les autres catégories en mode "normal"
        const otherCategories = currentProtocol._items.filter(
          (cat) =>
            cat.id !== categoryId &&
            methods.getCategoryDisplayMode(cat as ProtocolItem) !== DisplayModeEnum.Background
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
        if (category.action === ProtocolItemActionEnum.Discrete) {
          return [{ label: t('graphUi.displayNormal'), value: DisplayModeEnum.Normal }];
        }
        return displayModeOptions.value;
      },
    };

    return {
      customization,
      protocol,
      graph,
      state,
      patternOptions,
      displayModeOptions,
      DisplayModeEnum,
      ProtocolItemActionEnum,
      DEFAULT_GRAPH_COLOR,
      isCompactMode,
      isMinimized,
      drawerContentStyle,
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;

  &.compact-layout {
    padding: 4px;
  }
}

.customization-row {
  display: grid;
  grid-template-columns:
    var(--gc-col-name)
    var(--gc-col-display)
    var(--gc-col-color)
    var(--gc-col-stroke)
    var(--gc-col-pattern)
    var(--gc-col-support);
  column-gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 8px 4px 8px 12px;
}

.drawer-content-inner.compact-layout .customization-row {
  column-gap: 4px;
  padding: 6px 4px 6px 12px;
}

:deep(.label-cell) {
  min-width: 0;
  overflow: hidden;

  .label-text {
    display: block;
    min-width: 0;
  }
}

:deep(.observable-label-cell) {
  padding-left: 16px;
}

.display-mode-select-host {
  width: 100%;

  &.is-disabled {
    cursor: help;
  }
}

.cell-select {
  position: relative;
  min-width: 0;
  overflow: visible;

  :deep(.q-field) {
    width: 100%;
    min-width: 0;
  }

  :deep(.q-field__control-container),
  :deep(.q-field__control) {
    min-width: 0;
  }

  :deep(.q-field__input) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  :deep(.q-field__native) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
}

.cell-color {
  display: flex;
  justify-content: center;
  min-width: 0;
}

.cell-stroke {
  min-width: 0;
  overflow: hidden;
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
  position: relative;
  background-color: color-mix(in srgb, var(--q-primary) 5%, transparent);
  border-radius: 4px 4px 0 0;
  transition: background-color 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 4px 0 0 0;
    background-color: var(--q-primary);
  }

  &:hover {
    background-color: color-mix(in srgb, var(--q-primary) 8%, transparent);
  }
}

.observables-container {
  position: relative;
  border-radius: 0 0 4px 4px;
  padding-top: 4px;
  padding-bottom: 4px;
  background-color: rgba(0, 0, 0, 0.01);

  &::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 0 0 0 2px;
    background-color: rgba(0, 0, 0, 0.1);
  }
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

.color-picker-widget {
  display: block;
  // Quasar plafonne lui-même .q-color-picker a 350px (QColor.sass) ; en dessous,
  // la rangee d'icones du pied (spectre/saisie/palette, alignees en "justify"
  // sans padding) se retrouve trop serree.
  width: 350px;
  max-width: 100%;
  margin: 0 auto;
}
</style>
