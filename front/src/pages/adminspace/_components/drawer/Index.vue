<template>
  <DDrawer
    :modelValue="drawer.sharedState.showDrawer"
    persistent
    :class="'bg-secondary-high text-text-invert'"
  >
    <div class="text-h6 q-py-sm text-center">Admin</div>
    <DList>
      <DItem
        v-for="(item, index) in stateless.menuItems"
        :key="index"
        :clickable="item.action !== undefined"
        @click="item.action()"
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
import { useDrawer } from 'src/pages/userspace/_components/drawer/use-drawer';

export default defineComponent({
  components: {},
  setup() {
    const drawer = useDrawer();
    const stateless = {
      menuItems: menuItems(),
    };
    return { stateless, drawer };
  },
});
</script>
