<template>
  <DDrawer
    :modelValue="state.showDrawer"
    persistent
    :class="'bg-secondary-medium text-text-invert'"
  >
    <div class="text-h6 q-py-sm text-center">BAJAMA</div>
    <DList>
      <DItem
        v-for="(item, index) in stateless.menuItems"
        :key="index"
        :clickable="item.action !== undefined"
        @click="item.action()"
        :class="{
          'bg-success-high': $router.currentRoute.value.name.startsWith(
            item.name
          ),
        }"
      >
        <DItemSection>
          <DItemLabel class="text-text-invert">
            {{ item.label }}
          </DItemLabel>
        </DItemSection>
      </DItem>
    </DList>
  </DDrawer>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { menuItems } from './menu-items';

export default defineComponent({
  components: {},
  setup() {
    const stateless = {
      menuItems: menuItems(),
    };
    const state = reactive({
      showDrawer: true,
    });
    return { stateless, state };
  },
});
</script>
