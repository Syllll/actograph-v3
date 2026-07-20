<template>
  <DCard
    class="q-dialog-plugin d-dialog-card"
    :class="sizeClass"
    bgColor="background"
    :innerHeader="!!title || !!icon || !!$slots['inner-header-actions']"
    :title="title"
    :icon="icon"
    :useInnerPadding="useInnerPadding"
    :verticalShrink="verticalShrink"
  >
    <template v-if="$slots['inner-header-actions']" v-slot:inner-header-actions>
      <slot name="inner-header-actions" />
    </template>

    <div class="d-dialog-card__body">
      <slot />
    </div>

    <div v-if="hasFooter" class="d-dialog-card__footer">
      <div class="row items-center justify-end full-width q-gutter-md">
        <slot name="actions">
          <DCancelBtn
            v-if="cancelLabel"
            :label="cancelLabel"
            :disable="cancelDisable"
            @click="$emit('cancel')"
          />
          <DSubmitBtn
            v-if="submitLabel"
            :label="submitLabel"
            :disable="submitDisable"
            :loading="submitLoading"
            @click="$emit('submit')"
          />
        </slot>
      </div>
    </div>
  </DCard>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import DCard from '../cards/DCard.vue';
import DCancelBtn from '../buttons/DCancelBtn.vue';
import DSubmitBtn from '../buttons/DSubmitBtn.vue';

const VALID_SIZES = ['sm', 'md', 'lg', 'xl', 'wide', 'auto'] as const;

export default defineComponent({
  name: 'DDialogCard',
  components: {
    DCard,
    DCancelBtn,
    DSubmitBtn,
  },
  props: {
    title: { type: String, default: '' },
    icon: { type: String, default: '' },
    size: {
      type: String,
      default: 'sm',
      validator: (v: string) => (VALID_SIZES as readonly string[]).includes(v),
    },
    useInnerPadding: { type: Boolean, default: true },
    verticalShrink: { type: Boolean, default: true },
    cancelLabel: { type: String, default: undefined },
    cancelDisable: { type: Boolean, default: false },
    submitLabel: { type: String, default: undefined },
    submitDisable: { type: Boolean, default: false },
    submitLoading: { type: Boolean, default: false },
  },
  emits: ['cancel', 'submit'],
  setup(props, { slots }) {
    const sizeClass = computed(() => {
      if (props.size === 'auto') return '';
      return `d-dialog-card--${props.size}`;
    });

    const hasFooter = computed(() => {
      return !!slots.actions || !!props.cancelLabel || !!props.submitLabel;
    });

    return { sizeClass, hasFooter };
  },
});
</script>

<style lang="scss">
.d-dialog-card {
  .q-card {
    // Sans largeur explicite, la carte se dimensionne sur le contenu le
    // plus large (ex. le champ "Catégorie de destination") au lieu de se
    // limiter a son parent flex (.d-dialog-card), qui lui est bien
    // contraint a la largeur de la fenetre. Le pied de page (boutons
    // Annuler/Valider) deborde alors hors champ, invisible sans defiler.
    width: 100%;
    border: 1px solid var(--neutral-low);
    border-radius: 12px;
    box-shadow: 0 16px 36px var(--neutral-high-20);
    overflow: hidden;
  }

  &__body,
  &__footer {
    flex: 0 0 auto;
  }

  &__footer {
    padding-top: 16px;
  }

  // Le min-width est un plancher fixe : si la fenetre de l'appli est plus
  // etroite que ce plancher (fenetre redimensionnee, petit ecran), il entre
  // en conflit avec max-width et le q-dialog__inner (overflow: auto) affiche
  // une barre de defilement horizontale au lieu de retrecir le dialogue.
  // Le pied de page (boutons Annuler/Valider) se retrouve alors hors champ,
  // obligeant a faire defiler le dialogue pour l'atteindre. On plafonne donc
  // le min-width a la largeur de fenetre disponible (moins le padding du
  // q-dialog__inner) pour que le dialogue puisse toujours retrecir.
  &--sm {
    min-width: min(400px, calc(100vw - 48px));
    max-width: 90vw;
  }

  &--md {
    min-width: min(500px, calc(100vw - 48px));
    max-width: 700px;
  }

  &--lg {
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
  }

  &--xl {
    min-width: min(700px, calc(100vw - 48px));
    max-width: 900px;
  }

  &--wide {
    width: 90vw;
    max-width: 900px;
    height: 85vh;
  }
}
</style>
