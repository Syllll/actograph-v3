<template>
  <q-btn-dropdown
    dense
    flat
    size="0.7rem"
    rounded
    :icon="
      stateless.options.find((entry) => entry.value === $props.modelValue)
        ?.icon ?? undefined
    "
    class=""
  >
    <q-list dense>
      <q-item
        v-for="(entry, index) of stateless.options"
        :key="index"
        clickable
        v-close-popup
        @click="$emit('update:modelValue', entry.value)"
        :class="{
          'text-pb-editor-accent text-bold':
            entry.value === null ||
            (entry.value && $props.screen?.[entry.value]?.[$props.propName]),
        }"
      >
        <q-item-section avatar>
          <q-avatar :icon="entry.icon" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ entry.label }}</q-item-label>
        </q-item-section>
        <q-item-section
          v-if="entry.value && $props.screen?.[entry.value]?.[$props.propName]"
        >
          <div class="row justify-end">
            <PBActionBtn
              size="0.8rem"
              dense
              icon="close"
              @click.stop="$emit('undoOverride', entry.value)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import PBActionBtn from '@lib-improba/components/page-builder/lib/ui/local-components/buttons/PBActionBtn.vue';
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    screen: {
      type: Object,
    },
    propName: {
      type: String,
      required: true,
    },
  },
  emits: ['update:modelValue', 'undoOverride'],
  components: { PBActionBtn },
  setup(props) {
    const stateless = {
      options: [
        {
          label: 'Default',
          icon: 'crop_square',
          value: null,
        },
        {
          label: 'Mobile',
          icon: 'smartphone',
          value: 'sm',
        },
        {
          label: 'Tablet',
          icon: 'tablet',
          value: 'md',
        },
        {
          label: 'Desktop',
          icon: 'computer',
          value: 'lg',
        },
        {
          label: 'Large Desktop',
          icon: 'desktop_windows',
          value: 'xl',
        },
      ],
    };

    return {
      stateless,
    };
  },
});
</script>
