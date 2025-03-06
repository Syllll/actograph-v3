<template>
  <DCard
    :draggable="props.draggable"
    :useInnerPadding="false"
    cardClass="fit"
    :id="props._name"
    class="clickable"
    bgColor="transparent"
    @dragstart="drag.methods.onDragStart"
    @dragend="drag.methods.onDragEnd"
    @click="!props.draggable && $emit('update:selectedName', props._name)"
  >
    <!-- Card content -->
    <div
      class="
        q-pa-sm
        column

        full-width
        full-height

        smooth
        rounded-less

        bg-pb-editor-secondary-60
        hover:inner-border-pb-editor-primary-low
      "
      style="font-size: 0.7rem"
      :class="{
        'inner-border-pb-editor-primary-medium': props.selectedName === props._name
      }"
    >
      <!-- The title "header" -->
      <div class="row items-center full-width">
        <!-- Icon -->
        <div v-if="props.icon" class="col-auto">
          <q-icon size="2rem" class="full-width" :name="props.icon" />
        </div>
        <!-- Title -->
        <div class="col full-width">
          <div class="text-body text-bold ellipsis full-width">
            {{ props.name }}
          </div>
        </div>
        <!-- Checkbox -->
        <!-- <div v-if="!props.draggable" class="col-auto q-pl-sm">
          <DCheckbox
            size="2rem"
            dense
            :modelValue="props.selectedName === props._name"
            @update:modelValue="$emit('update:selectedName', props._name)"
          />
        </div> -->
      </div>
      <!-- Description -->
      <div class="text-body2 full-width" style="font-size: 0.7rem">
        {{ props.description }}
      </div>
    </div>
  </DCard>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar';
import { useDragCard } from './use-drag-card';

export default defineComponent({
  props: {
    _name: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    icon: {
      type: String,
      required: false,
    },
    selectedName: {
      type: String,
      required: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    draggable: {
      type: Boolean,
      default: false,
    },
  },
  components: {},
  emits: ['update:selectedName'],
  setup(props) {
    const screen = useQuasar().screen;
    const drag = useDragCard();
    const stateless = {};

    const state = {};

    const methods = {};

    return {
      props,
      stateless,
      state,
      methods,
      screen,
      drag,
    };
  },
});
</script>
