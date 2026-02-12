<template>
  <div class="buttons-side-container q-pa-sm column fit">
    <div class="col-auto text-h6 q-mb-sm row">
      <div class="col-auto">
        Tableau de bord d'observation
      </div>
      <q-space />
      <div class="col-auto">
        <q-btn 
          :icon="state.isResetting ? 'mdi-loading mdi-spin' : 'mdi-restart'" 
          :color="state.isResetting ? 'accent' : 'grey-7'"
          flat
          round
          dense
          :disable="state.isResetting"
          tooltip="Réinitialiser la position des catégories et observables"
          @click="methods.resetPositions()"
        />
      </div>
    </div>

    <DScrollArea class="col" style="min-height: 0;">
      <div class="categories-wrapper" 
        ref="categoriesWrapper">
      <template v-if="sharedState.currentProtocol && sharedState.currentProtocol._items && computedState.categories.value.length > 0">
        <Category
          v-for="category in computedState.categories.value"
          :key="category.id"
            :category="category"
            :active-observable-id-by-category-id="state.activeObservableIdByCategoryId"
            :position="state.categoryPositions[category.id] || { x: 0, y: 0 }"
            :is-observation-active="computedState.isObservationActive.value"
            :style="methods.getCategoryStyle(category.id)"
            @switch-click="methods.handleSwitchClick"
            @press-click="methods.handlePressClick"
            @move="methods.handleCategoryMove"
            @drag-start="(id) => methods.updateDraggingState(id, true)"
            @drag-end="(id) => methods.updateDraggingState(id, false)"
          />
        </template>
        <div v-else class="no-data text-center q-pa-lg">
          <q-icon name="info" size="2rem" color="grey-7" />
          <div class="text-subtitle1 q-mt-sm">Aucun protocole chargé</div>
          <div class="text-caption q-mt-xs">Veuillez sélectionner une observation pour afficher son protocole.</div>
        </div>
      </div>
    </DScrollArea>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { ProtocolItem, ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { ReadingTypeEnum } from '@services/observations/interface';
import Category from './Category.vue';
import { useQuasar } from 'quasar';
import { DScrollArea } from '@lib-improba/components/app/scroll-areas';

export default defineComponent({
  name: 'ButtonsSideIndex',

  components: {
    Category,
    DScrollArea,
  },

  setup() {
    const $q = useQuasar();
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
      isDragging: false,
      isDraggingCategoryId: null as string | null,
      hasInitializedStartReadings: false,
    });
    
    // Listen for video reading active events to auto-activate buttons
    const handleVideoReadingActive = (event: CustomEvent) => {
      const readingsByCategory = event.detail.readingsByCategory;
      
      if (!readingsByCategory) {
        // Clear all active buttons if no data
        Object.keys(state.activeObservableIdByCategoryId).forEach(key => {
          delete state.activeObservableIdByCategoryId[key];
        });
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
    // Bug 2.4 : Boutons cliquables en enregistrement ou pause
    // Bug 2.3 : Boutons toujours cliquables (mode test sans enregistrement)
    const computedState = {
      isObservationActive: computed(() => true), // Toujours actifs pour permettre clics en mode test
      isRecording: computed(() => observation.isActive.value), // Pour savoir si on crée des relevés
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
          column++;
          if (column >= maxColumns) {
            column = 0;
            row++;
          }
        });
        methods.updateWrapperHeight();
      },

      // Handle click on switch button (continuous category)
      // Bug 2.4 : en pause, le clic crée un relevé en vidéo, changement visuel en in situ
      // Bug 2.3 : sans enregistrement, clic possible pour tester (changement visuel seulement)
      handleSwitchClick: ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
        if (state.activeObservableIdByCategoryId[categoryId] === observableId) {
          delete state.activeObservableIdByCategoryId[categoryId];
        } else {
          state.activeObservableIdByCategoryId[categoryId] = observableId;
        }
        methods.recordReading(categoryId, observableId);
      },

      // Handle click on press button (discrete category)
      // Bug 2.4 : en pause, le clic crée un relevé en vidéo
      // Bug 2.3 : sans enregistrement, clic possible pour tester (pas de relevé)
      handlePressClick: ({ categoryId, observableId }: { categoryId: string; observableId: string }) => {
        methods.recordReading(categoryId, observableId);
      },

      showObservationInactiveNotification: () => {
        $q.notify({
          type: 'warning',
          message: 'Veuillez commencer l\'enregistrement avant d\'utiliser les boutons',
          position: 'top-right',
          timeout: 2000,
        });
      },

      // Record a new reading
      // Bug 2.3 : Sans enregistrement (elapsedTime=0) : pas de relevé, changement visuel seulement
      // Bug 2.4 : En pause + in situ : ne pas créer de relevé. En pause + vidéo : créer un relevé.
      recordReading: (categoryId: string, observableId: string) => {
        const isRecording = computedState.isRecording.value;
        const isPaused = !observation.sharedState.isPlaying && observation.sharedState.elapsedTime > 0;
        const isVideoMode = observation.isChronometerMode.value && !!observation.sharedState.currentObservation?.videoPath;

        if (!isRecording) {
          // Bug 2.3 : Sans enregistrement - pas de relevé
          return;
        }
        if (isPaused && !isVideoMode) {
          // Bug 2.4 : En in situ en pause : ne pas créer de relevé
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

        const category = computedState.categories.value.find(c => c.id === categoryId);
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
            message: 'Erreur lors de la sauvegarde de la position',
            position: 'top-right'
          });
        }
      },

      // Get styles for a category
      getCategoryStyle: (categoryId: string) => {
        const position = state.categoryPositions[categoryId] || { x: 0, y: 0 };
        return {
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '13rem',
          transition: state.isDragging ? 'none' : 'left 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
          zIndex: state.isDragging && state.isDraggingCategoryId === categoryId ? '100' : '1',
        } as Record<string, string>;
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
        const promises = computedState.categories.value.map(async (category) => {
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
              message: 'Les catégories ont été réinitialisées',
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
            message: 'Erreur lors de la réinitialisation',
            position: 'top-right'
          });
        });
      },

      // Initialize readings for continuous categories on first start
      createInitialContinuousReadingsIfNeeded: () => {
        if (state.hasInitializedStartReadings) return;
        if (readings.sharedState.currentReadings.length !== 1) return;
        const first = readings.sharedState.currentReadings[0];
        if (!first || first.type !== ReadingTypeEnum.START) return;
        const startDate = first.dateTime;
        // ensure insertion at end
        readings.methods.selectReading(null);
        computedState.categories.value.forEach((category: ProtocolItem) => {
          if (category.action === ProtocolItemActionEnum.Continuous && category.children && category.children.length > 0) {
            const lastObservable = category.children[category.children.length - 1] as ProtocolItem;
            // Mark button active
            state.activeObservableIdByCategoryId[category.id] = lastObservable.id as unknown as string;
            // Add reading with the same timestamp as start
            readings.methods.addReading({
              categoryName: category.name,
              observableName: (lastObservable as any).name,
              observableDescription: (lastObservable as any).description || '',
              dateTime: startDate,
            });
          }
        });
        state.hasInitializedStartReadings = true;
      },
    };

    // Initialize category positions when protocol changes
    watch(() => sharedState.currentProtocol, (newProtocol) => {
      if (newProtocol && newProtocol._items) {
        // Reset active observables
        Object.keys(state.activeObservableIdByCategoryId).forEach(key => {
          delete state.activeObservableIdByCategoryId[key];
        });
        state.hasInitializedStartReadings = false;
        // Initialize positions if not already set
        methods.calculateCategoryPositions();
      }
    }, { immediate: true });

    // Ensure protocol is loaded when observation is loaded
    watch(() => observation.sharedState.currentObservation, async (newObservation) => {
      if (newObservation && !sharedState.currentProtocol) {
        // Observation is loaded but protocol is not, load it
        await protocol.methods.loadProtocol(newObservation);
      }
    }, { immediate: true });

    // Update wrapper height based on category positions
    watch(state.categoryPositions, () => {
      methods.updateWrapperHeight();
    }, { deep: true });

    // Single onMounted hook consolidating all initialization logic
    // IMPORTANT: This consolidates what was previously split across two onMounted hooks
    // to avoid duplicate event listener registration (memory leak bug fix)
    onMounted(() => {
      // Initialize category positions
      methods.calculateCategoryPositions();
      methods.updateWrapperHeight();
      
      // Set up event listener for video reading active (only once)
      window.addEventListener('video-reading-active', handleVideoReadingActive as EventListener);
    });
    
    // Single onUnmounted hook for cleanup
    onUnmounted(() => {
      // Remove event listener (only registered once, so only remove once)
      window.removeEventListener('video-reading-active', handleVideoReadingActive as EventListener);
    });

    // Trigger initial continuous readings when starting from zero
    watch(() => observation.sharedState.isPlaying, (playing, prev) => {
      if (playing && !state.hasInitializedStartReadings) {
        methods.createInitialContinuousReadingsIfNeeded();
      }
    });

    return {
      sharedState,
      observation,
      state,
      computedState,
      categoriesWrapper,
      methods,
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
</style>
