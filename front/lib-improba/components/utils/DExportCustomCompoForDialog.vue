<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <DDialogCard
      title="Export de données"
      size="xl"
      :cancelLabel="undefined"
      :submitLabel="'Exporter'"
      :submitDisable="state.name.length === 0"
      @submit="onOKClick"
      @cancel="onCancelClick"
    >
      <p v-if="showWarning" class="text-neutral-high q-pt-sm">
        <q-icon name="warning" size="xs" class="q-mr-xs" />
        <i>Les données exportées sont uniquement celles visibles à l'écran</i>
      </p>

      <DForm class="columns q-col-gutter-lg">
        <DFormInput
          label="Nom du fichier"
          :labelMinWidth="'10rem'"
          v-model="state.name"
        />
        <DFormInput label="Format du fichier" :labelMinWidth="'10rem'">
          <DBtnToggle
            v-if="!excelOnly"
            v-model="state.type"
            :options="stateless.typeOptions"
          />
          <DBtnToggle
            v-else
            v-model="state.type"
            :options="stateless.excelOption"
          />
        </DFormInput>
      </DForm>

      <template #actions>
        <DCancelBtn @click="onCancelClick" />
        <DSubmitBtn
          label="Exporter"
          @click="onOKClick"
          :disable="state.name.length === 0"
        />
      </template>
    </DDialogCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { DDialogCard, DCancelBtn, DSubmitBtn } from '@lib-improba/components';

export default defineComponent({
  components: { DDialogCard, DCancelBtn, DSubmitBtn },
  props: {
    excelOnly: {
      type: Boolean,
      default: false,
    },
    showWarning: {
      type: Boolean,
      default: true,
    },
    defaultFileName: {
      type: String,
      default: '',
    },
  },
  emits: [...useDialogPluginComponent.emits],
  setup(props) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();

    const stateless = {
      typeOptions: [
        { label: 'CSV', value: 'csv' },
        { label: 'Excel', value: 'excel' },
      ],
      excelOption: [
        { label: 'Excel', value: 'excel' },
      ],
    };

    const state = reactive({
      name: props.defaultFileName,
      type: 'excel',
    });

    return {
      dialogRef,
      onDialogHide,
      onOKClick() {
        onDialogOK({ type: state.type, name: state.name });
      },
      onCancelClick: onDialogCancel,
      state,
      stateless,
    };
  },
});
</script>
