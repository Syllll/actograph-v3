<style lang="scss" scoped>
.text {
  font-size: 24px !important;
  font-weight: 500;
  line-height: 36px;
  letter-spacing: -0.24px !important;

  color: #000;

  margin-top: 40px;
  margin-bottom: 40px;

  padding-left: 40px;
}

.author {
  font-size: 20px !important;
  font-weight: 600;
  line-height: 27px;

  color: #000;

  margin-left: 40px;

  span {
    font-size: 18px !important;
    font-weight: 400;
    line-height: 28px;

    color: #78756e;
    display: block;
  }
}
</style>

<template>
  <div
    class="q-px-sm bg-white a1-shadow row items-center justify-center"
    :class="`${props.customClass}`"
    :style="{
      ...props.customStyle,
      height: props.customHeight || '500px',
      width: props.customWidth || '1000px',
    }"
  >
    <div class="col-4 flex justify-center">
      <q-img :src="props.imageSource" />
    </div>
    <div class="col column items-start">
      <img src="/a1/talking/quote.svg" alt="" />
      <span class="text" v-html="props.citation" />

      <div class="author">
        <div class="text-bold" v-html="props.author" />
        <span v-html="props.authorPosition" />
      </div>
    </div>
  </div>

  <!--
<v-row
  v-for="(review, i) in reviews"
  :key="'review_' + i"
  class="review"
  align="center"
  justify="center"
  :class="{'mobile': isMobile}"
>
  <v-col class="illustration col-12 col-lg-4 flex justify-center">
    <img :src="review.img" alt="">
  </v-col>
  <v-col class="content" :class="{'mobile': isMobile}">
    <img src="/img/landing/talking/quote.svg" alt="">
    <div class="text">
      {{ review.text }}
    </div>
    <div class="author">
      {{ review.author }}
      <span> {{ review.subtitle }} </span>
    </div>
  </v-col>
</v-row>
</script> -->
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';
import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';

const { methods: propsMethods } = useProps();

const treeProps: any = propsMethods.getPropsByTheme('tree');
const styleProps: any = propsMethods.getPropsByTheme('style');
const sizeProps: any = propsMethods.getPropsByTheme('size');

export default defineComponent({
  props: {
    ...sizeProps,
    ...treeProps,
    ...styleProps,
    ...propsMethods.createMultipleStringProps(['imageSource'], 'Image'),
    citation: propsMethods.createStringProp('citation', 'Citation', null, {
      editor: true,
    }),
    ...propsMethods.createMultipleStringProps(
      ['author', 'authorPosition'],
      'Citation',
      null
    ),
  },
  builderOptions: {
    slots: [],
    category: 'A1',
    description: 'A1 Citation from someone',
  },
  emits: [],
  setup(props) {
    const stateless = {};

    const state = reactive({});

    const methods = {};

    const computedState = {};

    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {});

    return {
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
