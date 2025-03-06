<template>
  <component
    :is="props.titleType"
    :style="`
      color: var(${props.color});
      font-size: ${props.fontSize};
      height: ${props.height};
      width: ${props.width};
      margin: ${props.margins};
      padding: ${props.paddings};
    ${props.customStyle}
    `"
    ><span v-html="props.text"
  /></component>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed } from 'vue';
import EmptySlot from '../../tree/empty-slot/Index.vue';
import * as builderStyle from '../../ui/use-builder-style';

export default defineComponent({
  components: {
    EmptySlot,
  },
  props: {
    titleType: {
      type: String,
      default: 'h2',
      builderOptions: {
        label: 'Type de titre',
        category: 'Contenu',
        options: [
          { label: 'H1', value: 'h1' },
          { label: 'H2', value: 'h2' },
          { label: 'H3', value: 'h3' },
          { label: 'H4', value: 'h4' },
          { label: 'H5', value: 'h5' },
          { label: 'H6', value: 'h6' },
        ],
      },
    },
    text: {
      type: String,
      default: 'Fill me with text.',
      builderOptions: { editor: true, label: '', category: 'Contenu' },
    },

    height: {
      type: String,
      default: 'auto',
      builderOptions: { label: 'Hauteur', category: 'Taille' },
    },
    width: {
      type: String,
      default: '100%',
      builderOptions: { label: 'Largeur', category: 'Taille' },
    },

    margins: {
      type: String,
      default: 'auto',
      builderOptions: { label: 'Marges', category: 'Marges' },
    },
    paddings: {
      type: String,
      default: '0.5rem',
      builderOptions: { label: 'Marges internes', category: 'Marges' },
    },

    fontSize: {
      type: String,
      default: '',
      builderOptions: {
        label: 'Taille de police',
        category: 'Style',
        placeholder: 'auto',
        class: 'col-6',
      },
    },
    fontWeight: {
      type: String,
      default: 'normal',
      builderOptions: {
        label: 'Poids de police',
        category: 'Style',
        class: 'col-6',
      },
    },

    color: {
      type: String,
      default: '',
      builderOptions: {
        label: 'Couleur',
        category: 'Style',
        class: 'col-6',
        options: () =>
          Object.entries(builderStyle.sharedState.colors).map((o) => ({
            label: o[0],
            value: `--pb-${o[0]}`,
          })),
      },
    },

    customStyle: {
      type: String,
      default: '',
      builderOptions: { label: 'CSS', category: 'Style' },
    },
  },
  emits: [],
  builderOptions: {
    name: 'Titre',
    slots: [],
    description: 'Un titre de niveau h2',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
