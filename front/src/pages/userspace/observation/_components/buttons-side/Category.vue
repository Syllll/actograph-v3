<template>
  <q-card
    class="category-container"
    :class="{ 'is-dragging': state.isDragging }"
  >
    <q-card-section class="category-header">
      <div class="category-title">
        <q-btn
          flat
          dense
          round
          icon="drag_indicator"
          class="drag-handle"
          @mousedown="methods.handleDragStart"
          @touchstart.prevent="methods.handleDragStart"
        />
        <div class="text-subtitle1 q-ml-sm">{{ category.name }}</div>
      </div>
      <div v-if="category.description" class="category-description text-caption q-mt-xs">
        {{ category.description }}
      </div>
    </q-card-section>

    <q-card-section class="category-content">
      <div v-if="computedState.isContinuous.value" class="buttons-container row q-gutter-y-sm">
        <SwitchButton
          v-for="observable in category.children"
          :key="observable.id"
          :observable="observable"
          :active="computedState.activeObservableId.value === observable.id"
          :disabled="!isObservationActive"
          @click="methods.handleSwitchClick(observable)"
        />
      </div>
      
      <div v-else class="buttons-container column q-gutter-y-sm">
        <PressButton
          v-for="observable in category.children"
          :key="observable.id"
          :observable="observable"
          :disabled="!isObservationActive"
          @click="methods.handlePressClick(observable)"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, computed, PropType, reactive } from 'vue';
import { ProtocolItem, ProtocolItemActionEnum } from '@services/observations/protocol.service';
import SwitchButton from './SwitchButton.vue';
import PressButton from './PressButton.vue';

export default defineComponent({
  name: 'CategoryComponent',

  components: {
    SwitchButton,
    PressButton
  },

  props: {
    category: {
      type: Object as PropType<ProtocolItem>,
      required: true
    },
    activeObservableIdByCategoryId: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({})
    },
    position: {
      type: Object as PropType<{ x: number, y: number }>,
      default: () => ({ x: 0, y: 0 })
    },
    isObservationActive: {
      type: Boolean,
      default: false
    }
  },

  emits: ['switchClick', 'pressClick', 'move', 'dragStart', 'dragEnd'],

  setup(props, { emit }) {
    const state = reactive({
      isDragging: false,
      dragStartPos: { x: 0, y: 0 },
      dragOffset: { x: 0, y: 0 },
      initialPosition: { x: 0, y: 0 }
    });

    const computedState = {
      isContinuous: computed(() => {
        return props.category.action === ProtocolItemActionEnum.Continuous;
      }),
      activeObservableId: computed(() => {
        return props.activeObservableIdByCategoryId[props.category.id] || null;
      })
    };

    const methods = {
      handleSwitchClick: (observable: ProtocolItem) => {
        emit('switchClick', {
          categoryId: props.category.id,
          observableId: observable.id
        });
      },
      handlePressClick: (observable: ProtocolItem) => {
        emit('pressClick', {
          categoryId: props.category.id,
          observableId: observable.id
        });
      },
      /**
       * Gère le mouvement de la souris/touch pendant le drag d'une catégorie.
       * 
       * Cette fonction calcule la nouvelle position de la catégorie en fonction du mouvement
       * de la souris/touch et applique des contraintes pour empêcher la catégorie de sortir
       * des limites du conteneur.
       * 
       * IMPORTANT : Les catégories ont des hauteurs variables selon le nombre d'observables
       * qu'elles contiennent. Cette fonction utilise les dimensions réelles de chaque carte
       * depuis le DOM plutôt que des valeurs fixes pour garantir un comportement correct.
       * 
       * @param event - Événement de souris ou touch
       */
      handleDragMove: (event: MouseEvent | TouchEvent) => {
        if (!state.isDragging) return;

        // Empêcher le comportement par défaut (scroll, sélection de texte, etc.)
        if ((event as Event).cancelable) {
          (event as Event).preventDefault();
        }

        // Récupérer le conteneur parent qui contient toutes les catégories
        const container = document.querySelector('.categories-wrapper') as HTMLElement;
        if (!container) return;

        // Obtenir les dimensions et la position du conteneur dans la fenêtre
        const containerRect = container.getBoundingClientRect();
        
        // Récupérer les styles calculés pour obtenir le padding réel du conteneur
        // Le padding doit être soustrait car les positions sont calculées relativement
        // à la zone de contenu (sans le padding)
        const containerStyles = window.getComputedStyle(container);
        const paddingLeft = parseFloat(containerStyles.paddingLeft) || 0;
        const paddingRight = parseFloat(containerStyles.paddingRight) || 0;
        const paddingTop = parseFloat(containerStyles.paddingTop) || 0;
        const paddingBottom = parseFloat(containerStyles.paddingBottom) || 0;

        // Récupérer la position actuelle de la souris/touch
        let currentX: number, currentY: number;
        if ('touches' in event) {
          currentX = event.touches[0].clientX;
          currentY = event.touches[0].clientY;
        } else {
          currentX = (event as MouseEvent).clientX;
          currentY = (event as MouseEvent).clientY;
        }

        // Calculer le déplacement depuis la position initiale du clic/touch
        // Cette différence représente le mouvement de la souris/touch depuis le début du drag
        const mouseOffsetX = currentX - state.dragStartPos.x;
        const mouseOffsetY = currentY - state.dragStartPos.y;

        // Calculer la nouvelle position en ajoutant le déplacement à la position initiale
        // state.initialPosition est déjà relative à la zone de contenu (sans padding)
        let newX = state.initialPosition.x + mouseOffsetX;
        let newY = state.initialPosition.y + mouseOffsetY;

        // Récupérer l'élément DOM de la catégorie en cours de drag
        // On utilise closest() pour trouver le conteneur même si le clic est sur un enfant
        const categoryElement = (event.target as HTMLElement).closest('.category-container') as HTMLElement;
        if (!categoryElement) return;
        
        // Obtenir les dimensions RÉELLES de la catégorie depuis le DOM
        // IMPORTANT : La hauteur varie selon le nombre d'observables dans la catégorie
        // On ne peut pas utiliser une valeur fixe car certaines catégories peuvent être
        // beaucoup plus hautes que d'autres (ex: 10 observables vs 2 observables)
        const categoryRect = categoryElement.getBoundingClientRect();
        const cardHeight = categoryRect.height; // Hauteur réelle variable
        const cardWidth = categoryRect.width; // Largeur réelle

        // Constraintes de positionnement
        const margin = 20; // Marge minimale depuis les bords du conteneur
        const contentWidth = containerRect.width - paddingLeft - paddingRight;

        // Calculer la hauteur totale du contenu basée sur toutes les catégories
        // On parcourt toutes les catégories pour trouver celle qui est le plus bas
        // et on calcule la hauteur totale nécessaire pour afficher toutes les catégories
        const allCategoryElements = container.querySelectorAll('.category-container');
        let maxCategoryBottom = 0; // Position Y la plus basse (Y + hauteur)
        
        allCategoryElements.forEach((el) => {
          const elRect = el.getBoundingClientRect();
          // Calculer la position Y relative au conteneur (sans padding)
          const relativeY = elRect.top - containerRect.top - paddingTop;
          const elHeight = elRect.height; // Hauteur réelle de cette catégorie
          const bottom = relativeY + elHeight; // Position du bas de la catégorie
          
          // Garder la position la plus basse
          if (bottom > maxCategoryBottom) {
            maxCategoryBottom = bottom;
          }
        });
        
        // Calculer la hauteur minimale du contenu nécessaire
        // On prend le maximum entre :
        // 1. La hauteur calculée basée sur toutes les catégories existantes
        // 2. La hauteur de scroll actuelle (si le conteneur a déjà été agrandi)
        // 3. La position où on essaie de déplacer la catégorie (pour permettre l'expansion)
        // Cela garantit que le conteneur sera toujours assez grand pour afficher toutes les catégories
        const calculatedContentHeight = Math.max(
          maxCategoryBottom + margin,
          container.scrollHeight - paddingTop - paddingBottom,
          newY + cardHeight + margin
        );

        // Contraintes horizontales : empêcher la catégorie de sortir du conteneur
        // IMPORTANT : On ne permet jamais de position négative en X, sinon la catégorie
        // se loge tout à gauche et devient inaccessible (bug 2.2)
        if (newX < 0) newX = 0;
        if (newX > contentWidth - margin) newX = contentWidth - margin;
        
        // Contraintes verticales
        // - On empêche le mouvement vers le haut au-delà de 0 (pas de position négative)
        // - On permet le mouvement vers le bas librement : le conteneur s'agrandira
        //   automatiquement via updateWrapperHeight() dans le composant parent
        // Cette approche permet de faire glisser les catégories vers le bas sans limite,
        // et le conteneur s'adapte dynamiquement à la nouvelle position
        if (newY < 0) newY = 0;
        // Pas de contrainte vers le bas : updateWrapperHeight() gérera l'expansion du conteneur

        // Émettre l'événement avec la nouvelle position calculée
        // Le composant parent mettra à jour state.categoryPositions et appellera
        // updateWrapperHeight() pour ajuster la hauteur du conteneur
        emit('move', {
          categoryId: props.category.id,
          position: { x: newX, y: newY }
        });
      },
      /**
       * Gère la fin du drag d'une catégorie.
       * 
       * Cette fonction est appelée quand l'utilisateur relâche la souris/touch après avoir
       * déplacé une catégorie. Elle nettoie l'état du drag et retire les écouteurs d'événements
       * globaux pour éviter les fuites mémoire et les comportements indésirables.
       * 
       * Après cette fonction, le composant parent aura déjà mis à jour state.categoryPositions
       * avec la nouvelle position via l'événement 'move' émis dans handleDragMove, et aura
       * appelé updateWrapperHeight() pour ajuster la hauteur du conteneur si nécessaire.
       */
      handleDragEnd: () => {
        // Marquer que le drag est terminé
        state.isDragging = false;

        // Notifier le composant parent que le drag est terminé
        // Cela permet au parent de réactiver certaines fonctionnalités ou de mettre à jour l'UI
        emit('dragEnd', props.category.id);

        // Retirer tous les écouteurs d'événements globaux pour éviter les fuites mémoire
        // et empêcher handleDragMove d'être appelé après la fin du drag
        // IMPORTANT : Il faut utiliser exactement la même référence de fonction que lors
        // de l'ajout, d'où l'utilisation de methods.handleDragMove et methods.handleDragEnd
        document.removeEventListener('mousemove', methods.handleDragMove);
        document.removeEventListener('touchmove', methods.handleDragMove as unknown as EventListener);
        document.removeEventListener('mouseup', methods.handleDragEnd);
        document.removeEventListener('touchend', methods.handleDragEnd as unknown as EventListener);
      },
      /**
       * Gère le début du drag d'une catégorie.
       * 
       * Cette fonction est appelée quand l'utilisateur commence à faire glisser une catégorie
       * (clic/touch maintenu + mouvement). Elle initialise l'état du drag et enregistre :
       * 1. La position initiale de la catégorie (depuis props.position)
       * 2. La position initiale de la souris/touch (pour calculer le déplacement)
       * 3. Les écouteurs d'événements globaux pour suivre le mouvement
       * 
       * IMPORTANT : props.position est déjà calculée relativement à la zone de contenu
       * du conteneur (sans le padding), ce qui correspond exactement à la façon dont les
       * positions sont stockées dans state.categoryPositions du composant parent.
       * On utilise directement cette valeur pour éviter de recalculer depuis le DOM,
       * ce qui pourrait introduire des erreurs d'offset dues au padding ou aux transformations CSS.
       * 
       * @param event - Événement de souris ou touch qui déclenche le drag
       */
      handleDragStart: (event: MouseEvent | TouchEvent) => {
        // Marquer que le drag est en cours
        // Cette variable est utilisée dans handleDragMove pour vérifier si le drag est actif
        state.isDragging = true;

        // Notifier le composant parent que le drag a commencé
        // Cela permet au parent de désactiver temporairement certaines fonctionnalités
        // ou de mettre à jour l'UI (ex: changer le curseur, désactiver d'autres interactions)
        emit('dragStart', props.category.id);

        // Utiliser directement props.position car elle est déjà calculée correctement
        // relativement à la zone de contenu (sans padding)
        // Cette position correspond exactement à state.categoryPositions[categoryId]
        // dans le composant parent, donc pas besoin de recalculer depuis le DOM
        // On fait une copie pour éviter les mutations accidentelles
        state.initialPosition = { ...props.position };

        // Enregistrer la position initiale de la souris/touch dans la fenêtre
        // Cette position sera utilisée dans handleDragMove pour calculer le déplacement
        // en soustrayant cette position initiale de la position actuelle
        if ('touches' in event) {
          state.dragStartPos = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
          };
        } else {
          state.dragStartPos = {
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY
          };
        }

        // Réinitialiser le dragOffset (non utilisé actuellement mais conservé pour compatibilité)
        state.dragOffset = { x: 0, y: 0 };

        // Enregistrer les écouteurs d'événements globaux sur le document
        // On utilise le document plutôt que l'élément pour capturer le mouvement
        // même si la souris/touch sort de la catégorie pendant le drag
        // passive: false permet de prévenir le comportement par défaut (scroll) dans handleDragMove
        document.addEventListener('mousemove', methods.handleDragMove);
        document.addEventListener('touchmove', methods.handleDragMove as unknown as EventListener, { passive: false });
        document.addEventListener('mouseup', methods.handleDragEnd);
        document.addEventListener('touchend', methods.handleDragEnd as unknown as EventListener);
      }
    };

    return {
      state,
      computedState,
      methods
    };
  }
});
</script>

<style scoped>
.category-container {
  width: 100%;
  border-radius: 8px;
  transition: box-shadow 0.3s ease, transform 0.2s ease;
  position: relative;
  background-color: #f9f9f9;
  margin-bottom: 16px;
}

.category-container:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.category-container.is-dragging {
  opacity: 0.8;
  transform: scale(1.02);
  cursor: grabbing;
  z-index: 100;
}

.category-header {
  padding-bottom: 8px;
  border-bottom: 1px solid #eaeaea;
}

.category-title {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.category-description {
  color: #666;
}

.category-content {
  padding-top: 12px;
}

.drag-handle {
  cursor: grab;
}

.buttons-container {
  display: flex;
  flex-direction: column;
}
</style> 