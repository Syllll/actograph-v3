<template>
  <DPage>
    <div class="fit row q-pa-md">
      <div class="col-12">
        <div v-if="state.currentProtocol">
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ computedState.pageHeading.value }}</div>
            <p v-if="state.currentProtocol.description">
              {{ state.currentProtocol.description }}
            </p>

            <div class="row q-gutter-sm q-mb-md">
              <q-btn
                icon="mdi-plus"
                :label="$t('protocolUi.addCategory')"
                class="protocol-cta-btn"
                outline
                color="accent"
                no-caps
                :disable="!state.currentProtocol?.id"
                @click="methods.startInlineCategoryAdd"
              />
              <q-btn
                icon="mdi-binoculars"
                :label="$t('protocolUi.goToObservation')"
                class="protocol-cta-btn"
                outline
                color="accent"
                no-caps
                :disable="!observation.sharedState.currentObservation?.id"
                @click="methods.goToObservation"
              />
            </div>

            <div v-if="state.treeData.length === 0" class="protocol-empty q-pa-md">
              <p class="text-body1 q-mb-md text-grey-8">
                {{ $t('protocolUi.emptyState') }}
              </p>
              <ProtocolInlineAddFields
                ref="emptyCategoryInlineRef"
                mode="category"
                :autofocus="true"
                @commit="methods.commitInlineCategory"
                @cancel="methods.cancelInlineCategory"
              />
            </div>

            <div v-if="state.treeData.length > 0">
              <q-tree
                :nodes="displayTreeData"
                node-key="id"
                label-key="name"
                v-model:expanded="state.expandedNodes"
              >
                <template v-slot:default-header="prop">
                  <div
                    v-if="prop.node.type === INLINE_OBSERVABLE_DRAFT_TYPE"
                    class="protocol-tree-header protocol-tree-header--draft row items-start no-wrap q-py-xs"
                  >
                    <div class="col min-width-0">
                      <ProtocolInlineAddFields
                        :ref="(el) => methods.setObservableInlineRef(prop.node.categoryId, el)"
                        mode="observable"
                        :autofocus="state.focusObservableDraftCategoryId === prop.node.categoryId"
                        @commit="(payload) => methods.commitInlineObservable(prop.node.categoryId, payload)"
                        @cancel="methods.cancelInlineObservable(prop.node.categoryId)"
                      />
                    </div>
                  </div>
                  <div
                    v-else
                    class="protocol-tree-header row items-center no-wrap"
                    :class="{
                      'protocol-tree-header--drop-target':
                        state.dropTargetKey === methods.dropTargetKey(prop.node),
                    }"
                    @dragover.prevent="methods.onRowDragOver(prop.node, $event)"
                    @dragleave="methods.onRowDragLeave(prop.node)"
                    @drop.prevent="methods.onRowDrop(prop.node, $event)"
                  >
                    <q-btn
                      flat
                      round
                      dense
                      size="xs"
                      icon="mdi-drag"
                      class="protocol-drag-handle col-auto"
                      :aria-label="$t('protocolUi.dragToReorder')"
                      draggable="true"
                      @dragstart="methods.onDragStart(prop.node, $event)"
                      @dragend="methods.onDragEnd"
                      @click.stop
                    />
                    <div
                      class="protocol-tree-header__label col row items-center min-width-0"
                    >
                      <div
                        class="text-weight-medium ellipsis protocol-tree-header__name"
                        :title="
                          methods.itemDescription(prop.node)
                            ? undefined
                            : prop.node.name
                        "
                      >
                        {{ prop.node.name }}
                        <q-tooltip
                          v-if="methods.itemDescription(prop.node)"
                          anchor="top middle"
                          self="bottom middle"
                          :offset="[0, 6]"
                        >
                          {{ methods.itemDescription(prop.node) }}
                        </q-tooltip>
                      </div>
                      <q-badge
                        v-if="prop.node.type === 'category' && prop.node.action"
                        color="primary"
                        class="q-ml-sm"
                      >
                        {{ methods.categoryActionLabel(prop.node.action) }}
                      </q-badge>
                    </div>

                    <div
                      v-if="prop.node.type === 'category'"
                      class="protocol-tree-header__actions col-auto"
                    >
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="accent"
                          icon="arrow_upward"
                          :disable="methods.getCategoryIndex(prop.node) <= 0 || state.movingCategory"
                          :loading="state.movingCategory"
                          @click.stop="methods.moveCategoryUp(prop.node)"
                        >
                          <q-tooltip>Monter</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="accent"
                          icon="arrow_downward"
                          :disable="
                            methods.getCategoryIndex(prop.node) >= state.treeData.length - 1 ||
                            state.movingCategory
                          "
                          :loading="state.movingCategory"
                          @click.stop="methods.moveCategoryDown(prop.node)"
                        >
                          <q-tooltip>Descendre</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          icon="content_copy"
                          :disable="state.duplicatingCategory"
                          :loading="state.duplicatingCategory"
                          @click.stop="methods.duplicateCategory(prop.node)"
                        >
                          <q-tooltip>Dupliquer la catégorie</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="primary"
                          icon="edit"
                          @click.stop="methods.openEditCategoryModal(prop.node)"
                        >
                          <q-tooltip>Modifier</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="dark"
                          icon="delete"
                          @click.stop="methods.openRemoveCategoryModal(prop.node)"
                        >
                          <q-tooltip>Supprimer</q-tooltip>
                        </q-btn>
                      </div>
                    </div>

                    <div
                      v-if="prop.node.type === 'observable'"
                      class="protocol-tree-header__actions col-auto"
                    >
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="accent"
                          icon="arrow_upward"
                          :disable="!methods.canMoveObservableUp(prop.node) || state.movingObservable"
                          :loading="state.movingObservable"
                          @click.stop="methods.moveObservableUp(prop.node)"
                        >
                          <q-tooltip>Monter</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="accent"
                          icon="arrow_downward"
                          :disable="
                            !methods.canMoveObservableDown(prop.node) || state.movingObservable
                          "
                          :loading="state.movingObservable"
                          @click.stop="methods.moveObservableDown(prop.node)"
                        >
                          <q-tooltip>Descendre</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          icon="drive_file_move_outline"
                          @click.stop="methods.openMoveObservableModal(prop.node)"
                        >
                          <q-tooltip>Déplacer vers une autre catégorie</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="primary"
                          icon="edit"
                          @click.stop="methods.openEditObservableModal(prop.node)"
                        >
                          <q-tooltip>Modifier</q-tooltip>
                        </q-btn>
                      </div>
                      <div class="protocol-tree-header__action-cell">
                        <q-btn
                          flat
                          round
                          dense
                          size="xs"
                          color="dark"
                          icon="delete"
                          @click.stop="methods.openRemoveObservableModal(prop.node)"
                        >
                          <q-tooltip>Supprimer</q-tooltip>
                        </q-btn>
                      </div>
                    </div>
                  </div>
                </template>
              </q-tree>

              <div v-if="state.addingCategoryInline" class="q-mt-md q-pl-lg">
                <ProtocolInlineAddFields
                  ref="extraCategoryInlineRef"
                  mode="category"
                  :autofocus="true"
                  @commit="methods.commitInlineCategory"
                  @cancel="methods.cancelInlineCategoryAdd"
                />
              </div>
            </div>
          </q-card-section>
        </div>
      </div>
    </div>

    <!-- Composants modales -->
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

    <MoveObservableModal
      v-model="state.moveObservableModal"
      :observable="state.selectedObservable"
      :source-category-id="state.selectedObservableCategoryId"
      :categories="state.treeData"
      @observable-moved="
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
  computed,
  type ComponentPublicInstance,
} from 'vue';
import {
  ProtocolItem,
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
  protocolService,
  isObservableNameInUse,
  moveObservableToCategory,
} from '@services/observations/protocol.service';
import { useRouter } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import EditCategoryModal from './_components/EditCategoryModal.vue';
import RemoveCategoryModal from './_components/RemoveCategoryModal.vue';
import EditObservableModal from './_components/EditObservableModal.vue';
import ProtocolInlineAddFields from './_components/ProtocolInlineAddFields.vue';
import type { ProtocolInlineAddFieldsExpose } from './_components/ProtocolInlineAddFields.vue';
import RemoveObservableModal from './_components/RemoveObservableModal.vue';
import MoveObservableModal from './_components/MoveObservableModal.vue';

const INLINE_OBSERVABLE_DRAFT_TYPE = 'inline-observable-draft';

const resolveInlineAddExpose = (
  el: Element | ComponentPublicInstance | null
): ProtocolInlineAddFieldsExpose | null => {
  if (!el || el instanceof Element) {
    return null;
  }
  const exposed = el as unknown as ProtocolInlineAddFieldsExpose;
  if (
    typeof exposed.reset === 'function' &&
    typeof exposed.focusName === 'function' &&
    typeof exposed.finishCommit === 'function'
  ) {
    return exposed;
  }
  return null;
};

export default defineComponent({
  components: {
    EditCategoryModal,
    RemoveCategoryModal,
    EditObservableModal,
    RemoveObservableModal,
    MoveObservableModal,
    ProtocolInlineAddFields,
  },

  setup() {
    const router = useRouter();
    const observation = useObservation();
    const protocol = observation.protocol;
    const $q = useQuasar();
    const { t, locale } = useI18n();

    const emptyCategoryInlineRef = ref<ProtocolInlineAddFieldsExpose | null>(null);
    const extraCategoryInlineRef = ref<ProtocolInlineAddFieldsExpose | null>(null);
    const observableInlineRefs = new Map<string, ProtocolInlineAddFieldsExpose | null>();

    const displayTreeData = computed(() => {
      return state.treeData.map((category) => {
        if (category.type !== ProtocolItemTypeEnum.Category) {
          return category;
        }
        const realChildren = (category.children || []).filter(
          (child: { type?: string }) => child.type !== INLINE_OBSERVABLE_DRAFT_TYPE
        );
        return {
          ...category,
          children: [
            ...realChildren,
            {
              id: `inline-obs-draft-${category.id}`,
              type: INLINE_OBSERVABLE_DRAFT_TYPE,
              categoryId: category.id,
              name: '',
            },
          ],
        };
      });
    });

    const computedState = {
      pageHeading: computed(() => {
        void locale.value;
        const chronicleName =
          observation.sharedState.currentObservation?.name?.trim() ?? '';
        return t('protocolUi.pageHeading', { chronicleName });
      }),
    };

    // Validate protocol service
    if (!protocol || !protocol.methods) {
      throw new Error('Protocol service is not properly initialized');
    }

    const state = reactive({
      loading: true,
      currentProtocol: null as any,
      treeData: [] as any[],
      expandedNodes: [] as string[],

      addingCategoryInline: false,
      focusObservableDraftCategoryId: '' as string,
      dropTargetKey: '' as string,
      dragPayload: null as {
        kind: 'category' | 'observable';
        id: string;
        categoryId?: string;
      } | null,

      editCategoryModal: false,
      removeCategoryModal: false,
      editObservableModal: false,
      removeObservableModal: false,
      moveObservableModal: false,

      // Pour la catégorie sélectionnée
      selectedCategory: null as ProtocolItem | null,
      selectedCategoryIndex: 0,
      // Pour l'observable sélectionné
      selectedObservable: null as ProtocolItem | null,
      selectedObservableCategoryId: '',

      // Protection contre les doubles clics
      movingCategory: false,
      movingObservable: false,
      duplicatingCategory: false,
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
      categoryActionLabel: (action: string | undefined): string => {
        if (action === ProtocolItemActionEnum.Continuous) {
          return t('protocolUi.actionTypeContinuous');
        }
        if (action === ProtocolItemActionEnum.Discrete) {
          return t('protocolUi.actionTypeDiscrete');
        }
        return action ?? '';
      },

      itemDescription: (node: { description?: string }): string => {
        const description = node.description?.trim();
        return description ?? '';
      },

      goToObservation: () => {
        if (!observation.sharedState.currentObservation?.id) {
          return;
        }
        router.push({ name: 'user_observation' });
      },

      findObservableById: (observableId: string): ProtocolItem | null => {
        for (const category of state.treeData) {
          if (
            category.type === ProtocolItemTypeEnum.Category &&
            category.children
          ) {
            const match = category.children.find(
              (child: ProtocolItem) => child.id === observableId
            );
            if (match) {
              return match;
            }
          }
        }
        return null;
      },

      getObservableLocation: (
        observableId: string
      ): { categoryId: string; index: number; total: number } | null => {
        for (const category of state.treeData) {
          if (category.type === ProtocolItemTypeEnum.Category && category.children) {
            const index = category.children.findIndex((o: any) => o.id === observableId);
            if (index !== -1) {
              return {
                categoryId: category.id,
                index,
                total: category.children.length,
              };
            }
          }
        }
        return null;
      },

      getCategoryIndex: (category: ProtocolItem): number => {
        return state.treeData.findIndex((c) => c.id === category.id);
      },

      canMoveObservableUp: (observable: ProtocolItem): boolean => {
        const location = methods.getObservableLocation(observable.id);
        return !!location && location.index > 0;
      },

      canMoveObservableDown: (observable: ProtocolItem): boolean => {
        const location = methods.getObservableLocation(observable.id);
        return !!location && location.index < location.total - 1;
      },

      moveObservableUp: async (observable: ProtocolItem) => {
        if (state.movingObservable) return;
        const location = methods.getObservableLocation(observable.id);
        if (!location || location.index <= 0) return;
        if (!protocol?.methods || !state.currentProtocol?.id) return;
        state.movingObservable = true;
        try {
          await protocol.methods.editProtocolItem({
            id: observable.id,
            protocolId: state.currentProtocol.id,
            type: ProtocolItemTypeEnum.Observable,
            order: location.index - 1,
          });
          await methods.loadProtocol();
          ensureCategoryExpanded(location.categoryId);
        } catch (error) {
          console.error('Failed to move observable up:', error);
          $q.notify({ type: 'negative', message: t('protocolUi.moveObservableFailed') });
        } finally {
          state.movingObservable = false;
        }
      },

      moveObservableDown: async (observable: ProtocolItem) => {
        if (state.movingObservable) return;
        const location = methods.getObservableLocation(observable.id);
        if (!location || location.index >= location.total - 1) return;
        if (!protocol?.methods || !state.currentProtocol?.id) return;
        state.movingObservable = true;
        try {
          await protocol.methods.editProtocolItem({
            id: observable.id,
            protocolId: state.currentProtocol.id,
            type: ProtocolItemTypeEnum.Observable,
            order: location.index + 1,
          });
          await methods.loadProtocol();
          ensureCategoryExpanded(location.categoryId);
        } catch (error) {
          console.error('Failed to move observable down:', error);
          $q.notify({ type: 'negative', message: t('protocolUi.moveObservableFailed') });
        } finally {
          state.movingObservable = false;
        }
      },

      moveCategoryUp: async (category: ProtocolItem) => {
        if (state.movingCategory) return;
        const currentIndex = methods.getCategoryIndex(category);
        if (currentIndex <= 0) return;
        if (!protocol?.methods || !state.currentProtocol?.id) return;
        state.movingCategory = true;
        try {
          await protocol.methods.editProtocolItem({
            id: category.id,
            protocolId: state.currentProtocol.id,
            type: ProtocolItemTypeEnum.Category,
            order: currentIndex - 1,
          });
          await methods.loadProtocol();
        } catch (error) {
          console.error('Failed to move category up:', error);
          $q.notify({ type: 'negative', message: t('protocolUi.moveCategoryFailed') });
        } finally {
          state.movingCategory = false;
        }
      },

      moveCategoryDown: async (category: ProtocolItem) => {
        if (state.movingCategory) return;
        const currentIndex = methods.getCategoryIndex(category);
        const totalCategories = state.treeData.length;
        if (currentIndex >= totalCategories - 1) return;
        if (!protocol?.methods || !state.currentProtocol?.id) return;
        state.movingCategory = true;
        try {
          await protocol.methods.editProtocolItem({
            id: category.id,
            protocolId: state.currentProtocol.id,
            type: ProtocolItemTypeEnum.Category,
            order: currentIndex + 1,
          });
          await methods.loadProtocol();
        } catch (error) {
          console.error('Failed to move category down:', error);
          $q.notify({ type: 'negative', message: t('protocolUi.moveCategoryFailed') });
        } finally {
          state.movingCategory = false;
        }
      },

      dropTargetKey: (node: { type?: string; id?: string }): string => {
        if (!node?.type || node.type === INLINE_OBSERVABLE_DRAFT_TYPE || !node.id) {
          return '';
        }
        return `${node.type}-${node.id}`;
      },

      setObservableInlineRef: (
        categoryId: string,
        el: Element | ComponentPublicInstance | null
      ) => {
        const resolved = resolveInlineAddExpose(el);
        if (resolved) {
          observableInlineRefs.set(categoryId, resolved);
        } else {
          observableInlineRefs.delete(categoryId);
        }
      },

      startInlineCategoryAdd: async () => {
        if (state.treeData.length === 0) {
          await nextTick();
          emptyCategoryInlineRef.value?.focusName();
          return;
        }
        state.addingCategoryInline = true;
        await nextTick();
        extraCategoryInlineRef.value?.focusName();
      },

      cancelInlineCategory: () => {
        emptyCategoryInlineRef.value?.reset();
      },

      cancelInlineCategoryAdd: () => {
        state.addingCategoryInline = false;
        extraCategoryInlineRef.value?.reset();
      },

      commitInlineCategory: async (payload: {
        name: string;
        description: string;
        action: ProtocolItemActionEnum;
      }) => {
        const inlineRef =
          state.treeData.length === 0
            ? emptyCategoryInlineRef.value
            : extraCategoryInlineRef.value;

        if (!state.currentProtocol?.id || !protocol?.methods) {
          inlineRef?.finishCommit(false);
          return;
        }

        try {
          await protocol.methods.addCategory({
            protocolId: state.currentProtocol.id,
            name: payload.name,
            description: payload.description || undefined,
            order: state.treeData.length,
            action: payload.action,
            type: ProtocolItemTypeEnum.Category,
          });

          $q.notify({
            type: 'positive',
            message: t('protocolUi.categoryAdded'),
          });

          inlineRef?.finishCommit(true);
          state.addingCategoryInline = false;
          await methods.loadProtocol();
          const lastCategory = state.treeData[state.treeData.length - 1];
          if (lastCategory?.id) {
            ensureCategoryExpanded(lastCategory.id);
          }
        } catch (error) {
          console.error('Failed to add category inline:', error);
          $q.notify({
            type: 'negative',
            message: t('protocolUi.errAddCategoryFailed'),
          });
          inlineRef?.finishCommit(false);
        }
      },

      cancelInlineObservable: (_categoryId: string) => {
        const inlineRef = observableInlineRefs.get(_categoryId);
        inlineRef?.reset();
      },

      commitInlineObservable: async (
        categoryId: string,
        payload: { name: string; description: string }
      ) => {
        const inlineRef = observableInlineRefs.get(categoryId);

        if (!state.currentProtocol?.id || !protocol?.methods) {
          inlineRef?.finishCommit(false);
          return;
        }

        const items = state.currentProtocol._items ?? state.treeData;
        if (isObservableNameInUse(items, payload.name)) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.errObservableNameAlreadyUsed', {
              name: payload.name,
            }),
          });
          inlineRef?.finishCommit(false);
          return;
        }

        const category = state.treeData.find((c) => c.id === categoryId);
        const childCount = (category?.children || []).filter(
          (child: { type?: string }) => child.type !== INLINE_OBSERVABLE_DRAFT_TYPE
        ).length;

        try {
          await protocol.methods.addObservable({
            protocolId: state.currentProtocol.id,
            parentId: categoryId,
            name: payload.name,
            description: payload.description || undefined,
            order: childCount,
            type: ProtocolItemTypeEnum.Observable,
          });

          $q.notify({
            type: 'positive',
            message: t('protocolUi.observableAdded'),
          });

          inlineRef?.finishCommit(true);
          state.focusObservableDraftCategoryId = categoryId;
          await methods.loadProtocol();
          ensureCategoryExpanded(categoryId);
        } catch (error) {
          console.error('Failed to add observable inline:', error);
          $q.notify({
            type: 'negative',
            message: t('protocolUi.errAddObservableFailed'),
          });
          inlineRef?.finishCommit(false);
        }
      },

      onDragStart: (node: ProtocolItem, event: DragEvent) => {
        if ((node as { type?: string }).type === INLINE_OBSERVABLE_DRAFT_TYPE) {
          event.preventDefault();
          return;
        }
        if (node.type === ProtocolItemTypeEnum.Category) {
          state.dragPayload = { kind: 'category', id: node.id };
        } else if (node.type === ProtocolItemTypeEnum.Observable) {
          const location = methods.getObservableLocation(node.id);
          if (!location) {
            event.preventDefault();
            return;
          }
          state.dragPayload = {
            kind: 'observable',
            id: node.id,
            categoryId: location.categoryId,
          };
        } else {
          event.preventDefault();
          return;
        }
        event.dataTransfer?.setData('text/plain', node.id);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
        }
      },

      onDragEnd: () => {
        state.dragPayload = null;
        state.dropTargetKey = '';
      },

      onRowDragOver: (node: ProtocolItem, event: DragEvent) => {
        const payload = state.dragPayload;
        if (!payload || (node as { type?: string }).type === INLINE_OBSERVABLE_DRAFT_TYPE) {
          return;
        }
        if (payload.kind === 'category' && node.type === ProtocolItemTypeEnum.Category) {
          state.dropTargetKey = methods.dropTargetKey(node);
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
          }
        } else if (payload.kind === 'observable' && payload.categoryId) {
          if (
            node.type === ProtocolItemTypeEnum.Category &&
            node.id !== payload.categoryId
          ) {
            state.dropTargetKey = methods.dropTargetKey(node);
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = 'move';
            }
          } else if (
            node.type === ProtocolItemTypeEnum.Observable &&
            methods.getObservableLocation(node.id)
          ) {
            state.dropTargetKey = methods.dropTargetKey(node);
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = 'move';
            }
          }
        }
      },

      onRowDragLeave: (node: ProtocolItem) => {
        if (state.dropTargetKey === methods.dropTargetKey(node)) {
          state.dropTargetKey = '';
        }
      },

      onRowDrop: async (node: ProtocolItem, event: DragEvent) => {
        event.stopPropagation();
        const payload = state.dragPayload;
        state.dropTargetKey = '';
        if (!payload || !state.currentProtocol?.id || !protocol?.methods) {
          methods.onDragEnd();
          return;
        }

        if (
          payload.kind === 'category' &&
          node.type === ProtocolItemTypeEnum.Category &&
          payload.id !== node.id
        ) {
          const fromIndex = methods.getCategoryIndex({ id: payload.id } as ProtocolItem);
          const toIndex = methods.getCategoryIndex(node);
          if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
            methods.onDragEnd();
            return;
          }
          state.movingCategory = true;
          try {
            await protocol.methods.editProtocolItem({
              id: payload.id,
              protocolId: state.currentProtocol.id,
              type: ProtocolItemTypeEnum.Category,
              order: toIndex,
            });
            await methods.loadProtocol();
          } catch (error) {
            console.error('Failed to reorder category:', error);
            $q.notify({ type: 'negative', message: t('protocolUi.moveCategoryFailed') });
          } finally {
            state.movingCategory = false;
          }
        } else if (payload.kind === 'observable' && payload.categoryId) {
          if (state.movingObservable) {
            methods.onDragEnd();
            return;
          }
          let targetCategoryId: string | null = null;

          if (
            node.type === ProtocolItemTypeEnum.Category &&
            node.id !== payload.categoryId
          ) {
            targetCategoryId = node.id;
          } else if (node.type === ProtocolItemTypeEnum.Observable) {
            const targetLocation = methods.getObservableLocation(node.id);
            if (
              targetLocation &&
              targetLocation.categoryId !== payload.categoryId &&
              payload.id !== node.id
            ) {
              targetCategoryId = targetLocation.categoryId;
            }
          }

          if (targetCategoryId) {
            const observable = methods.findObservableById(payload.id);
            if (!observable) {
              methods.onDragEnd();
              return;
            }
            const currentObservation = observation.sharedState.currentObservation;
            state.movingObservable = true;
            try {
              await moveObservableToCategory({
                observable,
                targetCategoryId,
                protocolId: state.currentProtocol.id,
                categories: state.treeData,
              });
              if (currentObservation) {
                await protocol.methods.loadProtocol(currentObservation);
              }
              await methods.loadProtocol();
              ensureCategoryExpanded(targetCategoryId);
              $q.notify({
                type: 'positive',
                message: t('protocolUi.moveObservableSuccess'),
              });
            } catch (error) {
              console.error('Failed to move observable to category:', error);
              $q.notify({
                type: 'negative',
                message: t('protocolUi.moveObservableFailed'),
              });
            } finally {
              state.movingObservable = false;
            }
            methods.onDragEnd();
            return;
          }

          if (
            node.type === ProtocolItemTypeEnum.Observable &&
            payload.id !== node.id
          ) {
            const targetLocation = methods.getObservableLocation(node.id);
            const sourceLocation = methods.getObservableLocation(payload.id);
            if (
              !targetLocation ||
              !sourceLocation ||
              targetLocation.categoryId !== sourceLocation.categoryId
            ) {
              methods.onDragEnd();
              return;
            }
            state.movingObservable = true;
            try {
              await protocol.methods.editProtocolItem({
                id: payload.id,
                protocolId: state.currentProtocol.id,
                type: ProtocolItemTypeEnum.Observable,
                order: targetLocation.index,
              });
              await methods.loadProtocol();
              ensureCategoryExpanded(targetLocation.categoryId);
            } catch (error) {
              console.error('Failed to reorder observable:', error);
              $q.notify({ type: 'negative', message: t('protocolUi.moveObservableFailed') });
            } finally {
              state.movingObservable = false;
            }
          }
        }
        methods.onDragEnd();
      },

      duplicateCategory: async (category: ProtocolItem) => {
        if (state.duplicatingCategory) return;
        if (!state.currentProtocol?.id || !protocol?.methods) return;
        const currentObservation = observation.sharedState.currentObservation;
        if (!currentObservation) return;
        state.duplicatingCategory = true;
        try {
          const protocolId = state.currentProtocol.id;
          const currentIndex = methods.getCategoryIndex(category);
          const newOrder = currentIndex + 1;

          const newCategory = await protocolService.addCategory({
            protocolId,
            name: `${category.name} (${t('dialogs.saveAs.copySuffix')})`,
            description: category.description,
            action: category.action,
            order: newOrder,
          });

          const children = category.children || [];
          const copySuffix = t('dialogs.saveAs.copySuffix');
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.type === ProtocolItemTypeEnum.Observable) {
              await protocolService.addObservable({
                protocolId,
                parentId: newCategory.id,
                name: `${child.name} (${copySuffix})`,
                description: child.description,
                order: i,
              });
            }
          }

          await protocol.methods.loadProtocol(currentObservation);
          await methods.loadProtocol();
          ensureCategoryExpanded(newCategory.id);

          $q.notify({
            type: 'positive',
            message: t('protocolUi.duplicateCategorySuccess'),
          });
        } catch (error) {
          console.error('Failed to duplicate category:', error);
          $q.notify({
            type: 'negative',
            message: t('protocolUi.duplicateCategoryFailed'),
          });
        } finally {
          state.duplicatingCategory = false;
        }
      },

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
            message: t('protocolUi.cannotEditCategory'),
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.serviceUnavailable'),
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
            message: t('protocolUi.cannotRemoveCategory'),
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.serviceUnavailable'),
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

      openEditObservableModal: (observable: ProtocolItem) => {
        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.cannotEditObservable'),
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.serviceUnavailable'),
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        const location = methods.getObservableLocation(observable.id);
        if (!location) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.parentCategoryNotFound'),
          });
          return;
        }

        // Créer une copie de l'observable avec la propriété order ajoutée
        const observableWithOrder = { 
          ...observable, 
          order: location.index 
        };

        state.selectedObservable = observableWithOrder;
        state.selectedObservableCategoryId = location.categoryId;
        state.editObservableModal = true;
      },

      openRemoveObservableModal: (observable: ProtocolItem) => {
        // Make sure we have a valid observable with an ID
        if (!observable || !observable.id) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.invalidObservable'),
          });
          return;
        }

        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.cannotRemoveObservable'),
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.serviceUnavailable'),
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        const location = methods.getObservableLocation(observable.id);
        if (!location) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.parentCategoryNotFound'),
          });
          return;
        }

        state.selectedObservable = observable;
        state.selectedObservableCategoryId = location.categoryId;
        state.removeObservableModal = true;
      },

      openMoveObservableModal: (observable: ProtocolItem) => {
        if (!observable || !observable.id) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.invalidObservable'),
          });
          return;
        }

        if (!state.currentProtocol?.id) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.cannotMoveObservable'),
          });
          return;
        }

        if (!protocol || !protocol.methods) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.serviceUnavailable'),
          });
          console.error(
            'Protocol service is not properly initialized:',
            protocol
          );
          return;
        }

        const location = methods.getObservableLocation(observable.id);
        if (!location) {
          $q.notify({
            type: 'negative',
            message: t('protocolUi.parentCategoryNotFound'),
          });
          return;
        }

        state.selectedObservable = observable;
        state.selectedObservableCategoryId = location.categoryId;
        state.moveObservableModal = true;
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
      computedState,
      displayTreeData,
      protocol,
      observation,
      ensureCategoryExpanded,
      emptyCategoryInlineRef,
      extraCategoryInlineRef,
      INLINE_OBSERVABLE_DRAFT_TYPE,
    };
  },
});
</script>

<style scoped lang="scss">
.protocol-cta-btn {
  background: #fff;
  border-radius: 0.5rem;
  font-weight: 500;
}

.protocol-tree-header {
  width: 100%;
}

.protocol-tree-header__label {
  min-width: 0;
}

.protocol-tree-header__name {
  cursor: default;
  max-width: 100%;
}

.protocol-tree-header__actions {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(5, 1.75rem);
  column-gap: 0.25rem;
  align-items: center;
  justify-items: center;
}

.protocol-tree-header__action-cell {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.protocol-tree-header--draft {
  width: 100%;
  padding-left: 1.75rem;
}

.protocol-tree-header--drop-target {
  outline: 1px dashed var(--accent);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

.protocol-drag-handle {
  cursor: grab;
  opacity: 0.55;
}

.protocol-drag-handle:active {
  cursor: grabbing;
}

:deep(.q-tree__node-header-content) {
  width: 100%;
}
</style>
