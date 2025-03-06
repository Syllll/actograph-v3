<template>
  <DTabView
    :tabs="computedState.tabs"
    :useRouteQuery="true"
    @update:tab="state.tab = $event"
  >
    <template v-slot:actions>
      <div class="fit row">
        <DSpace />
        <DBtn label="Button 1" />
        <DBtn label="Button 2" />
      </div>
    </template>

    <template
      v-for="(tab, index) in computedState.tabs"
      :key="index"
      v-slot:[tab.name]
    >
      <!-- This will be replaced by the correct tab -->
      <component :is="tab.component" />
    </template>
  </DTabView>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { tabs, tabsComponents } from './components/tabs';

export default defineComponent({
  components: {
    ...tabsComponents,
  },
  setup() {
    const stateless = {
      tabs,
    };
    const state = reactive({
      tab: stateless.tabs[0].name,
    });
    const computedState = reactive({
      tabs: computed(() => stateless.tabs.filter((tab) => !!tab.visible())),
    });
    return {
      stateless,
      state,
      computedState,
    };
  },
});
</script>
