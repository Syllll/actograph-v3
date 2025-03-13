<style>
.bg-a1-image {
  background-size: cover;
  background-position: center;
}

.bg-paralax {
  background-attachment: fixed;
  position: relative;
}
</style>

<template>
  <div
    ref="containerRef"
    :class="`
      position-relative
      bg-a1-${props.type}
      q-pa-md
      width-inherit
      ${props.paralax && 'bg-paralax'}
      ${props.customClass}
    `"
    :style="{
      ...props.customStyle,
      height: props.customHeight || 'fit-content',
    }"
  >
    <slot name="default" />

    <slot name="deco" />

    <div class="col-auto">
      <EmptySlot :parentId="props.objectInTreeId" :myTreeId="props.myTreeId" />
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue';
import { watch } from 'vue';
import { defineComponent } from 'vue';
import EmptySlot from '@lib-improba/components/page-builder/lib/tree/empty-slot/Index.vue';
import { INode } from '@lib-improba/components/page-builder/lib/tree/types';
import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';

const { methods: propsMethods } = useProps();
const treeProps: any = propsMethods.getPropsByTheme('tree');
const styleProps: any = propsMethods.getPropsByTheme('style');
const customHeight: any = propsMethods.getPropByName(
  'customHeight',
  'Background'
);

export default defineComponent({
  components: {
    EmptySlot,
  },
  props: {
    ...treeProps,
    ...styleProps,
    customHeight,
    type: {
      type: String,
      required: false,
      default: 'primary',
      builderOptions: {
        options: [
          {
            label: 'Transparent',
            value: 'transparent',
          },
          {
            label: 'Image',
            value: 'image',
          },
          {
            label: 'Primaire',
            value: 'primary',
          },
          {
            label: 'Secondaire',
            value: 'secondary',
          },
          {
            label: 'Tertiaire',
            value: 'tertiary',
          },
        ],
      },
    },
    imageSource: {
      type: String,
      builderOptions: {
        category: 'Background',
        // selected as treeState.selected
        displayCondition: ({ props }: INode) => props['type'] === 'image',
      },
    },
    paralax: {
      type: Boolean,
      default: false,
      builderOptions: {
        displayCondition: ({ props }: INode) => props['type'] === 'image',
        category: 'Background',
        options: [
          {
            label: 'Oui',
            value: true,
          },
          {
            label: 'Non',
            value: false,
          },
        ],
      },
    },
  },
  builderOptions: {
    slots: ['default', 'deco'],
    category: 'A1',
    type: 'select',
    description: 'Default A1 section',
  },
  mounted() {
    this.methods.setBackgroundImage();

    // if (this.props.paralax) {
    //   window.addEventListener('scroll', this.methods.handleScroll)
    // }
  },
  // unmounted() {
  //   window.removeEventListener('scroll', this.methods.handleScroll)
  // },
  setup(props, ctx) {
    const containerRef = ref<any>(null);

    const methods = {
      // handleScroll () {
      //   if (!containerRef?.value) { return }

      //   const scrollPosition = window.scrollY
      //   containerRef.value.style.backgroundPositionY = -scrollPosition * 0.5 + 'px'
      // },

      setBackgroundImage() {
        // if (!props.imageSource || props.type !== 'image') { return }

        const el = containerRef.value;
        // console.log({ el })

        // console.log({ imgsrc: props.imageSource })
        el.style.backgroundImage =
          !props.imageSource || props.type !== 'image'
            ? null
            : `url('${props.imageSource}')`;
      },
    };

    watch(
      () => [props.type, props.imageSource],
      () => {
        methods.setBackgroundImage();
      }
    );

    // watch(
    //   () => props.paralax,
    //   () => {
    //     props.paralax
    //       ? window.addEventListener('scroll', methods.handleScroll)
    //       : window.removeEventListener('scroll', methods.handleScroll)
    //   }
    // )

    return {
      methods,
      props,
      containerRef,
    };
  },
});
</script>
