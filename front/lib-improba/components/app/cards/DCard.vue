<template>
  <div class="column">
    <div class="col-auto column">
      <slot name="header" v-if="!props.innerHeader">
        <div class="row q-px-sm items-center">
          <DIcon v-if="props.icon" class="col-auto" :name="props.icon" />
          <DCardTitle v-if="props.title" :title="props.title" />
          <DSpace />
          <div class="col-auto">
            <slot name="header-actions"></slot>
          </div>
        </div>
      </slot>
    </div>
    <DQCard
      :useInnerPadding="props.useInnerPadding"
      :class="`${props.verticalShrink ? 'col-shrink' : 'col'} text-text ${
        props.bgColor === 'none' ? '' : 'bg-' + props.bgColor
      } ${props.cardClass}`"
      :noBgColor="true"
    >
      <slot name="inner-header" v-if="props.innerHeader">
        <div class="row q-px-sm items-center">
          <DIcon v-if="props.icon" class="col-auto" :name="props.icon" />
          <DCardTitle v-if="props.title" :title="props.title" />
          <DSpace />
          <div class="col-auto">
            <slot name="inner-header-actions"></slot>
          </div>
        </div>
      </slot>
      <slot>
        <div class="fit">
          <slot name="content"></slot>
        </div>
      </slot>
    </DQCard>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

import DQCard from './DQCard.vue';
import DCardTitle from './DCardTitle.vue';

export default defineComponent({
  components: {
    DQCard,
    DCardTitle,
  },
  props: {
    title: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    bgColor: {
      type: String,
      default: 'none',
    },
    innerHeader: {
      type: Boolean,
      default: false,
    },
    verticalShrink: {
      type: Boolean,
      required: false,
      default: true,
    },
    cardClass: {
      type: String,
      required: false,
      default: '',
    },
    useInnerPadding: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, context) {
    const state = reactive({});

    const methods = {};

    return { props, state, methods };
  },
});
</script>
