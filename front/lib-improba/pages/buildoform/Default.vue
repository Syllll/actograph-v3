<template>
  <div>
    <h1 class="hover:bg-primary hover:text-italic smooth width-fit">Build'O'Form</h1>

    <build-o-form
      v-model="state.user"

      :fields="stateless.fields"
      :styles="{
        steps: stateless.stepStyle,
        row: stateless.rowStyle,
        field: stateless.fieldStyle,
      }"

      @event:field-touched="(e: IField) => methods.handleEvent('fieldTouched', e)"
      @event:model-updated="(e: any) => methods.handleEvent('modelUpdated', e)"
      @event:form-submitted="(e: boolean) => methods.handleEvent('formSubmitted', e)"
      @event:step-change="(e: IStep) => methods.handleEvent('stepChange', e)"

      @submit="methods.submit"
    >
      <template v-slot:firstbase-title="{ step }">
        Slot: {{ step.name }}
      </template>
      <template v-slot:firstbase-desc>
        eza
      </template>
    </build-o-form>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';


import { IField, IStep } from './../../components/buildoform/lib/interfaces/field.interface';
import { IStepStyle, IFieldStyle, IRowStyle } from './../../components/buildoform/lib/interfaces/style.interface';

import BuildOForm from './../../components/buildoform/Index.vue'
import { useQuasar } from 'quasar';

export default defineComponent({
  props: {},
  emits: [],
  components: {
    BuildOForm
  },
  setup(props, ctx) {
    const $q = useQuasar()

    const state = reactive({
      user: {
        id: 1337,
        firstName: null,
        lastName: 'Conda',
        gender: null,
        condition: 'scared',
        likes: '',
        footSize: 42,
        lastFullyChargedPhone: '1969-04-20'
      }
    });

    const stateless = {
      stepStyle: {
        container: 'q-ml-md',
        title: 'q-mb-none',
        desc: ''
      } as IStepStyle,

      rowStyle: {
        orientation: 'row',

        items: 'center',
        justify: 'center',

        colGutter: 'sm',
      } as IRowStyle,

      fieldStyle: {
        directives: {
          color: 'primary',
          outlined: true,
        },

        static: 'q-pa-sm q-ma-sm smooth-slow',

        bg: {
          focus: 'accent-70',
          hover: 'primary-50',

          errored: 'danger-50',
          erroredHover: 'danger-70'
        },
        shadow: {
          // base: 'secondary-dense',
          // hover: 'primary'
        },
        rounded: {
          base: 'default',
          hover: 'slighter',
        },
      } as IFieldStyle,

      fields: [
        {
          is: 'QInput',
          ref: 'firstname',
          step: {
            name: 'First base',
            value: 'firstbase',
            desc: 'bip boup',
            display: true
          },
          cols: {
            base: 12,
            md: 4,
            sm: 6
          },
          conditions: [
            // { model: 'firstName', value: 'aze' }
          ],

          model: 'firstName',
          required: true,

          label: 'Prénom',
          placeholder: 'Nom',
        },
        {
          is: 'QInput',
          ref: 'lastname',
          step: 'firstbase',
          cols: {
            base: 12,
            md: 4,
            sm: 6
          },
          conditions: [
            // { model: 'firstName', value: 'aze' }
          ],

          model: 'lastName',
          required: true,

          label: 'Nom',
          placeholder: 'Prénom'
        },
        {
          is: 'QSelect',
          ref: 'gender',
          step: 'firstbase',
          cols: {
            base: 12,
            md: 4,
            sm: 6
          },

          model: 'gender',
          conditions: [
            { model: 'firstName', value: 'not:Morice' },
            { model: 'lastName', value: 'not:Denice' },
            // { model: 'firstName', value: 'aze' }
          ],

          label: 'Genre',
          placeholder: 'Renseignez votre genre',

          emitValue: true,
          mapOptions: true,
          optionValue: 'value',
          optionLabel: 'label',

          options: [
            {
              label: 'Homme',
              value: 'male',
            },
            {
              label: 'Femme',
              value: 'female',
            },
            {
              label: 'Autre',
              value: 'other',
              conditions: [
                { model: 'firstName', value: 'Anna' },
                { model: 'lastName', value: 'Conda' },
              ]
            },
          ],
        },
        {
          is: 'BOptionGroup',
          ref: 'condition',
          step: {
            name: 'Lookin goood...',
            desc: 'keep going',
            value: 'lookingood',
            display: true
          },
          cols: 'grow',

          title: 'Je suis..',

          model: 'condition',
          options: [
            { label: 'Vivant', value: 'alive' },
            { label: 'Terrifié par les arachnides', value: 'scared', color: 'red' },
            { label: 'Allergique à la photosynthèse', value: 'allergic' },
            { label: 'Autre', value: 'other' },
          ],
        },
        {
          is: 'BOptionGroup',
          ref: 'condition',
          step: 'lookingood',
          cols: '6',

          title: 'J\'aime..',
          required: true,

          emitValue: true,
          mapOptions: true,
          optionValue: 'value',
          optionLabel: 'label',

          conditions: [
            { model: 'condition', value: 'not:other' }
          ],

          model: 'likes',
          options: [
            { label: 'Les CDs de Pascal Obispo', value: 'obispo' },
            { label: 'Les fermes d\'huitres', value: 'oster', conditions: [{ model: 'condition', value: 'allergic'}] },
            { label: 'Les réconstitutions du débarquement', value: 'debark', conditions: [{ model: 'condition', value: 'not:alive'}] },
            { label: 'La faune et flore de la Meurte et Moselle', value: 'fnf', conditions: [{ model: 'condition', value: 'not:allergic'}, { model: 'condition', value: 'not:scared'}] },
          ],
        },
        {
          is: 'BSlider',
          ref: 'footsize',
          step: 'dayum',
          cols: {
            xs: 12,
            sm: 6,
            md: 12
          },

          title: 'Pointure',
          label: true,

          model: 'footSize',
          min: 30,
          max: 50,
        },
        {
          is: 'BDatePicker',
          ref: 'lastFullyChargedPhone',
          step: 'dayum',
          cols: {
            xs: 12,
            sm: 6,
            md: 12
          },

          title: 'Dernière charge complète (téléphone)',
          infophrase: 'super important',
          infophraseIcon: 'mdi-cactus',

          model: 'lastFullyChargedPhone',
        }
      ] as IField[]
    };

    const methods = {
      submit () {
        console.log({ user: state.user })
        alert('oy')
      },
      handleEvent (type: string, event: any) {
        // console.log({ type, event })
      },
      log (args: any) {
        console.log({ args })
      }
    };

    const computedState = {
    };

    onMounted(() => {
      $q.dark.set(false)
    })


    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    return {
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
