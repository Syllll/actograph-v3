<style lang="scss" scoped>
.select-bg-white {
  &:deep() {
    .q-field__inner > div {
      background-color: white !important;
    }
  }
}
</style>
<template>
  <div>
    <DInput
      v-model="state.internalValue"
      :hint="props.hint || undefined"
      dense
      icon-right
      :bgColor="props.color"
      :outlined="props.outlined"
      :square="props.square"
    >
      <template #append>
        <q-icon name="mdi-calendar-blank" class="cursor-pointer">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-date
              v-model="state.internalValue"
              color="props.color"
              text-color="props.textColor"
              :mask="mask"
              :options="methods.allowedDates"
              years-in-month-view
              :navigation-min-year-month="props.minDate"
              :navigation-max-year-month="props.maxDate"
              locale="fr-FR"
            >
              <div class="row items-center justify-end">
                <q-btn v-close-popup label="Terminé" />
              </div>
            </q-date>
          </q-popup-proxy>
        </q-icon>
      </template>
    </DInput>
  </div>
</template>

<script lang="ts">
import { date as qDate } from 'quasar';
import { formatDate } from '@lib-improba/utils/date-format.utils';
import { defineComponent, reactive, watch } from 'vue';

export default defineComponent({
  components: {},
  props: {
    label: {
      type: String,
      required: false,
    },
    modelValue: {
      type: String,
      required: false,
    },
    mask: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    modelFormat: {
      type: String,
      default: 'YYYY-MM-DD',
    },
    hint: {
      type: String,
      default: 'Format JJ/MM/AAAA (ex. 14/04/2021)',
    },
    minDate: {
      type: String,
      default: '2000/01',
    },
    maxDate: {
      type: String,
      default: '2039/12',
    },
    noPast: {
      type: Boolean,
      default: false,
    },
    noFuture: {
      type: Boolean,
      default: false,
    },
    fullWidth: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: undefined,
    },
    textColor: {
      type: String,
      default: undefined,
    },
    outlined: {
      type: Boolean,
      default: true,
    },
    square: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const state = reactive({
      internalValue: formatDate(props.modelValue || '', props.mask),
      // width: props.fullWidth ? 'max-width: 100%' : 'max-width: 250px'
    });

    const methods = {
      allowedDates: (date: any) => {
        /* console.log({
          date,
          now: new Date().toISOString().substring(0, 10).replace(/-/g, '/'),
          props
        }) */
        if (props.noPast) {
          return (
            date >= new Date().toISOString().substring(0, 10).replace(/-/g, '/')
          );
        }
        if (props.noFuture) {
          return (
            date <= new Date().toISOString().substring(0, 10).replace(/-/g, '/')
          );
        }
        return true;
      },
    };

    watch(
      () => state.internalValue,
      (value) => {
        if (value?.length === props.modelFormat.length) {
          const newDate = qDate.extractDate(value, props.mask);
          const externalDate = formatDate(newDate, props.modelFormat);
          // console.log('watch internalValue', { value, newDate, externalDate })
          emit('update:modelValue', externalDate);
        }
      }
    );

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          // console.log('watch modelValue', value)
          const newDate = formatDate(value, props.mask);
          state.internalValue = newDate;
        } else {
          state.internalValue = '';
        }
      }
    );

    return {
      props,
      state,
      methods,
    };
  },
});
</script>
