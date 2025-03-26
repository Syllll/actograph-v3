<template>
  <DPage>
    <div class="row q-pa-md">
      <div class="col-12">
        <div v-if="state.protocol">
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ state.protocol.name }}</div>
            <p v-if="state.protocol.description">{{ state.protocol.description }}</p>
            
            <div v-if="state.treeData.length > 0">
              <q-tree
                :nodes="state.treeData"
                node-key="id"
                label-key="name"
                default-expand-all
              >
                <template v-slot:default-header="prop">
                  <div class="row items-center">
                    <div class="text-weight-medium">{{ prop.node.name }}</div>
                    <q-badge v-if="prop.node.type === 'observable'" color="primary" class="q-ml-sm">
                      {{ prop.node.action || 'No action' }}
                    </q-badge>
                  </div>
                </template>
              </q-tree>
            </div>
            <div v-else class="text-center q-pa-md">
              <p>No protocol items found</p>
            </div>
          </q-card-section>
        </div>
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { protocolService } from '@services/observations/protocol.service';
import { useRoute } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  setup() {
    const route = useRoute();
    const observation = useObservation();
    const protocol = observation.protocol;
    
    const state = reactive({
      loading: true,
      protocol: null as any,
      treeData: [] as any[],
    });
    
    const loadProtocol = async () => {
      try {
        state.loading = true;

        const protocol = observation.sharedState.currentProtocol;
        state.protocol = protocol;

        // Parse the items JSON string to get the protocol data
        if (protocol && protocol._items) {
          try {
            const items = protocol._items;
            state.treeData = items;
          } catch (e) {
            console.error('Failed to parse protocol items:', e);
            state.treeData = [];
          }
        } else {
          state.treeData = [];
        }
      } catch (error) {
        console.error('Failed to load protocol:', error);
      } finally {
        state.loading = false;
      }
    };
    
    onMounted(() => {
      loadProtocol();
    });
    
    return {
      state,
    };
  },
});
</script>
