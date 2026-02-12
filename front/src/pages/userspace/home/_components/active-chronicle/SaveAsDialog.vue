<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 400px"
      bgColor="background"
      innerHeader
      title="Enregistrer sous un autre nom"
    >
      <DCardSection>
        <div class="column q-gutter-md">
          <q-input
            v-model="state.newName"
            placeholder="Nouveau nom de la chronique"
            outlined
            dense
            :rules="[(val) => (val && val.trim().length > 0) || 'Le nom est requis']"
            @keyup.enter="onOKClick"
          />
        </div>
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" />
          <DSubmitBtn
            label="Enregistrer"
            @click="onOKClick"
            :disable="!isValid"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import {
  DCard,
  DCardSection,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'SaveAsDialog',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
  props: {
    currentName: {
      type: String,
      default: '',
    },
  },
  emits: [...useDialogPluginComponent.emits],
  setup(props, { emit }) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      newName: props.currentName ? `${props.currentName} (copie)` : '',
    });

    const isValid = computed(() => {
      return state.newName && state.newName.trim().length > 0;
    });

    const onOKClick = () => {
      if (isValid.value) {
        onDialogOK(state.newName.trim());
      }
    };

    const onCancelClick = () => {
      onDialogCancel();
    };

    return {
      dialogRef,
      onDialogHide,
      state,
      isValid,
      onOKClick,
      onCancelClick,
    };
  },
});
</script>
