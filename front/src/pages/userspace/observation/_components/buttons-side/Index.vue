<template>
  <div class="buttons-side-container q-pa-sm column fit">
    <div class="col-auto text-h6 q-mb-sm row items-center dashboard-header">
      <div class="col dashboard-title">
        {{ $t('observation.observationDashboardTitle') }}
      </div>
      <div class="col-auto row items-center q-gutter-xs header-actions">
        <q-btn
          flat
          round
          dense
          icon="mdi-magnify-minus"
          size="sm"
          class="ui-scale-btn"
          :disable="state.uiScale <= UI_SCALE_MIN"
          :title="$t('observation.uiScaleDecreaseTooltip')"
          @click="methods.decreaseUiScale()"
        />
        <q-btn
          flat
          round
          dense
          icon="mdi-magnify-plus"
          size="sm"
          class="ui-scale-btn"
          :disable="state.uiScale >= UI_SCALE_MAX"
          :title="$t('observation.uiScaleIncreaseTooltip')"
          @click="methods.increaseUiScale()"
        />
        <q-btn
          class="reset-categories-btn"
          :icon="state.isResetting ? 'mdi-loading mdi-spin' : 'mdi-restart'"
          :color="state.isResetting ? 'accent' : 'grey-7'"
          flat
          round
          dense
          size="sm"
          :disable="state.isResetting"
          :tooltip="$t('observation.resetCategoriesTooltip')"
          @click="methods.resetPositions()"
        />
        <q-btn
          v-if="popoutHandler"
          flat
          round
          dense
          size="sm"
          icon="open_in_new"
          class="popout-btn-inline"
          :disable="!observation.sharedState.currentObservation?.id"
          :title="$t('observation.popoutButtonsTooltip')"
          @click="methods.handlePopout()"
        />
      </div>
    </div>

    <DScrollArea class="col" style="min-height: 0;">
      <div class="categories-wrapper"
        ref="categoriesWrapper"
        :style="{ '--ui-scale': state.uiScale }"
      >
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
          <div class="text-caption q-mt-xs">{{ $t('observation.noProtocolLoadedHint') }}</div>
        </div>
      </div>
    </DScrollArea>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted, watch, PropType } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { observationService } from '@services/observations/index.service';
import { ProtocolItem, ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { isRecordingActiveFromReadings } from '@actograph/core';
import Category from './Category.vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { DScrollArea } from '@lib-improba/components/app/scroll-areas';

// Largeur par défaut / bornes des boîtes catégories (px).
// 220px ≈ 13.75rem, proche du 13rem historique.
const DEFAULT_CATEGORY_WIDTH = 220;
const MIN_CATEGORY_WIDTH = 160;
const MAX_CATEGORY_WIDTH = 600;

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
  },

  props: {
    // Handler pour ouvrir le panneau des boutons en fenêtre séparée (pop-out).
    // Fourni par le parent (observation/Index.vue). Mis dans le header pour
    // aligner l'icône pop-out avec les autres actions du dashboard.
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

    const canRecordReading = computed(
      () => isRecordingStarted.value && observation.sharedState.isPlaying
    );

    const computedState = {
      isRecordingStarted,
      isPaused: computed(() => isRecordingStarted.value && !observation.sharedState.isPlaying),
      canRecordReading,
      // Bug 2.3 / 2.4: les boutons doivent rester utilisables
      // même sans START explicite et en pause.
      isContinuousDisabled: computed(() => false),
      isDiscreteDisabled: computed(() => false),
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

    const methods = {
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
        
        // Calculer la hauteur minimale nécessaire pour le conteneur
        // Formule : position Y la plus basse + hauteur de cette catégorie + marge inférieure
        const minHeight = maxY + maxHeight + 50; // 50px de marge pour le confort visuel
        
        // Appliquer la hauteur minimale au conteneur
        // On utilise Math.max pour garantir une hauteur minimale de 300px même si toutes
        // les catégories sont en haut (pour éviter un conteneur trop petit)
        // Cette hauteur permet le scroll vertical quand les catégories sont déplacées vers le bas
        categoriesWrapper.value.style.minHeight = `${Math.max(minHeight, 300)}px`;
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
        const maxW = methods.getCategoryMaxWidth();
        const clamped = Math.max(MIN_CATEGORY_WIDTH, Math.min(maxW, width));
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
      // Bornée à [MIN, max dynamique] où max = largeur du conteneur (pour éviter
      // qu'une catégorie déborde horizontalement du panneau).
      getCategoryMaxWidth: (): number => {
        const containerWidth = state.containerWidth;
        if (containerWidth > 0) {
          return Math.max(MIN_CATEGORY_WIDTH, Math.min(MAX_CATEGORY_WIDTH, containerWidth - 16));
        }
        return MAX_CATEGORY_WIDTH;
      },
      getCategoryWidth: (categoryId: string): number => {
        const stored = state.categorySizes[categoryId];
        const maxW = methods.getCategoryMaxWidth();
        if (stored && typeof stored.width === 'number' && !isNaN(stored.width)) {
          return Math.max(MIN_CATEGORY_WIDTH, Math.min(maxW, stored.width));
        }
        return Math.min(maxW, DEFAULT_CATEGORY_WIDTH);
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
          }, 600);
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

      // Suivi réactif de la largeur du conteneur (borne max des catégories).
      if (categoriesWrapper.value && typeof ResizeObserver !== 'undefined') {
        state.containerWidth = categoriesWrapper.value.clientWidth;
        containerWidthObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (entry) {
            state.containerWidth = Math.round(entry.contentRect.width);
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
      // Annule un éventuel write uiScale en attente (debounce) pour éviter
      // un appel API / une mutation du store après démontage.
      if (persistUiScaleTimer !== null) {
        window.clearTimeout(persistUiScaleTimer);
        persistUiScaleTimer = null;
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
      methods,
      UI_SCALE_MIN,
      UI_SCALE_MAX,
    };
  }
});
</script>

<style scoped>
.buttons-side-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Header du dashboard : titre tronquable (ellipsis) pour que les actions
   (zoom ±, reset, pop-out) restent toujours visibles même si le panneau
   est étroit (splitter réduit). */
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
  border: 1px dashed #ddd;
  border-radius: 8px;
  padding: 16px;
  background-color: #fcfcfc;
  min-height: 100%;
  box-sizing: border-box;
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

/* Bouton "reset" : au repos Quasar applique .text-grey-7 (gris fixe #616161,
   ~2.4:1 sur fond sombre). En thème sombre on le passe en blanc semi-transparent.
   Limité à .text-grey-7 pour ne pas écraser la variante accent pendant le reset. */
.body--dark .reset-categories-btn.text-grey-7 {
  color: rgba(255, 255, 255, 0.7) !important;
}
</style>
