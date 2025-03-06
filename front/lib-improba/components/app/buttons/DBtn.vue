<template>
  <!-- :disable="props.disable" -->
  <q-btn
    class="text-text"
    unelevated
    no-caps
    rounded
    :size="computedState.size.value"
    @mouseover="methods.setHovering(true)"
    @mouseout="methods.setHovering(false)"
    :text-color="
      state.hovering && props.hoverTextColor !== undefined
        ? props.hoverTextColor
        : props.textColor
    "
    :color="
      state.hovering && props.hoverColor !== undefined
        ? props.hoverColor
        : props.color
    "
    :icon="
      state.hovering && props.hoverIcon !== undefined
        ? props.hoverIcon
        : props.icon
    "
    :outline="
      state.hovering && props.hideOutlineWhenHovering ? false : props.outline
    "
  >
    <slot>
      <q-tooltip v-if="props.tooltip && props.tooltip.length > 0">
        {{ props.tooltip }}
      </q-tooltip>
    </slot>
  </q-btn>
</template>

<script lang="ts">
import { defineComponent, computed, reactive } from 'vue';
import { getCssVar } from 'quasar';

export default defineComponent({
  props: {
    small: {
      type: Boolean,
      default: false,
    },
    large: {
      type: Boolean,
      default: false,
    },
    tooltip: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      required: false,
    },
    textColor: {
      type: String,
      required: false,
    },
    hoverIcon: {
      type: String,
      required: false,
    },
    hoverColor: {
      type: String,
      required: false,
    },
    hoverTextColor: {
      type: String,
      required: false,
    },
    hideOutlineWhenHovering: {
      type: Boolean,
      required: false,
      default: false,
    },
    outline: {
      type: Boolean,
      required: false,
    },
  },
  setup(props) {
    const state = reactive({
      hovering: false,
    });

    const computedState = {
      size: computed(() => {
        if (props.small) return '0.75rem';
        if (props.large) return '1.0625rem';
        return '';
      }),
      /* paddingClass: computed(() => {
        if (!props.icon) return false
        if (props.small) return 'q-pr-sm'
        if (props.large) return 'q-pr-lg'
        return 'q-pr-md'
      }) */
    };

    const methods = {
      setHovering(tf: boolean) {
        if (state.hovering != tf) {
          state.hovering = tf;
        }
      },
      getCssVar,
    };

    return { props, state, computedState, methods };
  },
});
</script>
