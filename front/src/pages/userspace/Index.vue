<template>
  <StandardLayout :profileMenuItems="profileMenuItems">
    <Drawer> </Drawer>
    <router-view />
  </StandardLayout>
</template>

<script lang="ts">
import { defineComponent, inject, computed } from 'vue';
import StandardLayout from '@lib-improba/components/layouts/standard/Index.vue';
import Drawer from './_components/drawer/Index.vue';
import { userMenuItems } from '@lib-improba/components/layouts/standard/user-menu-items';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

export default defineComponent({
  components: { StandardLayout, Drawer },
  setup() {
    const i18n = useI18n();
    const router = useRouter();
    
    // Inject the autosave restore function from parent
    const autosaveRestore = inject<(() => void | Promise<void>) | undefined>('autosaveRestore');

    // Create menu items with autosave restore function
    const profileMenuItems = computed(() => {
      return userMenuItems(i18n, router, autosaveRestore);
    });

    return {
      profileMenuItems,
    };
  },
});
</script>
