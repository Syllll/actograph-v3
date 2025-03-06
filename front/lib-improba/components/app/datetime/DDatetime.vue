<template>
  <div>
    <q-input filled v-model="state.internalValue">
      <template v-slot:prepend>
        <q-icon name="event" class="cursor-pointer">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-date
              v-model="state.internalValue"
              :mask="mask"
              :options="methods.dateOptions"
            >
              <div class="row items-center justify-end">
                <q-btn v-close-popup label="Terminé" color="secondary" />
              </div>
            </q-date>
          </q-popup-proxy>
        </q-icon>
      </template>

      <template v-slot:append>
        <q-icon name="access_time" class="cursor-pointer">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-time v-model="state.internalValue" :mask="mask" format24h>
              <div class="row items-center justify-end">
                <q-btn v-close-popup label="Terminé" color="secondary" />
              </div>
            </q-time>
          </q-popup-proxy>
        </q-icon>
      </template>
    </q-input>

    <!-- <div class="q-gutter-sm">
      <q-badge color="teal"> Model: {{ state.internalValue }} </q-badge>
      <q-badge color="teal"> External: {{ props.modelValue }} </q-badge>
      <q-badge color="purple" text-color="white" class="q-ma-md">
        Mask: DD/MM/YYYY HH:mm Mask: YYYY-MM-DD HH:mm
      </q-badge>
    </div>
 -->
    <div class="q-gutter-md row items-start">
      <!--       <q-date
        :modelValue="props.modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        mask="YYYY-MM-DDTHH:mm:ss.SSSZ"
        xmask="2021-12-09T04:50:27.841Z"
        color="purple"
      />
      <q-time
        :modelValue="props.modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        mask="YYYY-MM-DD HH:mm"
        color="purple"
      /> -->
    </div>
  </div>
</template>

<script lang="ts">
import { date as qDate } from 'quasar';
import { formatDate } from 'src/../lib-improba/utils/date-format.utils';
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
      required: true,
    },
    mask: {
      type: String,
      default: 'DD/MM/YYYY HH:mm',
    },
    modelFormat: {
      type: String,
      default: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    },
    noPast: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const state = reactive({
      internalValue: formatDate(props.modelValue, props.mask),
    });

    const methods = {
      dateOptions: (date: any) => {
        console.log({
          date,
          now: new Date().toISOString().substring(0, 10).replace(/-/g, '/'),
        });
        return (
          date >= new Date().toISOString().substring(0, 10).replace(/-/g, '/')
        );
      },
    };

    watch(
      () => state.internalValue,
      (value) => {
        if (value.length === 16) {
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
