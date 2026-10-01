<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <q-card class="edit-reading-dialog">
      <q-card-section class="q-pb-none">
        <h5 class="edit-reading-dialog__title q-ma-none">
          {{ t('readingsUi.editReadingTitle') }}
        </h5>
      </q-card-section>

      <q-card-section class="edit-reading-dialog__grid">
        <q-select
          v-model="state.type"
          :options="readingTypeOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          hide-bottom-space
          color="accent"
          :label="t('readingsUi.colType')"
        />

        <q-input
          v-if="isComment"
          v-model="state.name"
          outlined
          dense
          hide-bottom-space
          color="accent"
          :label="t('readingsUi.editCommentTitle')"
          :rules="[labelRequiredRule]"
        />
        <q-select
          v-else-if="protocolObservableOptions.length > 0"
          v-model="state.name"
          :options="filteredObservableOptions"
          option-label="label"
          option-value="value"
          :option-disable="isObservableOptionDisabled"
          use-input
          fill-input
          hide-selected
          input-debounce="0"
          emit-value
          map-options
          outlined
          dense
          hide-bottom-space
          color="accent"
          new-value-mode="add-unique"
          :label="t('readingsUi.colLabel')"
          :rules="[labelRequiredRule]"
          @filter="filterObservables"
        >
          <template v-slot:option="optScope">
            <q-item
              v-if="optScope.opt.isCategory"
              dense
              class="text-weight-bold non-selectable"
              :style="{ color: optScope.opt.categoryColor || 'var(--primary)' }"
            >
              <q-item-section>{{ optScope.opt.label }}</q-item-section>
            </q-item>
            <q-item v-else v-bind="optScope.itemProps" dense class="q-pl-lg">
              <q-item-section>{{ optScope.opt.label }}</q-item-section>
            </q-item>
          </template>
          <template v-slot:no-option>
            <q-item dense>
              <q-item-section class="text-grey text-italic">
                {{ t('readingsUi.freeLabelAutocompleteHint') }}
              </q-item-section>
            </q-item>
          </template>
        </q-select>
        <q-input
          v-else
          v-model="state.name"
          outlined
          dense
          hide-bottom-space
          color="accent"
          :label="t('readingsUi.colLabel')"
          :rules="[labelRequiredRule]"
        />

        <template v-if="isChronometerMode">
          <q-input
            v-model.number="state.days"
            type="number"
            outlined
            dense
            hide-bottom-space
            color="accent"
            :label="t('readingsUi.colDays')"
            :min="0"
          />
          <q-input
            v-model.number="state.hours"
            type="number"
            outlined
            dense
            hide-bottom-space
            color="accent"
            :label="t('readingsUi.colHours')"
            :min="0"
            :max="23"
          />
          <q-input
            v-model.number="state.minutes"
            type="number"
            outlined
            dense
            hide-bottom-space
            color="accent"
            :label="t('readingsUi.colMinutes')"
            :min="0"
            :max="59"
          />
          <q-input
            v-model.number="state.seconds"
            type="number"
            outlined
            dense
            hide-bottom-space
            color="accent"
            :label="t('readingsUi.colSeconds')"
            :min="0"
            :max="59"
          />
          <q-input
            class="edit-reading-dialog__span-2"
            v-model.number="state.milliseconds"
            type="number"
            outlined
            dense
            hide-bottom-space
            color="accent"
            :label="t('readingsUi.colMilliseconds')"
            :min="0"
            :max="999"
          />
        </template>
        <template v-else>
          <q-input
            :model-value="state.datePart"
            mask="##/##/####"
            fill-mask="_"
            outlined
            dense
            hide-bottom-space
            color="accent"
            :label="t('readingsUi.editReadingDate')"
            @update:model-value="onDatePartChange"
          >
            <template v-slot:prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    :model-value="state.datePart"
                    mask="DD/MM/YYYY"
                    color="accent"
                    @update:model-value="onDatePartChange"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup :label="t('common.ok')" color="accent" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input
            :model-value="state.timePart"
            mask="##:##:##.###"
            fill-mask="_"
            outlined
            dense
            hide-bottom-space
            color="accent"
            :label="t('readingsUi.editReadingTime')"
            @update:model-value="onTimePartChange"
          >
            <template v-slot:prepend>
              <q-icon name="access_time" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time
                    :model-value="timePartWithoutMs"
                    mask="HH:mm:ss"
                    format24h
                    with-seconds
                    color="accent"
                    @update:model-value="onTimePickerChange"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup :label="t('common.ok')" color="accent" flat />
                    </div>
                  </q-time>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </template>

        <q-input
          class="edit-reading-dialog__span-2"
          v-model="state.description"
          type="textarea"
          outlined
          dense
          autogrow
          color="accent"
          :label="t('readingsUi.colDescription')"
        />
      </q-card-section>

      <q-card-actions align="right" class="q-gutter-md q-px-md q-pb-md">
        <q-btn
          flat
          unelevated
          no-caps
          rounded
          :label="t('dialogs.cancel')"
          @click="onCancelClick"
        />
        <q-btn
          unelevated
          no-caps
          rounded
          color="accent"
          text-color="white"
          :label="t('readingsUi.popupValidate')"
          :disable="!isValid"
          @click="onOKClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, ref, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { date as qDate, useDialogPluginComponent } from 'quasar';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { useObservation } from 'src/composables/use-observation';
import { useDuration } from 'src/composables/use-duration';

type ProtocolObservableOption = {
  label: string;
  value: string;
  isCategory?: boolean;
  categoryColor?: string;
  disable?: boolean;
};

export type EditReadingPayload = {
  id?: number;
  tempId?: string | null;
  type: ReadingTypeEnum;
  dateTime: Date;
  name: string;
  description?: string;
};

export default defineComponent({
  name: 'EditReadingDialog',
  props: {
    reading: {
      type: Object as PropType<IReading>,
      required: true,
    },
  },
  emits: [...useDialogPluginComponent.emits],
  setup(props) {
    const { t } = useI18n();
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent();
    const observation = useObservation();
    const duration = useDuration();
    const isChronometerMode = computed(() => observation.isChronometerMode.value);

    const sourceDate =
      props.reading.dateTime instanceof Date
        ? props.reading.dateTime
        : new Date(props.reading.dateTime);

    const isComment =
      typeof props.reading.name === 'string' &&
      props.reading.name.trimStart().startsWith('#');

    const commentBody = (props.reading.name ?? '').replace(/^\s*#+\s*/, '');

    const initialDurationParts = (() => {
      if (!isChronometerMode.value) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
      }
      const ms = observation.chronometerMethods.dateToDuration(sourceDate);
      return duration.millisecondsToParts(ms);
    })();

    const state = reactive({
      type: props.reading.type,
      name: isComment ? commentBody : (props.reading.name || ''),
      description: props.reading.description || '',
      datePart: qDate.formatDate(sourceDate, 'DD/MM/YYYY'),
      timePart: qDate.formatDate(sourceDate, 'HH:mm:ss.SSS'),
      days: initialDurationParts.days,
      hours: initialDurationParts.hours,
      minutes: initialDurationParts.minutes,
      seconds: initialDurationParts.seconds,
      milliseconds: initialDurationParts.milliseconds,
    });

    const readingTypeOptions = computed(() => [
      { label: t('readingsUi.readingTypeStart'), value: ReadingTypeEnum.START },
      { label: t('readingsUi.readingTypeStop'), value: ReadingTypeEnum.STOP },
      { label: t('readingsUi.readingTypePauseStart'), value: ReadingTypeEnum.PAUSE_START },
      { label: t('readingsUi.readingTypePauseEnd'), value: ReadingTypeEnum.PAUSE_END },
      { label: t('readingsUi.readingTypeData'), value: ReadingTypeEnum.DATA },
    ]);

    const protocolObservableOptions = computed((): ProtocolObservableOption[] => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol?._items) return [];
      const options: ProtocolObservableOption[] = [];
      for (const item of protocol._items) {
        if (item.type !== ProtocolItemTypeEnum.Category) continue;
        options.push({
          label: item.name,
          value: `__cat_${item.id}`,
          isCategory: true,
          categoryColor: item.graphPreferences?.color || undefined,
          disable: true,
        });
        if (item.children) {
          for (const child of item.children) {
            if (child.name) {
              options.push({ label: child.name, value: child.name });
            }
          }
        }
      }
      return options;
    });

    const filteredObservableOptions = ref<ProtocolObservableOption[]>(
      protocolObservableOptions.value
    );

    const filterObservables = (val: string, update: (fn: () => void) => void) => {
      update(() => {
        if (!val) {
          filteredObservableOptions.value = protocolObservableOptions.value;
          return;
        }
        const needle = val.toLowerCase();
        const allOptions = protocolObservableOptions.value;
        const result: ProtocolObservableOption[] = [];
        for (let i = 0; i < allOptions.length; i++) {
          const opt = allOptions[i];
          if (opt.isCategory) {
            const children: ProtocolObservableOption[] = [];
            let j = i + 1;
            while (j < allOptions.length && !allOptions[j].isCategory) {
              if (allOptions[j].label.toLowerCase().includes(needle)) {
                children.push(allOptions[j]);
              }
              j += 1;
            }
            if (children.length > 0) {
              result.push(opt, ...children);
            }
          }
        }
        filteredObservableOptions.value = result;
      });
    };

    const timePartWithoutMs = computed(() => {
      const time = state.timePart || '';
      return time.split('.')[0] || '';
    });

    const onDatePartChange = (val: string | null) => {
      state.datePart = val || '';
    };

    const onTimePartChange = (val: string | number | null) => {
      state.timePart = val == null ? '' : String(val);
    };

    const onTimePickerChange = (val: string | null) => {
      if (!val) return;
      const ms = (state.timePart.split('.')[1] || '000').padEnd(3, '0').slice(0, 3);
      state.timePart = `${val}.${ms}`;
    };

    const labelRequiredRule = (val: string | null | undefined): boolean | string =>
      Boolean(val && val.trim().length > 0) || t('readingsUi.labelRequired');

    const isObservableOptionDisabled = (opt: ProtocolObservableOption): boolean =>
      opt.disable === true;

    const parsedDateTime = computed((): Date | null => {
      if (isChronometerMode.value) {
        const parts = {
          days: Number(state.days) || 0,
          hours: Number(state.hours) || 0,
          minutes: Number(state.minutes) || 0,
          seconds: Number(state.seconds) || 0,
          milliseconds: Number(state.milliseconds) || 0,
        };
        if (!duration.validateParts(parts)) return null;
        return observation.chronometerMethods.durationToDate(
          duration.partsToMilliseconds(parts)
        );
      }
      const combined = `${state.datePart} ${state.timePart}`;
      if (!state.datePart || !state.timePart || combined.includes('_')) return null;
      const parsed = qDate.extractDate(combined, 'DD/MM/YYYY HH:mm:ss.SSS');
      if (!parsed || isNaN(parsed.getTime()) || parsed.getFullYear() < 1970) {
        return null;
      }
      return parsed;
    });

    const isValid = computed(
      () => Boolean(state.type) && state.name.trim().length > 0 && parsedDateTime.value !== null
    );

    const onOKClick = () => {
      if (!isValid.value || !parsedDateTime.value) return;
      const payload: EditReadingPayload = {
        id: props.reading.id,
        tempId: props.reading.tempId,
        type: state.type,
        dateTime: parsedDateTime.value,
        name: isComment ? `# ${state.name.trim()}` : state.name.trim(),
        description: state.description.trim() || undefined,
      };
      onDialogOK(payload);
    };

    return {
      t,
      dialogRef,
      onDialogHide,
      state,
      isComment,
      isChronometerMode,
      readingTypeOptions,
      protocolObservableOptions,
      filteredObservableOptions,
      filterObservables,
      timePartWithoutMs,
      onDatePartChange,
      onTimePartChange,
      onTimePickerChange,
      labelRequiredRule,
      isObservableOptionDisabled,
      isValid,
      onOKClick,
      onCancelClick: onDialogCancel,
    };
  },
});
</script>

<style scoped lang="scss">
.edit-reading-dialog {
  min-width: min(520px, calc(100vw - 48px));
  max-width: min(90vw, calc(100vw - 48px));
  border: 1px solid var(--neutral-low);
  border-radius: 12px;
  box-shadow: 0 16px 36px var(--neutral-high-20);
  overflow: hidden;
}

.edit-reading-dialog__title {
  font-size: 1rem;
  line-height: 1.35;
  font-weight: 700;
  text-transform: uppercase;
}

.edit-reading-dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.edit-reading-dialog__span-2 {
  grid-column: 1 / -1;
}
</style>
