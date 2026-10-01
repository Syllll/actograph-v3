<template>
  <div class="buttons-side-container q-pa-sm column fit">
    <div class="col-auto observation-panel-title-row row items-center q-mb-sm dashboard-header">
      <div class="col text-h6 dashboard-title">
        {{ $t('observation.observationDashboardTitle') }}
      </div>
    </div>

    <ObservationSessionBar
      class="col-auto q-mb-sm"
      :attach-in-progress="attachInProgress"
    />

    <div
      ref="buttonsScrollWrapper"
      class="col buttons-scroll-wrapper position-relative"
      style="min-height: 0;"
    >
      <!-- Voile "En pause" : uniquement en mode calendrier, quand la pause
           verrouille les relevés. Renforce visuellement que les boutons ci-
           dessous sont désactivés (isContinuousDisabled/isDiscreteDisabled). -->
      <div v-if="computedState.isLockedByCalendarPause.value" class="paused-overlay column items-center justify-center">
        <q-icon name="lock" size="24px" />
        <div class="paused-overlay-title q-mt-xs">{{ $t('observation.pausedOverlayTitle') }}</div>
        <div class="paused-overlay-subtitle">{{ $t('observation.pausedOverlaySubtitle') }}</div>
      </div>

      <DScrollArea class="fit" style="min-height: 0;">
      <div class="categories-wrapper"
        ref="categoriesWrapper"
        :style="{ '--ui-scale': state.uiScale }"
      >
        <div
          class="board-layout-group column items-center no-wrap"
          role="group"
          :aria-label="$t('observation.boardLayoutAria')"
        >
          <span>
            <q-btn
              flat
              round
              dense
              icon="mdi-magnify-plus"
              size="sm"
              color="grey-8"
              class="ui-scale-btn"
              :disable="state.uiScale >= UI_SCALE_MAX"
              :aria-label="$t('observation.uiScaleIncreaseTooltip')"
              @click="methods.increaseUiScale()"
            />
            <q-tooltip>{{ $t('observation.uiScaleIncreaseTooltip') }}</q-tooltip>
          </span>
          <span>
            <q-btn
              flat
              round
              dense
              icon="mdi-magnify-minus"
              size="sm"
              color="grey-8"
              class="ui-scale-btn"
              :disable="state.uiScale <= UI_SCALE_MIN"
              :aria-label="$t('observation.uiScaleDecreaseTooltip')"
              @click="methods.decreaseUiScale()"
            />
            <q-tooltip>{{ $t('observation.uiScaleDecreaseTooltip') }}</q-tooltip>
          </span>
          <q-separator />
          <span>
            <q-btn
              class="reset-categories-btn"
              :icon="state.isResetting ? 'mdi-loading mdi-spin' : 'mdi-restart'"
              :color="state.isResetting ? 'accent' : 'grey-8'"
              flat
              round
              dense
              size="sm"
              :disable="state.isResetting"
              :aria-label="$t('observation.resetLayoutLabel')"
              @click="methods.resetPositions()"
            />
            <q-tooltip>{{ $t('observation.resetLayoutLabel') }}</q-tooltip>
          </span>
          <template v-if="popoutHandler">
            <q-separator />
            <span>
              <q-btn
                flat
                round
                dense
                size="sm"
                color="grey-8"
                icon="open_in_new"
                class="popout-btn-inline"
                :disable="!observation.sharedState.currentObservation?.id"
                :aria-label="$t('observation.popoutButtonsTooltip')"
                @click="methods.handlePopout()"
              />
              <q-tooltip>{{ $t('observation.popoutButtonsTooltip') }}</q-tooltip>
            </span>
          </template>
        </div>
      <template v-if="sharedState.currentProtocol && sharedState.currentProtocol._items && computedState.categories.value.length > 0">
        <Category
          v-for="category in computedState.categories.value"
          :key="category.id"
            :category="category"
            :active-observable-id-by-category-id="state.activeObservableIdByCategoryId"
            :position="state.categoryPositions[category.id] || { x: 0, y: 0 }"
            :width="methods.getCategoryWidth(category.id)"
            :is-continuous-disabled="computedState.isContinuousDisabled.value"
            :is-discrete-disabled="computedState.isDiscreteDisabled.value"
            :style="methods.getCategoryStyle(category.id)"
            @switch-click="methods.handleSwitchClick"
            @press-click="methods.handlePressClick"
            @move="methods.handleCategoryMove"
            @resize="methods.handleCategoryResize"
            @resize-end="methods.handleCategoryResizeEnd"
            @drag-start="(id) => methods.updateDraggingState(id, true)"
            @drag-end="(id) => methods.updateDraggingState(id, false)"
          />
        </template>
        <div v-else class="no-data text-center q-pa-lg">
          <q-icon name="info" size="2rem" color="grey-7" />
          <div class="text-subtitle1 q-mt-sm">{{ $t('observation.noProtocolLoadedTitle') }}</div>
          <div class="text-caption q-mt-xs q-mb-md">{{ $t('observation.noProtocolLoadedHint') }}</div>
          <div class="column items-center q-gutter-sm">
            <router-link
              :to="{ name: 'user_protocol' }"
              class="no-protocol-link"
            >
              {{ $t('chronicle.ctaProtocol') }}
            </router-link>
            <q-btn
              outline
              color="accent"
              no-caps
              class="no-protocol-cta"
              :label="$t('observation.noProtocolImportCta')"
              :disable="!observation.sharedState.currentObservation?.id"
              @click="methods.openImportProtocol"
            />
          </div>
        </div>
      </div>
    </DScrollArea>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted, watch, nextTick, PropType } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { observationService } from '@services/observations/index.service';
import { ProtocolItem, ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { isRecordingActiveFromReadings } from '@actograph/core';
import Category from './Category.vue';
import ObservationSessionBar from '../ObservationSessionBar.vue';
import ImportProtocolDialog from '../ImportProtocolDialog.vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { DScrollArea } from '@lib-improba/components/app/scroll-areas';
import { createDialog } from '@lib-improba/utils/dialog.utils';

// Largeur par défaut / bornes des boîtes catégories (px).
// 220px ≈ 13.75rem, proche du 13rem historique.
const DEFAULT_CATEGORY_WIDTH = 220;
const MIN_CATEGORY_WIDTH = 160;
const MAX_CATEGORY_WIDTH = 600;

// Délai laissant aux cartes le temps de rejouer leur transition de
// repositionnement (left/top 0.5s cubic-bezier) avant de relâcher le
// bouton "Réinitialiser" et de notifier le succès.
const RESET_POSITIONS_SETTLE_MS = 600;

// Échelle d'affichage des boutons d'observable (comme en mobile).
const UI_SCALE_MIN = 0.7;
const UI_SCALE_MAX = 1.6;
const UI_SCALE_STEP = 0.1;
const UI_SCALE_DEFAULT = 1;
const UI_SCALE_STORAGE_KEY = 'actograph.observation.uiScale';

export default defineComponent({
  name: 'ButtonsSideIndex',

  components: {
    Category,
    DScrollArea,
    ObservationSessionBar,
  },

  props: {
    attachInProgress: {
      type: Boolean,
      default: false,
    },
    // Handler pour ouvrir le panneau des boutons en fenêtre séparée (pop-out).
    // Fourni par le parent (observation/Index.vue). Affiché dans le groupe Disposition.
    popoutHandler: {
      type: Function as PropType<() => void>,
      default: null,
    },
  },

  setup(props) {
    const $q = useQuasar();
    const { t } = useI18n();
    const observation = useObservation();
    const protocol = observation.protocol;
    const readings = observation.readings;
    const { sharedState } = protocol;
    const categoriesWrapper = ref<HTMLElement | null>(null);
    const buttonsScrollWrapper = ref<HTMLElement | null>(null);

    // Reactive state
    const state = reactive({
      isResetting: false,
      activeObservableIdByCategoryId: {} as Record<string, string>,
      categoryPositions: {} as Record<string, { x: number; y: number }>,
      // Largeur personnalisée de chaque catégorie (px), persistée dans meta.size.
      // Absent => largeur par défaut (DEFAULT_CATEGORY_WIDTH).
      categorySizes: {} as Record<string, { width: number }>,
      isDragging: false,
      isDraggingCategoryId: null as string | null,
      lastInitializedStartSignature: null as string | null,
      // Échelle d'affichage des boutons (facteur multiplicatif appliqué via la
      // variable CSS --ui-scale sur .categories-wrapper).
      uiScale: UI_SCALE_DEFAULT,
      // Largeur du conteneur (categories-wrapper), maintenue réactive via un
      // ResizeObserver pour réappliquer la borne max des catégories quand le
      // splitter / la fenêtre change de largeur.
      containerWidth: 0,
    });
    
    // Listen for video reading active events to auto-activate buttons
    const handleVideoReadingActive = (event: CustomEvent) => {
      const readingsByCategory = event.detail.readingsByCategory;
      
      if (!readingsByCategory) {
        return;
      }
      
      // For each category, activate the button corresponding to the last reading
      for (const category of computedState.categories.value) {
        // Only handle continuous categories (discrete don't need activation)
        if (category.action !== ProtocolItemActionEnum.Continuous) continue;
        
        const reading = readingsByCategory[category.id];
        
        if (reading && reading.name && category.children) {
          // Find the observable that matches the reading name
          const observable = category.children.find(
            (obs: any) => obs.name === reading.name
          );
          
          if (observable) {
            // Activate the button for this observable
            state.activeObservableIdByCategoryId[category.id] = observable.id as string;
          } else {
            // If observable not found, deactivate button for this category
            delete state.activeObservableIdByCategoryId[category.id];
          }
        } else {
          // If no reading found for this category, deactivate button
          delete state.activeObservableIdByCategoryId[category.id];
        }
      }
    };

    // Computed
    const isRecordingStarted = computed(() =>
      isRecordingActiveFromReadings(readings.sharedState.currentReadings)
    );

    const isPaused = computed(() => isRecordingStarted.value && !observation.sharedState.isPlaying);

    // En mode chronomètre (avec ou sans vidéo), la pause fige le temps mais les
    // boutons restent actifs : les relevés doivent pouvoir s'enregistrer au temps
    // figé, exactement comme en mode vidéo où la vidéo à l'arrêt reste cliquable.
    // En mode calendrier (observation in situ), la pause verrouille les relevés :
    // impossible d'enregistrer tant que l'observation n'a pas repris.
    const canRecordReading = computed(() => {
      if (!isRecordingStarted.value) return false;
      if (observation.isChronometerMode.value) return true;
      return observation.sharedState.isPlaying;
    });

    // Les boutons ne sont verrouillés (grisés) qu'en mode calendrier pendant une
    // pause. Dans tous les autres cas (mode chronomètre, avant le START, en
    // lecture) ils restent utilisables (Bug 2.3 / 2.4).
    const isLockedByCalendarPause = computed(
      () => isPaused.value && !observation.isChronometerMode.value
    );

    const computedState = {
      isRecordingStarted,
      isPaused,
      canRecordReading,
      isLockedByCalendarPause,
      isContinuousDisabled: computed(() => isLockedByCalendarPause.value),
      isDiscreteDisabled: computed(() => isLockedByCalendarPause.value),
      categories: computed(() => {
        if (!sharedState.currentProtocol || !sharedState.currentProtocol._items) {
          return [] as ProtocolItem[];
        }
        
        // Ensure _items is an array
        const items = Array.isArray(sharedState.currentProtocol._items) 
          ? sharedState.currentProtocol._items 
          : [];
        
        // Filter categories - use loose comparison to handle potential type mismatches
        return items
          .filter((item: any) => {
            // Handle both string and enum comparisons
            const itemType = item?.type;
            return itemType === ProtocolItemTypeEnum.Category || 
                   itemType === 'category' ||
                   (typeof itemType === 'string' && itemType.toLowerCase() === 'category');
          })
          .map((item: any) => item as ProtocolItem);
      }),
    };

    // Debounce de la persistance du uiScale : on attend que l'utilisateur
    // arrête de cliquer sur +/- pour n'émettre qu'un seul appel API par rafale.
    const PERSIST_UI_SCALE_DEBOUNCE_MS = 400;
    let persistUiScaleTimer: number | null = null;
    const PERSIST_CLAMP_DEBOUNCE_MS = 400;
    let persistClampTimer: number | null = null;
    const pendingClampPersistIds = new Set<string>();

    const methods = {
      openImportProtocol: async () => {
        const targetObservationId = observation.sharedState.currentObservation?.id;
        if (!targetObservationId) {
          return;
        }
        await createDialog({
          component: ImportProtocolDialog,
          componentProps: { targetObservationId },
          persistent: true,
        });
      },

      /**
       * Met à jour la hauteur minimale du conteneur pour s'assurer qu'il est assez grand
       * pour afficher toutes les catégories, même lorsqu'elles sont déplacées vers le bas.
       * 
       * Cette fonction est appelée après chaque déplacement de catégorie pour ajuster
       * dynamiquement la hauteur du conteneur scrollable. Elle garantit que :
       * 1. Toutes les catégories restent visibles et accessibles via le scroll
       * 2. Le conteneur s'agrandit automatiquement quand une catégorie est déplacée vers le bas
       * 3. Les hauteurs variables des catégories (selon le nombre d'observables) sont prises en compte
       * 
       * IMPORTANT : Les catégories utilisent `position: absolute`, donc elles ne contribuent
       * pas naturellement à la hauteur du conteneur. Cette fonction calcule manuellement
       * la hauteur nécessaire en fonction des positions et hauteurs réelles des catégories.
       */
      updateWrapperHeight: () => {
        if (!categoriesWrapper.value) return;
        
        // Variables pour tracker la catégorie la plus basse
        let maxY = 0; // Position Y la plus basse
        let maxHeight = 0; // Hauteur de la catégorie la plus basse
        
        // Récupérer toutes les catégories depuis le DOM pour obtenir leurs dimensions réelles
        // On utilise le DOM plutôt que state.categoryPositions car :
        // 1. Les hauteurs réelles peuvent varier selon le nombre d'observables
        // 2. Le DOM reflète l'état visuel actuel après le rendu
        const allCategoryElements = categoriesWrapper.value.querySelectorAll('.category-container');
        
        // Si des éléments existent dans le DOM, calculer la hauteur basée sur leurs positions réelles
        if (allCategoryElements.length > 0) {
          // Obtenir les dimensions du conteneur et son padding
          const containerRect = categoriesWrapper.value.getBoundingClientRect();
          const containerStyles = window.getComputedStyle(categoriesWrapper.value);
          const paddingTop = parseFloat(containerStyles.paddingTop) || 0;
          
          // Parcourir toutes les catégories pour trouver celle qui est le plus bas
          allCategoryElements.forEach((el) => {
            const elRect = el.getBoundingClientRect();
            
            // Calculer la position Y relative au contenu du conteneur (sans padding)
            // Cette position correspond à state.categoryPositions[categoryId].y
            const relativeY = elRect.top - containerRect.top - paddingTop;
            
            // Obtenir la hauteur RÉELLE de cette catégorie depuis le DOM
            // Cette hauteur varie selon le nombre d'observables dans la catégorie
            const elHeight = elRect.height;
            
            // Calculer la position du bas de la catégorie (Y + hauteur)
            // Si cette position est plus basse que celle qu'on a déjà vue, la garder
            const bottom = relativeY + elHeight;
            if (bottom > maxY + maxHeight) {
              maxY = relativeY;
              maxHeight = elHeight;
            }
          });
        }
        
        // Fallback : si aucune catégorie n'est trouvée dans le DOM (peut arriver lors
        // du premier rendu ou si les catégories ne sont pas encore chargées),
        // utiliser les positions depuis state.categoryPositions
        if (maxHeight === 0) {
          // Parcourir toutes les positions stockées dans le state
          Object.values(state.categoryPositions).forEach(position => {
            if (position.y > maxY) {
              maxY = position.y;
            }
          });
          // Utiliser une hauteur par défaut si on ne peut pas mesurer depuis le DOM
          // Cette valeur est une approximation et sera remplacée dès que les éléments
          // seront rendus dans le DOM
          maxHeight = 250; // Hauteur approximative d'une catégorie moyenne
        }
        
        const contentMin = maxY + maxHeight + 50;
        // Pane height, not `.q-scrollarea` clientHeight: that inner box can
        // shrink when a classic scrollbar appears, which would fight this
        // minHeight and oscillate.
        const viewportH = buttonsScrollWrapper.value?.clientHeight ?? 0;
        // Fill the pane (viewport) so the dashed board isn't a card-sized box;
        // grow past the pane when cards are dragged below so DScrollArea scrolls.
        const nextMin = Math.max(contentMin, viewportH, 300);
        const nextMinPx = `${nextMin}px`;
        if (categoriesWrapper.value.style.minHeight !== nextMinPx) {
          categoriesWrapper.value.style.minHeight = nextMinPx;
        }
      },

      // Calculate grid-based positions for categories
      calculateCategoryPositions: (forceReset = false) => {
        if (!sharedState.currentProtocol || !sharedState.currentProtocol._items) return;
        const items = sharedState.currentProtocol._items
          .filter((item: any) => item.type === ProtocolItemTypeEnum.Category)
          .map((item: any) => item as ProtocolItem);
        let row = 0;
        let column = 0;
        const maxColumns = 2;
        const columnWidth = 220;
        const rowHeight = 250;
        items.forEach((category: ProtocolItem) => {
          if (forceReset || !state.categoryPositions[category.id]) {
            // Check if position is stored in meta
            if (!forceReset && category.meta && category.meta.position) {
              state.categoryPositions[category.id] = category.meta.position;
            } else {
              state.categoryPositions[category.id] = {
                x: column * columnWidth,
                y: row * rowHeight,
              };
            }
          }
          // Charge la largeur personnalisée depuis meta.size (si présente et valide).
          // Le reset ne touche que les positions (pas les tailles) : on recharge donc
          // toujours la taille persistée, même après un reset des positions.
          if (category.meta && category.meta.size && typeof category.meta.size.width === 'number') {
            state.categorySizes[category.id] = { width: category.meta.size.width };
          }
          column++;
          if (column >= maxColumns) {
            column = 0;
            row++;
          }
        });
        methods.updateWrapperHeight();
        void nextTick(() => {
          methods.clampCategoriesInPlateau();
          methods.updateWrapperHeight();
        });
      },

      getDefaultContinuousObservableId: (category: ProtocolItem): string | null => {
        const observables = category.children || [];
        if (category.action !== ProtocolItemActionEnum.Continuous || observables.length === 0) {
          return null;
        }
        const lastObservable = observables[observables.length - 1] as ProtocolItem;
        return (lastObservable?.id as string) || null;
      },

      syncContinuousActiveObservables: () => {
        const nextActiveObservableIdByCategoryId: Record<string, string> = {};
        const currentReadings = readings.sharedState.currentReadings;

        computedState.categories.value.forEach((category: ProtocolItem) => {
          if (category.action !== ProtocolItemActionEnum.Continuous) {
            return;
          }

          const observables = (category.children || []) as ProtocolItem[];
          if (observables.length === 0) {
            return;
          }

          const currentActiveObservableId = state.activeObservableIdByCategoryId[category.id];
          const currentActiveObservableExists = observables.some(
            (observable) => observable.id === currentActiveObservableId
          );
          if (currentActiveObservableId && currentActiveObservableExists) {
            nextActiveObservableIdByCategoryId[category.id] = currentActiveObservableId;
          }

          if (computedState.isRecordingStarted.value) {
            const observableNames = observables.map((observable) => observable.name);
            const lastDataReading = [...currentReadings]
              .reverse()
              .find((reading: IReading) => (
                reading.type === ReadingTypeEnum.DATA
                && !!reading.name
                && observableNames.includes(reading.name)
              ));

            if (lastDataReading?.name) {
              const matchingObservable = observables.find(
                (observable) => observable.name === lastDataReading.name
              );
              if (matchingObservable?.id) {
                nextActiveObservableIdByCategoryId[category.id] = matchingObservable.id as string;
                return;
              }
            }
          }

          if (!nextActiveObservableIdByCategoryId[category.id]) {
            const defaultObservableId = methods.getDefaultContinuousObservableId(category);
            if (defaultObservableId) {
              nextActiveObservableIdByCategoryId[category.id] = defaultObservableId;
            }
          }
        });

        state.activeObservableIdByCategoryId = nextActiveObservableIdByCategoryId;
      },

      // Handle click on switch button (continuous category)
      handleSwitchClick: ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
        const category = computedState.categories.value.find(
          (cat: ProtocolItem) => cat.id === categoryId
        );
        if (!category || category.action !== ProtocolItemActionEnum.Continuous) {
          return;
        }

        const currentActiveObservableId = state.activeObservableIdByCategoryId[categoryId];
        if (currentActiveObservableId === observableId) {
          return;
        }

        state.activeObservableIdByCategoryId[categoryId] = observableId;
        methods.recordReading(categoryId, observableId, category.action);
      },

      // Handle click on press button (discrete category)
      handlePressClick: ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
        const category = computedState.categories.value.find(
          (cat: ProtocolItem) => cat.id === categoryId
        );
        if (!category || category.action !== ProtocolItemActionEnum.Discrete) {
          return;
        }
        methods.recordReading(categoryId, observableId, category.action);
      },

      // Record a new reading
      recordReading: (
        categoryId: string,
        observableId: string,
        action: ProtocolItemActionEnum
      ) => {
        if (action === ProtocolItemActionEnum.Discrete && computedState.isDiscreteDisabled.value) {
          return;
        }
        if (!computedState.canRecordReading.value) {
          if (!computedState.isRecordingStarted.value) {
            $q.notify({
              type: 'warning',
              message: t('observation.startBeforeRecording'),
              timeout: 2500,
            });
          }
          return;
        }

        const category = computedState.categories.value.find(
          (cat: ProtocolItem) => cat.id === categoryId
        );
        if (!category) return;
        const observable = category.children?.find(
          (obs: any) => obs.id === observableId
        ) as ProtocolItem | undefined;
        if (!observable) return;
        readings.methods.addReading({
          categoryName: category.name,
          observableName: observable.name,
          observableDescription: observable.description || '',
          currentDate: observation.sharedState.currentDate || undefined,
          elapsedTime: observation.sharedState.elapsedTime,
        });
      },

      // Handle category movement (drag & drop)
      handleCategoryMove: ({ categoryId, position }: { categoryId: string; position: { x: number; y: number } }) => {
        const currentPos = state.categoryPositions[categoryId];
        if (!currentPos || currentPos.x !== position.x || currentPos.y !== position.y) {
          state.categoryPositions[categoryId] = position;
          methods.updateWrapperHeight();
        }
      },

      /**
       * Sauvegarde la position d'une catégorie dans le backend
       * 
       * Cette fonction est appelée après le déplacement d'une catégorie (drag & drop).
       * Elle sauvegarde uniquement la position dans le champ `meta.position` de la catégorie,
       * sans affecter les autres propriétés (nom, description, action, etc.).
       * 
       * IMPORTANT: Mise à jour partielle
       * - Seul le champ `meta` est envoyé au backend
       * - Le backend préserve automatiquement les autres champs (nom, description, etc.)
       * - Après la sauvegarde, `editProtocolItem` recharge le protocole complet depuis le backend
       * - Le watch sur `sharedState.currentProtocol` mettra à jour les positions depuis `meta`
       * 
       * @param categoryId - ID de la catégorie à sauvegarder
       */
      saveCategoryPosition: async (categoryId: string) => {
        const position = state.categoryPositions[categoryId];
        if (!position) return;

        const category = computedState.categories.value.find((c: ProtocolItem) => c.id === categoryId);
        if (!category || !sharedState.currentProtocol) return;

        try {
          await protocol.methods.editProtocolItem({
            id: categoryId,
            protocolId: sharedState.currentProtocol.id,
            type: ProtocolItemTypeEnum.Category,
            meta: {
              ...(category.meta || {}),
              position
            }
          });
          
          // Note: No need to update locally as editProtocolItem reloads the protocol
          // The reload will trigger the watch which will update positions from meta
        } catch (error) {
          console.error('Failed to save category position:', error);
          $q.notify({
            type: 'negative',
            message: t('observation.positionSaveError'),
            position: 'top-right'
          });
        }
      },

      /**
       * Applique une nouvelle largeur à une catégorie pendant le redimensionnement
       * (drag de la poignée bas-droite). La persistance n'a lieu qu'en fin de drag
       * (handleCategoryResizeEnd -> saveCategorySize) pour éviter un appel backend
       * par pixel.
       */
      handleCategoryResize: ({ categoryId, width }: { categoryId: string; width: number }) => {
        const maxW = methods.getCategoryMaxWidth(categoryId);
        const minW = Math.min(MIN_CATEGORY_WIDTH, maxW);
        const clamped = Math.max(minW, Math.min(maxW, width));
        const current = state.categorySizes[categoryId];
        if (!current || current.width !== clamped) {
          state.categorySizes[categoryId] = { width: clamped };
          methods.updateWrapperHeight();
        }
      },

      // Fin du redimensionnement : on persiste la largeur dans meta.size.
      handleCategoryResizeEnd: (categoryId: string) => {
        methods.saveCategorySize(categoryId);
      },

      /**
       * Sauvegarde la largeur d'une catégorie dans le backend (meta.size.width),
       * en fusionnant avec le meta existant (position, etc.) comme pour la position.
       */
      saveCategorySize: async (categoryId: string) => {
        const size = state.categorySizes[categoryId];
        if (!size) return;

        const category = computedState.categories.value.find((c: ProtocolItem) => c.id === categoryId);
        if (!category || !sharedState.currentProtocol) return;

        try {
          await protocol.methods.editProtocolItem({
            id: categoryId,
            protocolId: sharedState.currentProtocol.id,
            type: ProtocolItemTypeEnum.Category,
            meta: {
              ...(category.meta || {}),
              size: { width: size.width }
            }
          });
        } catch (error) {
          console.error('Failed to save category size:', error);
          $q.notify({
            type: 'negative',
            message: t('observation.sizeSaveError'),
            position: 'top-right'
          });
        }
      },

      // --- UI scale (taille des boutons) ---

      setUiScale: (value: number) => {
        const clamped = Math.round(Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, value)) * 100) / 100;
        state.uiScale = clamped;
        try {
          localStorage.setItem(UI_SCALE_STORAGE_KEY, String(clamped));
        } catch (_) {
          /* ignore quota / privacy mode */
        }
        void nextTick(() => {
          methods.clampCategoriesInPlateau();
          methods.updateWrapperHeight();
        });
      },
      increaseUiScale: () => {
        methods.setUiScale(state.uiScale + UI_SCALE_STEP);
        methods.schedulePersistUiScale();
      },
      decreaseUiScale: () => {
        methods.setUiScale(state.uiScale - UI_SCALE_STEP);
        methods.schedulePersistUiScale();
      },

      /**
       * Diffère la persistance du uiScale dans observation.meta pour n'émettre
       * qu'un seul appel API par rafale de clics +/- (debounce). L'UI réagit
       * immédiatement (setUiScale est synchrone), seul l'write backend est
       * retardé.
       */
      schedulePersistUiScale: () => {
        if (persistUiScaleTimer !== null) {
          window.clearTimeout(persistUiScaleTimer);
        }
        persistUiScaleTimer = window.setTimeout(() => {
          persistUiScaleTimer = null;
          void methods.persistUiScaleToObservation();
        }, PERSIST_UI_SCALE_DEBOUNCE_MS);
      },

      /**
       * Persiste la taille globale courante (uiScale) dans observation.meta
       * pour la retenir par chronic (export jchronic + réouverture).
       * No-op si aucune observation n'est chargée. Échec non bloquant.
       */
      persistUiScaleToObservation: async () => {
        const current = observation.sharedState.currentObservation;
        if (!current?.id) return;

        const nextMeta = {
          ...(current.meta ?? {}),
          uiScale: state.uiScale,
        };

        // Mise à jour optimiste du state local (évite rebond du watcher).
        observation.sharedState.currentObservation = {
          ...current,
          meta: nextMeta,
        };

        try {
          const updated = await observationService.update(current.id, {
            meta: { uiScale: state.uiScale },
          });
          // Conserver uniquement la meta renvoyée par l'API (fusion côté
          // backend). On n'écrase PAS le reste de currentObservation
          // (protocol/readings/user ne sont pas rechargés par l'endpoint
          // update et seraient perdus si on spreadait tout `updated`).
          if (updated?.meta) {
            observation.sharedState.currentObservation = {
              ...observation.sharedState.currentObservation,
              meta: updated.meta,
            } as typeof observation.sharedState.currentObservation;
          }
        } catch (error) {
          console.error('Failed to persist uiScale to observation meta:', error);
        }
      },

      // Ouvre le panneau des boutons en fenêtre séparée (délégué au parent).
      handlePopout: () => {
        if (props.popoutHandler) {
          props.popoutHandler();
        }
      },

      // Get styles for a category
      getCategoryStyle: (categoryId: string) => {
        const position = state.categoryPositions[categoryId] || { x: 0, y: 0 };
        return {
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${methods.getCategoryWidth(categoryId)}px`,
          transition: state.isDragging ? 'none' : 'left 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
          zIndex: state.isDragging && state.isDraggingCategoryId === categoryId ? '100' : '1',
        } as Record<string, string>;
      },

      // Largeur effective d'une catégorie : valeur personnalisée persistée sinon défaut.
      // Max = largeur du plateau restante à droite de la position x (cartes
      // en `position: absolute` : origine = padding box, pas le content box).
      getPlateauBoxWidth: (): number => {
        if (categoriesWrapper.value) {
          return categoriesWrapper.value.clientWidth;
        }
        return state.containerWidth > 0 ? state.containerWidth : MAX_CATEGORY_WIDTH;
      },

      // Largeur max d'une carte : elle doit tenir dans le plateau à sa position x.
      // Max width that still fits at this card's x. May be below MIN_CATEGORY_WIDTH
      // when the pane itself is narrower than the usual minimum.
      getCategoryMaxWidth: (categoryId?: string): number => {
        const boxW = methods.getPlateauBoxWidth();
        const x = categoryId
          ? (state.categoryPositions[categoryId]?.x ?? 0)
          : 0;
        const remaining = Math.max(0, boxW - Math.max(0, x));
        const fit = remaining > 0 ? remaining : boxW;
        return Math.max(0, Math.min(MAX_CATEGORY_WIDTH, fit));
      },
      getCategoryWidth: (categoryId: string): number => {
        const maxW = methods.getCategoryMaxWidth(categoryId);
        const minW = Math.min(MIN_CATEGORY_WIDTH, maxW);
        const stored = state.categorySizes[categoryId];
        if (stored && typeof stored.width === 'number' && !isNaN(stored.width)) {
          return Math.max(minW, Math.min(maxW, stored.width));
        }
        return Math.max(minW, Math.min(maxW, DEFAULT_CATEGORY_WIDTH));
      },

      schedulePersistClampedPositions: (categoryIds: string[]) => {
        if (state.isDragging || state.isResetting) {
          return;
        }
        categoryIds.forEach((id) => pendingClampPersistIds.add(id));
        if (persistClampTimer !== null) {
          window.clearTimeout(persistClampTimer);
        }
        persistClampTimer = window.setTimeout(() => {
          persistClampTimer = null;
          const ids = Array.from(pendingClampPersistIds);
          pendingClampPersistIds.clear();
          ids.forEach((id) => {
            void methods.saveCategoryPosition(id);
          });
        }, PERSIST_CLAMP_DEBOUNCE_MS);
      },

      // Pull overflowing cards back inside the dashed plateau (x only;
      // y grows the wrapper via updateWrapperHeight).
      clampCategoriesInPlateau: () => {
        const wrapper = categoriesWrapper.value;
        if (!wrapper) return;

        const boxW = wrapper.clientWidth;
        const movedIds: string[] = [];

        computedState.categories.value.forEach((category: ProtocolItem) => {
          const pos = state.categoryPositions[category.id] || { x: 0, y: 0 };
          const el = wrapper.querySelector(
            `.category-container[data-category-id="${CSS.escape(category.id)}"]`,
          ) as HTMLElement | null;
          const cardWidth = el
            ? el.getBoundingClientRect().width
            : methods.getCategoryWidth(category.id);
          const maxX = Math.max(0, Math.floor(boxW - cardWidth));
          const nextX = Math.min(Math.max(0, Math.round(pos.x)), maxX);
          const nextY = Math.max(0, Math.round(pos.y));
          if (nextX !== pos.x || nextY !== pos.y) {
            state.categoryPositions[category.id] = { x: nextX, y: nextY };
            movedIds.push(category.id);
          }
        });

        if (movedIds.length > 0) {
          methods.updateWrapperHeight();
          methods.schedulePersistClampedPositions(movedIds);
        }
      },

      // Update dragging state when Category component signals drag
      updateDraggingState: (categoryId: string, isDrag: boolean) => {
        state.isDragging = isDrag;
        state.isDraggingCategoryId = isDrag ? categoryId : null;
        
        // If drag ended, save the position
        if (!isDrag) {
          methods.saveCategoryPosition(categoryId);
        }
      },

      // Resets all categories to their original grid positions
      resetPositions: () => {
        if (state.isResetting || !sharedState.currentProtocol) return;
        const currentProtocolId = sharedState.currentProtocol.id;
        state.isResetting = true;
        Object.keys(state.categoryPositions).forEach(key => {
          delete state.categoryPositions[key];
        });
        
        // Reset positions in backend for all categories
        const promises = computedState.categories.value.map(async (category: ProtocolItem) => {
          if (category.meta && category.meta.position) {
            const newMeta = { ...category.meta };
            delete newMeta.position;
            
            await protocol.methods.editProtocolItem({
              id: category.id,
              protocolId: currentProtocolId,
              type: ProtocolItemTypeEnum.Category,
              meta: newMeta
            });
            
            // Update local state
            category.meta = newMeta;
          }
        });
        
        Promise.all(promises).then(() => {
          methods.calculateCategoryPositions(true);
          setTimeout(() => {
            state.isDragging = false;
            state.isDraggingCategoryId = null;
            $q.notify({
              type: 'positive',
              message: t('observation.categoriesResetSuccess'),
              position: 'top-right',
              timeout: 2000,
            });
            state.isResetting = false;
          }, RESET_POSITIONS_SETTLE_MS);
        }).catch(error => {
          console.error('Failed to reset positions:', error);
          state.isResetting = false;
          $q.notify({
            type: 'negative',
            message: t('observation.resetCategoriesError'),
            position: 'top-right'
          });
        });
      },

      createInitialContinuousReadingsForCurrentStart: () => {
        const allReadings = readings.sharedState.currentReadings;
        const lastStartReading = [...allReadings]
          .reverse()
          .find((reading: IReading) => reading.type === ReadingTypeEnum.START);
        if (!lastStartReading) {
          return;
        }

        const startSignature = String(
          lastStartReading.id
          || lastStartReading.tempId
          || new Date(lastStartReading.dateTime).toISOString()
        );
        if (state.lastInitializedStartSignature === startSignature) {
          return;
        }

        const startDate = new Date(lastStartReading.dateTime);
        const startTimestamp = startDate.getTime();

        // Ensure insertion at end for the startup DATA readings.
        readings.methods.selectReading(null);

        computedState.categories.value.forEach((category: ProtocolItem) => {
          if (category.action !== ProtocolItemActionEnum.Continuous || !category.children?.length) {
            return;
          }

          const observables = category.children as ProtocolItem[];
          const activeObservableId = state.activeObservableIdByCategoryId[category.id]
            || methods.getDefaultContinuousObservableId(category);
          const activeObservable = observables.find((observable) => observable.id === activeObservableId);
          if (!activeObservable) {
            return;
          }

          state.activeObservableIdByCategoryId[category.id] = activeObservable.id as string;

          const hasReadingForThisStart = allReadings.some((reading: IReading) => (
            reading.type === ReadingTypeEnum.DATA
            && reading.name === activeObservable.name
            && new Date(reading.dateTime).getTime() === startTimestamp
          ));
          if (hasReadingForThisStart) {
            return;
          }

          readings.methods.addReading({
            categoryName: category.name,
            observableName: activeObservable.name,
            observableDescription: activeObservable.description || '',
            dateTime: startDate,
          });
        });

        state.lastInitializedStartSignature = startSignature;
      },
    };

    // Initialize category positions when protocol changes
    watch(() => sharedState.currentProtocol, (newProtocol) => {
      if (newProtocol && newProtocol._items) {
        state.lastInitializedStartSignature = null;
        // Initialize positions if not already set
        methods.calculateCategoryPositions();
        methods.syncContinuousActiveObservables();
      }
    }, { immediate: true });

    // Ensure protocol is loaded when observation is loaded
    watch(() => observation.sharedState.currentObservation, async (newObservation) => {
      if (newObservation && !sharedState.currentProtocol) {
        // Observation is loaded but protocol is not, load it
        await protocol.methods.loadProtocol(newObservation);
      }
    }, { immediate: true });

    // Restaure la taille globale (uiScale) depuis observation.meta quand une
    // chronic est chargée. Compat ascendante : si la chronic n'a pas de
    // meta.uiScale (ancienne chronic), on garde la valeur courante (préf
    // appareil via localStorage). La restauration n'écrit PAS en backend
    // (setUiScale est local) pour éviter une boucle avec persistUiScale.
    watch(
      () => observation.sharedState.currentObservation?.meta?.uiScale,
      (uiScaleFromMeta) => {
        if (
          typeof uiScaleFromMeta === 'number' &&
          Number.isFinite(uiScaleFromMeta)
        ) {
          methods.setUiScale(uiScaleFromMeta);
        }
      },
      { immediate: true },
    );

    // Update wrapper height based on category positions
    watch(state.categoryPositions, () => {
      methods.updateWrapperHeight();
    }, { deep: true });

    // Keep active continuous observable per category synced with protocol/readings.
    watch(
      () => readings.sharedState.currentReadings,
      () => {
        methods.syncContinuousActiveObservables();
      },
      { deep: true }
    );

    // Single onMounted hook consolidating all initialization logic
    // IMPORTANT: This consolidates what was previously split across two onMounted hooks
    // to avoid duplicate event listener registration (memory leak bug fix)
    // Observe la largeur du conteneur pour réappliquer dynamiquement la borne
    // max des catégories quand le splitter / la fenêtre est redimensionné.
    let containerWidthObserver: ResizeObserver | null = null;
    let paneHeightObserver: ResizeObserver | null = null;

    onMounted(() => {
      // Restore UI scale from previous session (boutons).
      // On n'écrase la valeur restaurée depuis observation.meta (via le
      // watcher immédiat ci-dessus) que si la chronic n'a pas de uiScale
      // sauvegardé (ancienne chronic => fallback sur la prefs appareil).
      const metaUiScale = observation.sharedState.currentObservation?.meta?.uiScale;
      const hasMetaUiScale =
        typeof metaUiScale === 'number' && Number.isFinite(metaUiScale);
      if (!hasMetaUiScale) {
        try {
          const stored = localStorage.getItem(UI_SCALE_STORAGE_KEY);
          if (stored) {
            const value = parseFloat(stored);
            if (Number.isFinite(value)) {
              state.uiScale = Math.max(UI_SCALE_MIN, Math.min(UI_SCALE_MAX, value));
            }
          }
        } catch (_) {
          /* ignore */
        }
      }

      // Initialize category positions
      methods.calculateCategoryPositions();
      methods.updateWrapperHeight();
      void nextTick(() => {
        methods.clampCategoriesInPlateau();
        methods.updateWrapperHeight();
      });

      if (buttonsScrollWrapper.value && typeof ResizeObserver !== 'undefined') {
        paneHeightObserver = new ResizeObserver(() => {
          methods.updateWrapperHeight();
        });
        paneHeightObserver.observe(buttonsScrollWrapper.value);
      }

      // Suivi réactif de la largeur du conteneur (borne max des catégories).
      if (categoriesWrapper.value && typeof ResizeObserver !== 'undefined') {
        state.containerWidth = categoriesWrapper.value.clientWidth;
        containerWidthObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (entry) {
            state.containerWidth = Math.round(entry.contentRect.width);
            void nextTick(() => {
              methods.clampCategoriesInPlateau();
              methods.updateWrapperHeight();
            });
          }
        });
        containerWidthObserver.observe(categoriesWrapper.value);
      }

      // Set up event listener for video reading active (only once)
      window.addEventListener('video-reading-active', handleVideoReadingActive as EventListener);
    });

    // Single onUnmounted hook for cleanup
    onUnmounted(() => {
      // Remove event listener (only registered once, so only remove once)
      window.removeEventListener('video-reading-active', handleVideoReadingActive as EventListener);
      if (containerWidthObserver) {
        containerWidthObserver.disconnect();
        containerWidthObserver = null;
      }
      if (paneHeightObserver) {
        paneHeightObserver.disconnect();
        paneHeightObserver = null;
      }
      // Annule un éventuel write uiScale en attente (debounce) pour éviter
      // un appel API / une mutation du store après démontage.
      if (persistUiScaleTimer !== null) {
        window.clearTimeout(persistUiScaleTimer);
        persistUiScaleTimer = null;
      }
      if (persistClampTimer !== null) {
        window.clearTimeout(persistClampTimer);
        persistClampTimer = null;
        pendingClampPersistIds.clear();
      }
    });

    // Trigger initial continuous readings at each START event.
    watch(() => observation.sharedState.isPlaying, (playing, prev) => {
      if (playing && !prev) {
        methods.createInitialContinuousReadingsForCurrentStart();
      }
    });

    return {
      sharedState,
      observation,
      state,
      computedState,
      categoriesWrapper,
      buttonsScrollWrapper,
      methods,
      UI_SCALE_MIN,
      UI_SCALE_MAX,
    };
  }
});
</script>

<style scoped>
/* Voile "En pause" (mode calendrier uniquement) : mêmes couleurs que le badge
   de CalendarToolbar (ambre), pour un signal visuel cohérent et distinct du
   bleu (reprendre) / rouge (pause pendant l'enregistrement actif). */
.paused-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background-color: rgba(252, 252, 252, 0.82);
  backdrop-filter: blur(1px);
  color: #854f0b;
  text-align: center;
  pointer-events: none;
}

.body--dark .paused-overlay {
  background-color: rgba(20, 26, 36, 0.82);
  color: #faeeda;
}

.paused-overlay-title {
  font-size: 15px;
  font-weight: 500;
}

.paused-overlay-subtitle {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.body--dark .paused-overlay-subtitle {
  color: rgba(255, 255, 255, 0.75);
}

.buttons-side-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Header du dashboard : titre tronquable (ellipsis) si le panneau est étroit. */
.observation-panel-title-row {
  min-height: 32px;
  flex-wrap: nowrap;
}

.dashboard-header {
  flex-wrap: nowrap;
}

.dashboard-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

:deep(.q-scrollarea) {
  flex: 1 1 auto;
  min-height: 0;
}

.categories-wrapper {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  border: 1px dashed #ddd;
  border-radius: 8px;
  padding: 16px;
  background-color: #fcfcfc;
  min-height: 100%;
  box-sizing: border-box;
}

/* Vertical icon rail, same surface as graph `.zoom-controls`. */
.board-layout-group {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--neutral-low, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 4px 2px;
}

.board-layout-group :deep(.q-separator) {
  width: 18px;
  align-self: center;
  margin: 4px 0;
}

.body--dark .board-layout-group {
  background-color: var(--secondary);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

/* Thème sombre : fond du panneau adapté au thème (var(--secondary), gris-bleu foncé)
   au lieu du gris clair fixe qui restait blanc quel que soit le thème */
.body--dark .categories-wrapper {
  background-color: var(--secondary);
  border-color: rgba(255, 255, 255, 0.15);
}

.no-data {
  color: #777;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 0;
  padding: 2rem;
}

.body--dark .no-data {
  color: rgba(255, 255, 255, 0.6);
}

.body--dark .no-data .q-icon {
  color: rgba(255, 255, 255, 0.6) !important;
}

.no-protocol-link {
  color: var(--accent);
  text-decoration: underline;
  font-weight: 500;
}

.no-protocol-cta {
  background: #fff;
  border-radius: 0.5rem;
  font-weight: 500;
}

.body--dark .no-protocol-cta {
  background: transparent;
}

.body--dark .board-layout-group .q-btn.text-grey-8 {
  color: rgba(255, 255, 255, 0.7) !important;
}
</style>
