<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 400px"
      bgColor="background"
      innerHeader
      title="Créer une chronique"
    >
      <DCardSection>
        <div class="column q-gutter-md">
          <q-input
            v-model="state.name"
            placeholder="Nom de la chronique"
            outlined
            dense
            :rules="[(val) => (val && val.length > 0) || 'Le nom est requis']"
          />
          <q-input
            v-model="state.description"
            placeholder="Description (optionnel)"
            outlined
            dense
            type="textarea"
            :rows="4"
            class="q-mb-md"
          />
        </div>
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" />
          <DSubmitBtn
            label="Créer"
            @click="onOKClick"
            :disable="!state.name || state.name.trim().length === 0"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import {
  DCard,
  DCardSection,
  DCancelBtn,
  DSubmitBtn,
} from '@lib-improba/components';

export default defineComponent({
  name: 'CreateObservationDialog',
  components: {
    DCard,
    DCardSection,
    DCancelBtn,
    DSubmitBtn,
  },
  setup() {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const state = reactive({
      name: '',
      description: '',
    });

    const methods = {
      onOKClick: () => {
        onDialogOK({
          name: state.name.trim(),
          description: state.description.trim() || undefined,
        });
      },
      onCancelClick: () => {
        onDialogCancel();
      },
    };

    return {
      dialogRef,
      state,
      methods,
      onDialogHide,
      onOKClick: methods.onOKClick,
      onCancelClick: methods.onCancelClick,
    };
  },
});
</script>

