<template>
  <q-dialog ref="dialogRef" class="actograph-dialog" @hide="onDialogHide">
    <q-card class="edit-reading-dialog">
      <q-card-section class="q-pb-none">
        <h5 class="edit-reading-dialog__title q-ma-none">
          {{ t(minDateTime ? 'readingsUi.confirmEndTimeTitle' : 'readingsUi.editReadingTitle') }}
        </h5>
      </q-card-section>

      <q-card-section class="edit-reading-dialog__grid">
        <q-select
          v-if="!minDateTime"
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
          v-if="isComment && !minDateTime"
          v-model="state.name"
          outlined
          dense
          hide-bottom-space
          color="accent"
          :label="t('readingsUi.editCommentTitle')"
          :rules="[labelRequiredRule]"
        />
        <q-input
          v-else-if="!minDateTime && observableGroups.length > 0"
          ref="observableInputRef" v-model="state.name"
          outlined dense hide-bottom-space color="accent"
          :label="t('readingsUi.colLabel')" :rules="[labelRequiredRule]"
          @update:model-value="onObservableInput"
          @keydown.down.prevent="openObservablePicker"
        >
          <template #append>
            <q-btn flat round dense icon="arrow_drop_down" size="sm"
              :aria-label="t('readingsUi.chooseObservable')" @click="openObservablePicker">
              <q-tooltip v-if="!observableMenuOpen">{{ t('readingsUi.chooseObservable') }}</q-tooltip>
              <q-menu ref="observableMenuRef" no-parent-event no-focus
                @before-show="observableMenuOpen = true" @hide="observableMenuOpen = false" anchor="bottom right" self="top right">
                <observable-picker ref="observablePickerRef" :groups="observableGroups"
                  :model-value="state.name" :search="observableSearch" @select="chooseObservable" />
              </q-menu>
            </q-btn>
          </template>
        </q-input>
        <q-input
          v-else
          v-show="!minDateTime"
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
          v-if="!minDateTime"
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

      <q-card-section v-if="!parsedDateTime || endTimeTooEarly" class="text-negative" role="alert">
        {{ t(endTimeTooEarly ? 'readingsUi.endMustFollowReadings' : 'readingsUi.invalidTimestamp') }}
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
import { defineComponent, reactive, computed, ref, nextTick, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { date as qDate, useDialogPluginComponent, type QInput, type QMenu } from 'quasar';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { useObservation } from 'src/composables/use-observation';
import { useDuration } from 'src/composables/use-duration';
import {
  formatCalendarDateTime,
  getLocalTimeZone,
  getObservationTimeZone,
} from '@actograph/core';
import { parseCalendarDateTimeEditInTimeZone } from 'src/utils/calendar-date-time';
import { isValidSegmentedTime } from 'src/utils/segmented-time';
import ObservablePicker from './ObservablePicker.vue';
import { buildObservableCategories } from './observable-categories';

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
  components: { ObservablePicker },
  props: {
    minDateTime: { type: Date, default: undefined },
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
    const timeZone = getObservationTimeZone(
      observation.sharedState.currentObservation?.meta,
    ) ?? getLocalTimeZone();

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
      datePart: isChronometerMode.value
        ? qDate.formatDate(sourceDate, 'DD/MM/YYYY')
        : formatCalendarDateTime(sourceDate, timeZone, 'DD/MM/YYYY'),
      timePart: isChronometerMode.value
        ? qDate.formatDate(sourceDate, 'HH:mm:ss.SSS')
        : formatCalendarDateTime(sourceDate, timeZone, 'HH:mm:ss.SSS'),
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

    const observableGroups = computed(() => buildObservableCategories(observation.protocol.sharedState.currentProtocol?._items));
    const observableSearch = ref('');
    const observableMenuOpen = ref(false);
    const observableInputRef = ref<QInput | null>(null);
    const observableMenuRef = ref<QMenu | null>(null);
    const observablePickerRef = ref<InstanceType<typeof ObservablePicker> | null>(null);
    const openObservablePicker = async () => {
      observableSearch.value = '';
      observableMenuRef.value?.show();
      await nextTick();
      observablePickerRef.value?.focusFirst();
    };
    const onObservableInput = (value: string | number | null) => {
      observableSearch.value = String(value ?? '');
      observableMenuRef.value?.show();
    };
    const chooseObservable = (name: string) => {
      state.name = name;
      observableMenuRef.value?.hide();
      observableInputRef.value?.focus();
    };

    const timePartWithoutMs = computed(() => {
      const time = state.timePart || '';
      return time.split('.')[0] || '';
    });

    const onDatePartChange = (val: string | number | null) => {
      state.datePart = val == null ? '' : String(val);
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

    const parsedDateTime = computed((): Date | null => {
      if (isChronometerMode.value) {
        if ([state.days, state.hours, state.minutes, state.seconds, state.milliseconds]
          .some((value) => value == null || String(value).trim() === '')) return null;
        const parts = {
          days: Number(state.days),
          hours: Number(state.hours),
          minutes: Number(state.minutes),
          seconds: Number(state.seconds),
          milliseconds: Number(state.milliseconds),
        };
        if (!duration.validateParts(parts)) return null;
        const parsed = observation.chronometerMethods.durationToDate(
          duration.partsToMilliseconds(parts)
        );
        return Number.isFinite(parsed.getTime()) ? parsed : null;
      }
      const combined = `${state.datePart} ${state.timePart}`;
      if (!isValidSegmentedTime(combined, 'calendar')) return null;
      const originalText = `${formatCalendarDateTime(sourceDate, timeZone, 'DD/MM/YYYY')} ${formatCalendarDateTime(sourceDate, timeZone, 'HH:mm:ss.SSS')}`;
      if (combined === originalText) return sourceDate;
      return parseCalendarDateTimeEditInTimeZone(combined, sourceDate, timeZone);
    });

    const endTimeTooEarly = computed(() => !!props.minDateTime && !!parsedDateTime.value
      && parsedDateTime.value.getTime() <= props.minDateTime.getTime());
    const isValid = computed(() => Boolean(state.type) && state.name.trim().length > 0
      && parsedDateTime.value !== null && !endTimeTooEarly.value);

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
      observableGroups,
      observableSearch,
      observableMenuOpen,
      observableInputRef,
      observableMenuRef,
      observablePickerRef,
      onObservableInput,
      openObservablePicker,
      chooseObservable,
      timePartWithoutMs,
      onDatePartChange,
      onTimePartChange,
      onTimePickerChange,
      labelRequiredRule,
      isValid,
      parsedDateTime,
      endTimeTooEarly,
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
