<template>
  <Layout>
    <DPage>
      <div class="fit row q-gutter-x-sm">
        <div class="col-3 bg-secondary-medium">
          <DScrollArea class="fit">
            <DList>
              <DItem
                v-for="item of stateless.list"
                :key="item.name"
                :to="!item.children ? item.route : undefined"
              >
                <DItemSection>
                  <DItemLabel>
                    {{ item.name }}
                  </DItemLabel>
                  <DItemLabel caption v-if="item.description">
                    {{ item.description }}
                  </DItemLabel>
                </DItemSection>
                <DItemSection v-if="item.children">
                  <DList dense>
                    <DItem
                      v-for="child of (item.children as any)"
                      :key="child.name"
                      :to="!child.children ? child.route : undefined"
                    >
                      <DItemSection>
                        <DItemLabel>
                          {{ child.name }}
                        </DItemLabel>
                      </DItemSection>
                    </DItem>
                  </DList>
                </DItemSection>
              </DItem>
            </DList>
          </DScrollArea>
        </div>
        <div class="col">
          <DScrollArea class="fit">
            <router-view />
          </DScrollArea>
        </div>
      </div>
    </DPage>
  </Layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { list } from './list';
import Layout from '@lib-improba/components/layouts/empty/Index.vue';

export default defineComponent({
  components: { Layout },
  setup() {
    const stateless = {
      list,
    };
    return {
      stateless,
    };
  },
});
</script>
