<template>
  <q-dialog
    v-model="state.opened"
    @show="emit('dialog-show')"
    @hide="emit('dialog-hide')"
    :transition-show="openAnimation"
    :persistent="props.persistent"
  >
    <q-layout
      view="Lhh lpR fff"
      container
      :class="bgColor.includes('bg-') ? bgColor : 'bg-' + bgColor"
      :style="
        'padding: 1em; minWidth: ' +
        minWidth +
        '; maxHeight: ' +
        maxHeight +
        ';'
      "
    >
      <q-header
        class="bg-primary-low text-text relative-position"
        style="height: 3rem"
      >
        <div class="row justify-between items-center full-height">
          <slot name="title" class="">
            <div class="col row">
              <template v-if="props.icon">
                <div class="col-1">
                  <q-icon
                    class="q-pl-sm"
                    @click="emit('icon')"
                    :name="props.icon"
                    size="sm"
                  />
                </div>
              </template>
              <template v-if="props.title">
                <div class="col text-h6 text-center">
                  {{ props.title }}
                </div>
              </template>
              <template v-if="props.icon">
                <div class="col-1"></div>
              </template>
              <template v-if="props.useCloseIcon">
                <div
                  class="absolute-right row items-center"
                  style="margin-right: 0%"
                >
                  <DCloseBtn
                    color="text-invert"
                    @click="emit('cancelled'), (state.opened = false)"
                  />
                </div>
              </template>
            </div>
          </slot>
        </div>
      </q-header>

      <q-page-container>
        <d-page class="column" :padding="false">
          <slot> </slot>
        </d-page>
      </q-page-container>

      <q-footer class="bg-primary-low text-text" style="height: 3rem">
        <div class="row justify-center items-center full-height">
          <slot
            name="layout-buttons"
            v-if="!hideButtons"
            v-bind:props="{ state, i18n, onlyOneButton }"
          >
            <div>
              <DCancelBtn
                class="q-mx-sm text-text"
                @click="emit('cancelled'), (state.opened = false)"
                :label="i18n.t(button1Label)"
              />
            </div>
            <div v-if="!onlyOneButton">
              <DSubmitBtn
                class="q-mx-sm"
                @click="emit('submitted'), (state.opened = false)"
                :label="i18n.t(button2Label)"
              />
            </div>
          </slot>
        </div>
      </q-footer>
    </q-layout>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted, watch } from 'vue';

import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'Modal',
  props: {
    triggerOpen: { default: () => false },
    button1Label: { type: String, default: 'components.DModal.cancel' },
    button2Label: { type: String, default: 'components.DModal.save' },
    onlyOneButton: { type: Boolean, default: false },
    hideButtons: { type: Boolean, default: false },
    triggerClose: { type: Boolean, default: false },
    minWidth: { type: String, default: '30vw' },
    maxHeight: { type: String, default: '100vh' },
    openAnimation: { type: String, default: 'appear' },
    title: { type: String, default: () => null },
    icon: { type: String, default: () => null },
    useCloseIcon: { type: Boolean, default: true },
    bgColor: { type: String, default: 'bg-primary-lowest' },
    persistent: { type: Boolean, default: false },
  },
  emits: [
    'update:triggerOpen',
    'update:triggerClose',
    'cancelled',
    'submitted',
    'dialog-show',
    'dialog-hide',
    'show',
    'close',
    'icon',
  ],
  components: {},
  setup(props, context) {
    const i18n = useI18n();

    const state = reactive({
      opened: false,
    });

    const methods = {
      init: () => {
        if (props.triggerOpen) {
          state.opened = true;
          context.emit('show');
          context.emit('update:triggerOpen', false);
        }
      },
    };

    watch(
      () => props.triggerOpen,
      (v: boolean) => {
        if (v) {
          state.opened = true;
          context.emit('show');
          context.emit('update:triggerOpen', false);
        }
      }
    );

    watch(
      () => props.triggerClose,
      (v: boolean) => {
        if (v === true) {
          state.opened = false;
          context.emit('close');
          context.emit('update:triggerClose', false);
        }
      }
    );

    onMounted(() => {
      methods.init();
    });

    return {
      props,
      state,
      methods,
      emit: context.emit,
      i18n: i18n,
    };
  },
});
</script>

<style scoped lang="scss">
.my-modal {
  height: 70vh;
}
</style>
