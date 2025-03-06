<template>
  <!-- notice dialogRef here -->
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="width: 90rem !important"
      bgColor="background"
      innerHeader
      title="Export de données"
    >
      <p
        v-if="showWarning"
        style="color: white; height: 20px; padding-top: 10px"
      >
        <q-icon v-if="showWarning" name="warning" color="white" size="xs" />
        <i v-if="showWarning" style="padding-left: 7px">
          Les données exportées sont uniquement celles visibles à l'écran
        </i>
      </p>
      <DCardSection>
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
      </DCardSection>

      <!-- buttons example -->
      <DCardSection>
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" />
          <DSubmitBtn
            label="Exporter"
            @click="onOKClick"
            :disable="state.name.length === 0"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue'
import { useDialogPluginComponent } from 'quasar'

export default defineComponent({
  components: {},
  props: {
    excelOnly: {
      type: Boolean,
      default: false,
    },
    showWarning: {
      type: Boolean,
      default: true,
    },
  },
  emits: [
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],

  setup() {
    // REQUIRED; must be called inside of setup()
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent()
    // dialogRef      - Vue ref to be applied to QDialog
    // onDialogHide   - Function to be used as handler for @hide on QDialog
    // onDialogOK     - Function to call to settle dialog with "ok" outcome
    //                    example: onDialogOK() - no payload
    //                    example: onDialogOK({ /*.../* }) - with payload
    // onDialogCancel - Function to call to settle dialog with "cancel" outcome

    const stateless = {
      typeOptions: [
        {
          label: 'CSV',
          value: 'csv',
        },
        {
          label: 'Excel',
          value: 'excel',
        },
      ],
      excelOption: [
        {
          label: 'Excel',
          value: 'excel',
        },
      ],
    }

    const state = reactive({
      name: '',
      type: 'excel',
    })

    return {
      // This is REQUIRED;
      // Need to inject these (from useDialogPluginComponent() call)
      // into the vue scope for the vue html template
      dialogRef,
      onDialogHide,

      // other methods that we used in our vue html template;
      // these are part of our example (so not required)
      onOKClick() {
        // on OK, it is REQUIRED to
        // call onDialogOK (with optional payload)
        onDialogOK({
          type: state.type,
          name: state.name,
        })
        // or with payload: onDialogOK({ ... })
        // ...and it will also hide the dialog automatically
      },

      // we can passthrough onDialogCancel directly
      onCancelClick: onDialogCancel,
      state,
      stateless,
    }
  },
})
</script>
