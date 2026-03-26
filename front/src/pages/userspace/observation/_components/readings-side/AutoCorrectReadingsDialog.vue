<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 700px; max-width: 900px"
      bgColor="background"
      innerHeader
      :title="t('readingsUi.autoCorrectDialogTitle')"
    >
      <DCardSection>
        <div v-if="actions.length === 0" class="text-body1 text-center q-pa-md">
          <q-icon name="check_circle" color="positive" size="48px" />
          <div class="q-mt-md">{{ t('readingsUi.autoCorrectNone') }}</div>
          <div class="text-caption text-grey-6 q-mt-xs">
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
      </DCardSection>

      <DCardSection v-if="actions.length > 0">
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" :label="t('dialogs.cancel')" />
          <DSubmitBtn
            :label="t('readingsUi.autoCorrectApply')"
            @click="onOKClick"
            color="accent"
          />
        </div>
      </DCardSection>
      
      <DCardSection v-else>
        <div class="row items-center justify-end full-width">
          <DSubmitBtn
            :label="t('help.close')"
            @click="onOKClick"
            color="primary"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useI18n } from 'vue-i18n';
import { DCard, DCardSection, DCancelBtn, DSubmitBtn } from '@lib-improba/components';

export interface AutoCorrectAction {
  type: 'sort' | 'remove_duplicate' | 'reorder' | 'add_missing_pause';
  description: string;
  readingIds?: number[];
  tempIds?: string[];
  newReading?: unknown;
}

export default defineComponent({
  name: 'AutoCorrectReadingsDialog',
  
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },

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
      switch (type) {
        case 'sort':
          return 'sort';
        case 'remove_duplicate':
          return 'delete';
        case 'reorder':
          return 'swap_vert';
        case 'add_missing_pause':
          return 'add_circle';
        default:
          return 'info';
      }
    };

    const getActionColor = (type: string): string => {
      switch (type) {
        case 'sort':
          return 'primary';
        case 'remove_duplicate':
          return 'negative';
        case 'reorder':
          return 'accent';
        case 'add_missing_pause':
          return 'positive';
        default:
          return 'grey';
      }
    };

    const onOKClick = () => {
      onDialogOK(true);
    };

    const onCancelClick = () => {
      onDialogCancel();
    };

    return {
      t,
      dialogRef,
      onDialogHide,
      onOKClick,
      onCancelClick,
      getActionIcon,
      getActionColor,
    };
  },
});
</script>

<style scoped>
</style>
