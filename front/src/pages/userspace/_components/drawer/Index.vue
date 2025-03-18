<template>
  <q-drawer
    v-model="drawer.sharedState.showDrawer"
    show-if-above
    :width="200"
    :breakpoint="500"
    elevated
    bordered
    behavior="desktop"
    :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'"
  >
    <q-scroll-area class="fit">
      <q-list>
        <template
          v-for="(menuItem, index) in computedState.menuList"
          :key="index"
        >
          <q-item
            clickable
            :active="menuItem.isActive()"
            v-ripple
            @click="menuItem.action()"
            active-class="active"
          >
            <q-item-section avatar>
              <q-icon :name="menuItem.icon" />
            </q-item-section>
            <q-item-section>
              {{ menuItem.label }}
            </q-item-section>
          </q-item>
          <q-separator :key="'sep' + index" v-if="menuItem.separator" />
        </template>
      </q-list>
    </q-scroll-area>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { menu } from './menu';
import { useDrawer } from './use-drawer';
import { useRouter } from 'vue-router';

export default defineComponent({
  props: {
    showDrawer: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:showDrawer'],
  setup(props) {
    const drawer = useDrawer();
    const router = useRouter();
    const state = reactive({});

    const computedState = computed(() => {
      return {
        menuList: menu(router),
      };
    });

    return {
      state,
      computedState,
      drawer,
    };
  },
});
</script>

<style scoped lang="scss">
.active {
  color: var(--accent);
}
</style>
