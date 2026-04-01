<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="t('readingsUi.autoCorrectDialogTitle')"
      size="xl"
    >
      <div v-if="actions.length === 0" class="text-body1 text-center q-pa-md">
        <q-icon name="check_circle" color="positive" size="48px" />
        <div class="q-mt-md">{{ t('readingsUi.autoCorrectNone') }}</div>
        <div class="text-caption text-neutral-high q-mt-xs">
          {{ t('readingsUi.autoCorrectNoneCaption') }}
        </div>
      </div>

      <div v-else class="column q-gutter-md">
        <div class="text-body2">
          {{ t('readingsUi.autoCorrectActionsIntro') }}
        </div>

        <q-list separator>
          <q-item
            v-for="(action, index) in actions"
            :key="index"
            class="q-pa-sm"
          >
            <q-item-section avatar>
              <q-icon
                :name="getActionIcon(action.type)"
                :color="getActionColor(action.type)"
                size="24px"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ action.description }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <template #actions>
        <template v-if="actions.length > 0">
          <DCancelBtn @click="onCancelClick" :label="t('dialogs.cancel')" />
          <DSubmitBtn :label="t('readingsUi.autoCorrectApply')" @click="onOKClick" />
        </template>
        <DSubmitBtn v-else :label="t('help.close')" @click="onOKClick" />
      </template>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useI18n } from 'vue-i18n';
import { DDialogCard, DCancelBtn, DSubmitBtn } from '@lib-improba/components';

export interface AutoCorrectAction {
  type: 'sort' | 'remove_duplicate' | 'reorder' | 'add_missing_pause';
  description: string;
  readingIds?: number[];
  tempIds?: string[];
  newReading?: unknown;
}

export default defineComponent({
  name: 'AutoCorrectReadingsDialog',
  components: { DDialogCard, DCancelBtn, DSubmitBtn },
  props: {
    actions: {
      type: Array as () => AutoCorrectAction[],
      required: true,
    },
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { t } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

    const getActionIcon = (type: string): string => {
      const icons: Record<string, string> = {
        sort: 'sort',
        remove_duplicate: 'delete',
        reorder: 'swap_vert',
        add_missing_pause: 'add_circle',
      };
      return icons[type] || 'info';
    };

    const getActionColor = (type: string): string => {
      const colors: Record<string, string> = {
        sort: 'primary',
        remove_duplicate: 'negative',
        reorder: 'accent',
        add_missing_pause: 'positive',
      };
      return colors[type] || 'grey';
    };

    return {
      t,
      dialogRef,
      onDialogHide,
      onOKClick: () => onDialogOK(true),
      onCancelClick: onDialogCancel,
      getActionIcon,
      getActionColor,
    };
  },
});
</script>
