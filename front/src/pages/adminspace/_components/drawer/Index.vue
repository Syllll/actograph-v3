<template>
  <DDrawer
    :modelValue="drawer.sharedState.showDrawer"
    persistent
    :class="'bg-secondary-high text-text-invert'"
  >
    <div class="text-h6 q-py-sm text-center">{{ t('adminUsers.drawerTitle') }}</div>
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
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { buildAdminDrawerMenu } from './menu-items';
import { useDrawer } from 'src/composables/use-drawer';

export default defineComponent({
  components: {},
  setup() {
    const router = useRouter();
    const { t, locale } = useI18n();
    const drawer = useDrawer();
    const stateless = computed(() => {
      void locale.value;
      return {
        menuItems: buildAdminDrawerMenu(t, router),
      };
    });
    return { stateless, drawer, t };
  },
});
</script>
