<template>
  <DPage>
    <div class="fit row q-pa-md">
      <div class="col-12">
        <div v-if="state.currentProtocol">
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ state.currentProtocol.name }}</div>
            <p v-if="state.currentProtocol.description">
              {{ state.currentProtocol.description }}
            </p>

            <div class="row justify-end q-mb-md">
              <q-btn
                color="primary"
                icon="add"
                label="Ajouter une catégorie"
                @click="state.addCategoryModal = true"
                :disable="!state.currentProtocol?.id"
              />
            </div>

            <div v-if="state.treeData.length > 0">
              <q-tree
                :nodes="state.treeData"
                node-key="id"
                label-key="name"
                v-model:expanded="state.expandedNodes"
              >
                <template v-slot:default-header="prop">
                  <div class="row items-center">
                    <div class="text-weight-medium">{{ prop.node.name }}</div>
                    <q-badge
                      v-if="prop.node.type === 'category' && prop.node.action"
                      color="primary"
                      class="q-ml-sm"
                    >
                      {{ prop.node.action }}
                    </q-badge>

                    <q-space />

                    <div
                      v-if="prop.node.type === 'category'"
                      class="row q-gutter-sm"
                    >
                      <q-btn
                        flat
                        round
                        dense
                        color="positive"
                        icon="add"
                        @click.stop="methods.openAddObservableModal(prop.node)"
                      >
                        <q-tooltip>Ajouter un observable</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        color="primary"
                        icon="edit"
                        @click.stop="methods.openEditCategoryModal(prop.node)"
                      >
                        <q-tooltip>Modifier</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        color="negative"
                        icon="delete"
                        @click.stop="methods.openRemoveCategoryModal(prop.node)"
                      >
                        <q-tooltip>Supprimer</q-tooltip>
                      </q-btn>
                    </div>
                    
                    <div
                      v-if="prop.node.type === 'observable'"
                      class="row q-gutter-sm"
                    >
                      <q-btn
                        flat
                        round
                        dense
                        color="primary"
                        icon="edit"
                        @click.stop="methods.openEditObservableModal(prop.node)"
                      >
                        <q-tooltip>Modifier</q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        round
                        dense
                        color="negative"
                        icon="delete"
                        @click.stop="methods.openRemoveObservableModal(prop.node)"
                      >
                        <q-tooltip>Supprimer</q-tooltip>
                      </q-btn>
                    </div>
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

    <!-- Composants modales -->
    <AddCategoryModal
      v-model="state.addCategoryModal"
      :default-order="state.treeData.length"
      @category-added="methods.loadProtocol"
    />

    <EditCategoryModal
      v-model="state.editCategoryModal"
      :category="state.selectedCategory"
      :category-index="state.selectedCategoryIndex"
      @category-updated="methods.loadProtocol"
    />

    <RemoveCategoryModal
      v-model="state.removeCategoryModal"
      :category="state.selectedCategory"
      @category-removed="methods.loadProtocol"
    />

    <AddObservableModal
      v-model="state.addObservableModal"
      :category="state.selectedCategory"
      :default-order="state.selectedCategoryChildren.length"
      @observable-added="
        (categoryId) => {
          ensureCategoryExpanded(categoryId);
          methods.loadProtocol();
        }
      "
    />

    <EditObservableModal
      v-model="state.editObservableModal"
      :observable="state.selectedObservable"
      :category-id="state.selectedObservableCategoryId"
      @observable-updated="
        (categoryId) => {
          ensureCategoryExpanded(categoryId);
          methods.loadProtocol();
        }
      "
    />

    <RemoveObservableModal
      v-model="state.removeObservableModal"
      :observable="state.selectedObservable"
      :category-id="state.selectedObservableCategoryId"
      @observable-removed="
        (categoryId) => {
          ensureCategoryExpanded(categoryId);
          methods.loadProtocol();
        }
      "
    />
  </DPage>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  onMounted,
  ref,
  nextTick,
  watch,
} from 'vue';
import {
  ProtocolItem,
  ProtocolItemTypeEnum,
} from '@services/observations/protocol.service';
import { useRoute } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';
import { useQuasar } from 'quasar';
import AddCategoryModal from './_components/AddCategoryModal.vue';
import EditCategoryModal from './_components/EditCategoryModal.vue';
import RemoveCategoryModal from './_components/RemoveCategoryModal.vue';
import AddObservableModal from './_components/AddObservableModal.vue';
import EditObservableModal from './_components/EditObservableModal.vue';
import RemoveObservableModal from './_components/RemoveObservableModal.vue';

export default defineComponent({
  components: {
    AddCategoryModal,
    EditCategoryModal,
    RemoveCategoryModal,
    AddObservableModal,
    EditObservableModal,
    RemoveObservableModal,
  },

  setup() {
    const route = useRoute();
    const observation = useObservation();
    const protocol = observation.protocol;
    const $q = useQuasar();

    // Validate protocol service
    if (!protocol || !protocol.methods) {
      throw new Error('Protocol service is not properly initialized');
    }

    const state = reactive({
      loading: true,
      currentProtocol: null as any,
      treeData: [] as any[],
      expandedNodes: [] as string[],

      // Pour les modales
      addCategoryModal: false,
      editCategoryModal: false,
      removeCategoryModal: false,
      addObservableModal: false,
      editObservableModal: false,
      removeObservableModal: false,

      // Pour la catégorie sélectionnée
      selectedCategory: null as ProtocolItem | null,
      selectedCategoryIndex: 0,
      selectedCategoryChildren: [] as any[],

      // Pour l'observable sélectionné
      selectedObservable: null as ProtocolItem | null,
      selectedObservableCategoryId: '',
    });

    // Initial expansion of all category nodes (only called once at load time)
    const initialExpandAllNodes = () => {
      // Collect all category node IDs into an array
      const expandedNodeIds: string[] = [];

      state.treeData.forEach((node) => {
        if (node.type === ProtocolItemTypeEnum.Category) {
          expandedNodeIds.push(node.id);
        }
      });

      state.expandedNodes = expandedNodeIds;
    };

    // Ensure specific category is expanded
    const ensureCategoryExpanded = (categoryId: string) => {
      if (categoryId && !state.expandedNodes.includes(categoryId)) {
        state.expandedNodes = [...state.expandedNodes, categoryId];
      }
    };

    const methods = {
      loadProtocol: async () => {
        try {
          state.loading = true;

          const currentProtocol = observation.protocol.sharedState.currentProtocol;
          state.currentProtocol = currentProtocol;

          // Parse the items JSON string to get the protocol data
          if (currentProtocol && currentProtocol._items) {
            try {
              const items = currentProtocol._items;

              // Check if this is the first load or a reload
              const isFirstLoad = state.treeData.length === 0;
              state.treeData = items;

              // Only expand all nodes on first load
              if (isFirstLoad) {
                await nextTick();
                initialExpandAllNodes();
              }
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
      },

      openEditCategoryModal: (category: ProtocolItem) => {
        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message:
              'Impossible de modifier la catégorie : protocole non chargé',
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: 'Service de protocole non disponible',
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        // Trouver l'index de la catégorie dans le tableau
        const categoryIndex = state.treeData.findIndex(
          (c) => c.id === category.id
        );

        state.selectedCategory = category;
        state.selectedCategoryIndex = categoryIndex;
        state.editCategoryModal = true;
      },

      openRemoveCategoryModal: (category: ProtocolItem) => {
        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message:
              'Impossible de supprimer la catégorie : protocole non chargé',
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: 'Service de protocole non disponible',
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        state.selectedCategory = category;
        state.removeCategoryModal = true;
      },

      openAddObservableModal: (category: ProtocolItem) => {
        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message:
              "Impossible d'ajouter un observable : protocole non chargé",
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: 'Service de protocole non disponible',
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        state.selectedCategory = category;
        state.selectedCategoryChildren = category.children || [];
        state.addObservableModal = true;
      },

      openEditObservableModal: (observable: ProtocolItem) => {
        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message:
              "Impossible de modifier l'observable : protocole non chargé",
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: 'Service de protocole non disponible',
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        // Trouver la catégorie parente et l'ordre (index) de l'observable
        let categoryId = '';
        let observableOrder = 0;
        
        for (const category of state.treeData) {
          if (category.type === ProtocolItemTypeEnum.Category && category.children) {
            const observableIndex = category.children.findIndex((o: any) => o.id === observable.id);
            if (observableIndex !== -1) {
              categoryId = category.id;
              observableOrder = observableIndex;
              break;
            }
          }
        }

        if (!categoryId) {
          $q.notify({
            type: 'negative',
            message: "Impossible de trouver la catégorie parente de l'observable",
          });
          return;
        }

        // Créer une copie de l'observable avec la propriété order ajoutée
        const observableWithOrder = { 
          ...observable, 
          order: observableOrder 
        };

        state.selectedObservable = observableWithOrder;
        state.selectedObservableCategoryId = categoryId;
        state.editObservableModal = true;
      },

      openRemoveObservableModal: (observable: ProtocolItem) => {
        // Make sure we have a valid observable with an ID
        if (!observable || !observable.id) {
          $q.notify({
            type: 'negative',
            message: 'Observable invalide ou identifiant manquant',
          });
          return;
        }

        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message:
              "Impossible de supprimer l'observable : protocole non chargé",
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: 'Service de protocole non disponible',
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        // Trouver la catégorie parente de l'observable
        let categoryId = '';
        
        for (const category of state.treeData) {
          if (category.type === ProtocolItemTypeEnum.Category && category.children) {
            const observableIndex = category.children.findIndex((o: any) => o.id === observable.id);
            if (observableIndex !== -1) {
              categoryId = category.id;
              break;
            }
          }
        }

        if (!categoryId) {
          $q.notify({
            type: 'negative',
            message: "Impossible de trouver la catégorie parente de l'observable",
          });
          return;
        }

        state.selectedObservable = observable;
        state.selectedObservableCategoryId = categoryId;
        state.removeObservableModal = true;
      },
    };

    // Refresh display when edit category modal closes (success, cancel, or after error)
    watch(
      () => state.editCategoryModal,
      (isOpen) => {
        if (!isOpen) {
          methods.loadProtocol();
        }
      }
    );

    onMounted(() => {
      methods.loadProtocol();
    });

    return {
      state,
      methods,
      protocol,
      observation,
      ensureCategoryExpanded,
    };
  },
});
</script>
