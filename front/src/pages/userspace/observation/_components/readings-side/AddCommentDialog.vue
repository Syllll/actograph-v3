<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      :title="dialogTitle"
      size="sm"
      :cancelLabel="t('dialogs.cancel')"
      :submitLabel="submitLabel"
      :submitDisable="!isValid"
      @cancel="onCancelClick"
      @submit="onOKClick"
    >
      <q-input
        ref="commentInputRef"
        v-model="state.commentText"
        :placeholder="t('readingsUi.addCommentPrompt')"
        outlined
        dense
        autofocus
        hide-bottom-space
        class="add-comment-input"
        :rules="[validateComment]"
        @keyup.enter="onOKClick"
      />
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, ref, onMounted, nextTick } from 'vue';
import type { QInput } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useDialogPluginComponent } from 'quasar';
import { DDialogCard } from '@lib-improba/components';

export default defineComponent({
  name: 'AddCommentDialog',
  components: { DDialogCard },
  emits: [...useDialogPluginComponent.emits],
  props: {
    initialText: {
      type: String,
      default: '',
    },
    edit: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const commentInputRef = ref<QInput | null>(null);
    const state = reactive({
      commentText: props.initialText,
    });

    const dialogTitle = computed(() =>
      props.edit
        ? t('readingsUi.editCommentTitle')
        : t('readingsUi.addCommentTitle'),
    );

    const submitLabel = computed(() =>
      props.edit
        ? t('readingsUi.popupValidate')
        : t('readingsUi.addCommentOk'),
    );

    onMounted(() => {
      void nextTick(() => {
        commentInputRef.value?.focus();
        if (props.edit) {
          commentInputRef.value?.select();
        }
      });
    });

    const isValid = computed(() => state.commentText.trim().length > 0);

    const validateComment = (val: string | null | undefined): boolean | string =>
      Boolean(val && val.trim().length > 0) || t('readingsUi.addCommentRequired');

    const onOKClick = () => {
      if (!isValid.value) return;
      onDialogOK(state.commentText.trim());
    };

    return {
      t,
      dialogRef,
      onDialogHide,
      commentInputRef,
      state,
      isValid,
      dialogTitle,
      submitLabel,
      onOKClick,
      onCancelClick: onDialogCancel,
      validateComment,
    };
  },
});
</script>

<style scoped lang="scss">
.add-comment-input {
  width: 100%;
}
</style>
