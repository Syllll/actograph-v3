<template>
  <!--
    Composant DCanvas - Canvas HTML avec redimensionnement automatique
    
    Ce composant fournit un canvas HTML qui se redimensionne automatiquement selon
    son conteneur parent. Il utilise ResizeObserver pour détecter les changements
    de taille et ajuster le canvas en conséquence.
    
    Deux modes de redimensionnement sont disponibles :
    - Mode square (props.square=true) : Le canvas prend la plus petite dimension
      (largeur ou hauteur) pour créer un carré
    - Mode normal (props.square=false) : Le canvas s'adapte à toutes les dimensions
      du conteneur parent
    
    Le composant émet des événements de redimensionnement et de souris pour permettre
    aux composants parents de réagir aux changements.
  -->
  <div :class="'fit row justify-center items-center'">
    <!--
      Conteneur interne qui sera redimensionné dynamiquement.
      Utilise overflow: hidden pour éviter que le contenu ne dépasse.
    -->
    <div class="fit relative-position" ref="containerRef" style="overflow: hidden">
      <!--
        Canvas HTML qui sera utilisé pour le rendu graphique (ex: PixiJS).
        Les événements souris sont émis vers le composant parent.
      -->
      <canvas
        ref="canvasRef"
        :id="$props.canvasId"
        @mouseenter="$emit('canvasMouseEnter', $event)"
        @mouseleave="$emit('canvasMouseLeave', $event)"
        @mousemove="$emit('canvasMouseMove', $event)"
      >
      </canvas>
      <!-- Slot pour permettre d'ajouter du contenu supplémentaire si nécessaire -->
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Composant DCanvas - Canvas HTML avec redimensionnement automatique
 * 
 * Ce composant fournit un canvas HTML qui se redimensionne automatiquement
 * selon son conteneur parent en utilisant ResizeObserver.
 * 
 * @example
 * ```vue
 * <d-canvas ref="canvasRef" @resize="onResize" />
 * ```
 */
export default defineComponent({
  props: {
    /**
     * ID optionnel pour le canvas HTML
     */
    canvasId: {
      type: String,
      required: false,
    },
    /**
     * Si true, le canvas sera redimensionné en carré (prend la plus petite dimension).
     * Si false, le canvas s'adapte à toutes les dimensions du conteneur.
     */
    square: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  emits: [
    /**
     * Émis lors du redimensionnement du canvas
     * @param {number} [size] - Taille du côté (uniquement en mode square)
     */
    'resize',
    /**
     * Émis lorsque la souris entre dans le canvas
     */
    'canvasMouseEnter',
    /**
     * Émis lorsque la souris se déplace sur le canvas
     */
    'canvasMouseMove',
    /**
     * Émis lorsque la souris quitte le canvas
     */
    'canvasMouseLeave',
  ],
  setup(props, context) {
    // Référence au conteneur div qui sera redimensionné
    const containerRef = ref<any>(null);
    // Référence au canvas HTML (exposée pour les composants parents)
    const canvasRef = ref<any>(null);
    // Référence au ResizeObserver pour pouvoir le nettoyer lors du démontage
    let resizeObserver: ResizeObserver | null = null;
    
    /**
     * Fonction de redimensionnement en mode square.
     * Calcule la plus petite dimension (largeur ou hauteur) et applique
     * cette valeur aux deux dimensions pour créer un carré.
     *
     * IMPORTANT: Vérifie que containerRef.value existe avant d'accéder
     * à ses propriétés pour éviter les erreurs lors du démontage.
     */
    const resizeAction = () => {
      // Vérification de sécurité : si le composant est démonté, on ne fait rien
      if (!containerRef?.value) {
        return;
      }

      // Récupération de l'élément parent pour obtenir ses dimensions
      const parentElement = containerRef.value.parentElement;
      if (!parentElement) {
        return;
      }

      // Calcul des dimensions du parent
      const rect = parentElement.getBoundingClientRect();
      if (!rect) {
        return;
      }

      // Calcul de la dimension carrée : prendre le minimum entre largeur et hauteur
      const sideValue = Math.min(
        Math.floor(rect.width),
        Math.floor(rect.height)
      );

      // On utilise setProperty par propriété plutôt que d'écraser tout l'attribut
      // `style` : l'ancien code `containerRef.value.style = "..."` supprimait le
      // `overflow: hidden` posé en template, et figeait une hauteur en pixels
      // `!important` qui pouvait capturer une mesure transitoire géante.
      const sidePx = `${Math.max(1, sideValue - 25)}px`;
      containerRef.value.style.setProperty('width', sidePx, 'important');
      containerRef.value.style.setProperty('height', sidePx, 'important');

      // Émission de l'événement resize avec la taille calculée
      context.emit('resize', sideValue);
    };

    /**
     * Fonction de redimensionnement en mode normal.
     * Adapte le canvas à toutes les dimensions du conteneur parent.
     *
     * IMPORTANT: Vérifie que containerRef.value existe avant d'accéder
     * à ses propriétés pour éviter les erreurs lors du démontage.
     */
    const resizeEvent = () => {
      // Vérification de sécurité : si le composant est démonté, on ne fait rien
      if (!containerRef?.value) {
        return;
      }

      // On n'écrit PLUS de hauteur/largeur explicites en pixels sur le conteneur
      // observé par le ResizeObserver. Avant, `containerRef.value.style = "..."
      // !important` figeait la taille à partir de `parentElement.getBoundingClientRect()`,
      // et lors d'un relayout du splitter la chaîne de hauteur passait transitoirement
      // en 'auto' : la mesure renvoyait alors une valeur géante qui se figeait en
      // inline !important, faisant disparaître le graphe derrière une scrollbar
      // immense (bug A3). Désormais le conteneur reste en `fit` (100% du parent) +
      // `overflow: hidden`, et le canvas (position: absolute, 100% du conteneur)
      // hérite d'une taille stable. On se contente d'émettre 'resize' pour que
      // PixiApp relise la taille réelle du canvas via getBoundingClientRect().
      context.emit('resize');
    };

    /**
     * Hook appelé lorsque le composant est monté dans le DOM.
     * Initialise le ResizeObserver pour surveiller les changements de taille
     * du conteneur parent et redimensionner automatiquement le canvas.
     */
    onMounted(() => {
      // Vérification que le conteneur est bien monté
      if (!containerRef.value) {
        return;
      }

      // Récupération de l'élément parent à observer
      const parentElement = containerRef.value.parentElement;
      if (!parentElement) {
        return;
      }

      // Initialisation selon le mode (square ou normal)
      if (props.square) {
        // Mode carré : redimensionnement initial puis observation
        resizeAction();
        resizeObserver = new ResizeObserver(resizeAction);
        resizeObserver.observe(parentElement);
      } else {
        // Mode normal : redimensionnement initial puis observation
        resizeEvent();
        resizeObserver = new ResizeObserver(resizeEvent);
        resizeObserver.observe(parentElement);
      }
    });

    /**
     * Hook appelé avant le démontage du composant.
     * Nettoie le ResizeObserver pour éviter les fuites mémoire et les erreurs
     * lorsque le composant est démonté (ex: changement d'onglet).
     * 
     * IMPORTANT: Sans ce nettoyage, le ResizeObserver continuerait d'observer
     * et pourrait essayer d'accéder à des éléments démontés, causant des erreurs.
     */
    onBeforeUnmount(() => {
      if (resizeObserver) {
        // Arrêt de l'observation pour éviter les fuites mémoire
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    });

    return {
      // Référence au conteneur div (utilisée en interne pour le resize)
      containerRef,
      // Référence au canvas HTML (exposée pour les composants parents)
      canvasRef,
    };
  },
});
</script>

<style scoped lang="scss">
canvas {
  /* Le canvas est sorti du flux pour qu'il ne puisse JAMAIS influencer la
     taille de son conteneur. Sans ça, redimensionner le renderer PixiJS
     repousse le conteneur observé par le ResizeObserver, ce qui re-déclenche
     un resize → boucle de feedback (le canvas grossit à l'infini). */
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  padding: 0px;
  border: 0px;
  margin: 0px;
  border-image-width: 0px;
  width: 100% !important;
  height: 100% !important;
}
</style>
