<template>
  <div class="readings-table">
    <q-table
      class="readings-q-table"
      dense
    :rows="readings"
    :columns="columns"
    :row-key="getRowKey"
    binary-state-sort
    v-model:pagination="pagination"
    virtual-scroll
    :virtual-scroll-sticky-size-start="48"
    table-style="max-height: 100%; width: max-content;"
    :rows-per-page-options="[0]"
    hide-pagination
    hide-bottom
  >
    <template v-slot:header="props">
      <q-tr :props="props">
        <q-th
          v-for="col in props.cols"
          :key="col.name"
          :props="props"
          :class="{ 'text-right': col.name === 'actions' }"
        >
          <span v-if="col.name === 'actions'">
            <q-btn
              flat
              round
              dense
              size="xs"
              color="dark"
              icon="delete"
              :disable="!canClearAll"
              :aria-label="t('readingsUi.clearAllReadings')"
              @click.stop="emitClearAll"
            />
            <q-tooltip>{{ t('readingsUi.clearAllReadingsTooltip') }}</q-tooltip>
          </span>
          <template v-else>
            {{ col.label }}
          </template>
        </q-th>
      </q-tr>
    </template>

    <template v-slot:body="props">
      <q-tr
        :props="props"
        :class="{
          'unrecognized-observable-row': isUnrecognizedObservable(props.row)
        }"
      >
        <q-td key="order" :props="props">
          {{ props.rowIndex + 1 }}
        </q-td>

        <q-td key="type" :props="props">
          <span
            class="readings-inline-control readings-type-trigger"
            tabindex="0"
            role="button"
            :aria-label="t('readingsUi.colType')"
            @click.stop
          >
            {{ getReadingTypeLabel(props.row.type) }}
            <q-menu>
              <q-list dense>
                <q-item
                  v-for="opt in readingTypeOptions"
                  :key="opt.value"
                  clickable
                  v-close-popup
                  dense
                  class="readings-type-option"
                  :active="props.row.type === opt.value"
                  active-class="readings-type-option--active"
                  @click="commitType(props.row, opt.value)"
                >
                  <q-item-section>{{ opt.label }}</q-item-section>
                  <q-item-section
                    v-if="props.row.type === opt.value"
                    side
                  >
                    <q-icon name="check" size="xs" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </span>
        </q-td>

        <q-td key="dateTime" :props="props">
          <input
            v-if="isChronometerMode"
            class="readings-inline-control"
            type="text"
            :value="getDurationInputValue(props.row)"
            :aria-label="t('readingsUi.editDurationTitle')"
            :placeholder="t('readingsUi.durationPlaceholder')"
            :title="t('readingsUi.durationFormatsHint')"
            @input="onDurationInput(props.row, $event)"
            @blur="commitDuration(props.row)"
            @keydown.enter.prevent="commitDuration(props.row)"
            @keydown.esc.stop="clearDurationDraft(props.row)"
            @click.stop
          >
          <input
            v-else
            class="readings-inline-control"
            type="text"
            :value="getCalendarDateTimeValue(props.row)"
            :aria-label="t('readingsUi.colDateTime')"
            @input="onCalendarInput(props.row, $event)"
            @blur="commitCalendarDateTime(props.row)"
            @keydown.enter.prevent="commitCalendarDateTime(props.row)"
            @keydown.esc.stop="clearCalendarDraft(props.row)"
            @click.stop
          >
        </q-td>

        <q-td key="name" :props="props">
          <span class="readings-label-cell">
            <input
              v-if="isCommentReading(props.row)"
              class="readings-inline-control comment-reading"
              type="text"
              :value="commentBodyFromName(props.row.name)"
              :aria-label="t('readingsUi.editCommentTitle')"
              @focus="snapshotName(props.row)"
              @input="onCommentNativeInput(props.row, $event)"
              @blur="commitComment(props.row)"
              @keydown.enter.prevent="commitComment(props.row)"
              @click.stop
            >
            <span
              v-else
              class="readings-label-text"
              :class="{ 'unrecognized-observable': isUnrecognizedObservable(props.row) }"
            >
              {{ props.row.name }}
            </span>
            <q-tooltip
              v-if="getLabelTooltip(props.row)"
              anchor="top middle"
              self="bottom middle"
            >
              <span class="readings-label-tooltip-text">{{ getLabelTooltip(props.row) }}</span>
            </q-tooltip>
          </span>
        </q-td>

        <q-td key="actions" :props="props" class="text-right">
          <q-btn
            flat
            round
            dense
            size="xs"
            color="primary"
            icon="edit"
            :aria-label="t('readingsUi.editReadingTooltip')"
            @click.stop="openEditReading(props.row)"
          >
            <q-tooltip>{{ t('readingsUi.editReadingTooltip') }}</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            size="xs"
            icon="content_copy"
            :aria-label="t('readingsUi.duplicateReadingTooltip')"
            @click.stop="emitDuplicateReading(props.row)"
          >
            <q-tooltip>{{ t('readingsUi.duplicateReadingTooltip') }}</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            size="xs"
            color="dark"
            icon="delete"
            :aria-label="t('readingsUi.deleteReadingOk')"
            @click.stop="emitRemoveReading(props.row)"
          >
            <q-tooltip>{{ t('readingsUi.deleteReadingTooltip') }}</q-tooltip>
          </q-btn>
        </q-td>
      </q-tr>
    </template>
  </q-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { QTableColumn, Dialog } from 'quasar';
import { date as qDate } from 'quasar';
import { useObservation } from 'src/composables/use-observation';
import { useDuration } from 'src/composables/use-duration';
import {
  formatCalendarDateTime,
  getObservationTimeZone,
} from '@actograph/core';
import { parseCalendarDateTimeEditInTimeZone } from 'src/utils/calendar-date-time';
import EditReadingDialog from './EditReadingDialog.vue';

export default defineComponent({
  name: 'ReadingsTable',

  props: {
    readings: {
      type: Array as () => IReading[],
      required: true,
    },
    canClearAll: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['remove-reading', 'duplicate-reading', 'clear-all'],

  setup(props, { emit }) {
    const { t } = useI18n();

    // Display-only ASC/DESC. Does not mutate currentReadings or persist.
    const pagination = ref({
      sortBy: 'dateTime',
      descending: false,
      rowsPerPage: 0,
      page: 1,
    });

    const columns = computed((): QTableColumn[] => [
      {
        name: 'order',
        label: t('readingsUi.colOrder'),
        field: 'order',
        align: 'left',
        sortable: false,
        style: 'width: 1%; white-space: nowrap',
        headerStyle: 'width: 1%; white-space: nowrap',
      },
      {
        name: 'type',
        label: t('readingsUi.colType'),
        field: 'type',
        align: 'left',
        sortable: false,
        style: 'width: 1%; white-space: nowrap',
        headerStyle: 'width: 1%; white-space: nowrap',
      },
      {
        name: 'dateTime',
        label: t('readingsUi.colDateTime'),
        field: 'dateTime',
        align: 'left',
        sortable: true,
        style: 'width: 1%; white-space: nowrap',
        headerStyle: 'width: 1%; white-space: nowrap',
        sort: (a: Date | string, b: Date | string) => {
          const ta = a instanceof Date ? a.getTime() : new Date(a).getTime();
          const tb = b instanceof Date ? b.getTime() : new Date(b).getTime();
          return ta - tb;
        },
      },
      {
        name: 'name',
        label: t('readingsUi.colLabel'),
        field: 'name',
        align: 'left',
        sortable: false,
        style: 'width: 1%; white-space: nowrap',
        headerStyle: 'width: 1%; white-space: nowrap',
      },
      {
        name: 'actions',
        label: '',
        field: 'actions',
        align: 'right',
        sortable: false,
        style: 'width: 1%; white-space: nowrap',
        headerStyle: 'width: 1%; white-space: nowrap',
      },
    ]);

    const observation = useObservation();
    const duration = useDuration();
    const isChronometerMode = computed(() => observation.isChronometerMode.value);

    const getRowKey = (row: IReading) => {
      return row.id ? `id-${row.id}` : `tempId-${row.tempId || 'unknown'}`;
    };

    const calendarDrafts = ref<Record<string, string>>({});
    const durationDrafts = ref<Record<string, string>>({});

    const protocolObservableNames = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol?._items) return new Set<string>();
      const names = new Set<string>();
      for (const item of protocol._items) {
        const isCategory = item.type === ProtocolItemTypeEnum.Category;
        if (isCategory && item.children) {
          for (const child of item.children) {
            if (child.name) names.add(child.name);
          }
        }
      }
      return names;
    });

    const isUnrecognizedObservable = (row: IReading): boolean => {
      if (row.type !== ReadingTypeEnum.DATA || !row.name) return false;
      if (row.name.startsWith('#')) return false;
      return !protocolObservableNames.value.has(row.name);
    };

    const getUnrecognizedObservableTitle = (row: IReading): string | undefined => {
      if (!isUnrecognizedObservable(row)) return undefined;
      return t('readingsUi.unrecognizedObservableTooltip', {
        name: row.name ?? '',
      });
    };

    const getDescriptionTooltip = (row: IReading): string | undefined => {
      const text = (row.description || '').trim();
      return text || undefined;
    };

    const getLabelTooltip = (row: IReading): string | undefined => {
      const parts = [
        getUnrecognizedObservableTitle(row),
        getDescriptionTooltip(row),
      ].filter((part): part is string => Boolean(part));
      return parts.length > 0 ? parts.join('\n') : undefined;
    };

    const durationEditState = reactive({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    const toDate = (dateTime: Date | string): Date =>
      dateTime instanceof Date ? dateTime : new Date(dateTime);

    const formatDateTime = (dateTime: Date | string) => {
      const date = toDate(dateTime);
      if (observation.isChronometerMode.value) {
        return qDate.formatDate(date, 'DD/MM/YYYY HH:mm:ss.SSS');
      }
      const timeZone = getObservationTimeZone(
        observation.sharedState.currentObservation?.meta,
      );
      return formatCalendarDateTime(date, timeZone, 'DD/MM/YYYY HH:mm:ss.SSS');
    };

    const formatDurationCompactFromRow = (row: IReading) => {
      if (!row.dateTime) return '';
      const durationMs = observation.chronometerMethods.dateToDuration(toDate(row.dateTime));
      return duration.formatCompact(durationMs);
    };

    const getCalendarDateTimeValue = (row: IReading) =>
      calendarDrafts.value[getRowKey(row)] ?? formatDateTime(row.dateTime);

    const setCalendarDraft = (row: IReading, val: string | number | null) => {
      calendarDrafts.value = {
        ...calendarDrafts.value,
        [getRowKey(row)]: val == null ? '' : String(val),
      };
    };

    const clearCalendarDraft = (row: IReading) => {
      const key = getRowKey(row);
      if (!(key in calendarDrafts.value)) return;
      const next = { ...calendarDrafts.value };
      delete next[key];
      calendarDrafts.value = next;
    };

    const getDurationInputValue = (row: IReading) =>
      durationDrafts.value[getRowKey(row)] ?? formatDurationCompactFromRow(row);

    const setDurationDraft = (row: IReading, val: string | number | null) => {
      durationDrafts.value = {
        ...durationDrafts.value,
        [getRowKey(row)]: val == null ? '' : String(val),
      };
    };

    const clearDurationDraft = (row: IReading) => {
      const key = getRowKey(row);
      if (!(key in durationDrafts.value)) return;
      const next = { ...durationDrafts.value };
      delete next[key];
      durationDrafts.value = next;
    };

    const parseDurationFromText = (text: string) => {
      if (!text || typeof text !== 'string') return;
      const normalized = text.trim().toLowerCase();
      if (!normalized) return;

      if (normalized.includes(':')) {
        const parts = normalized.split(':');
        const parseSecMs = (secPart: string): { sec: number; ms: number } => {
          const [secRaw, msRaw] = secPart.replace(',', '.').split('.');
          const sec = Number.parseInt(secRaw || '0', 10) || 0;
          const ms = Number.parseInt((msRaw || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
          return { sec, ms };
        };

        let days = 0;
        let hours = 0;
        let minutes = 0;
        let seconds = 0;
        let milliseconds = 0;

        if (parts.length === 3) {
          hours = Number.parseInt(parts[0] || '0', 10) || 0;
          minutes = Number.parseInt(parts[1] || '0', 10) || 0;
          const secMs = parseSecMs(parts[2] || '0');
          seconds = secMs.sec;
          milliseconds = secMs.ms;
        } else if (parts.length === 2) {
          minutes = Number.parseInt(parts[0] || '0', 10) || 0;
          const secMs = parseSecMs(parts[1] || '0');
          seconds = secMs.sec;
          milliseconds = secMs.ms;
        } else {
          return;
        }

        durationEditState.days = days;
        durationEditState.hours = hours;
        durationEditState.minutes = minutes;
        durationEditState.seconds = seconds;
        durationEditState.milliseconds = milliseconds;
        return;
      }

      if (/^\d+$/.test(normalized)) {
        const durationMs = Number.parseInt(normalized, 10);
        const parsedParts = duration.millisecondsToParts(durationMs);
        durationEditState.days = parsedParts.days;
        durationEditState.hours = parsedParts.hours;
        durationEditState.minutes = parsedParts.minutes;
        durationEditState.seconds = parsedParts.seconds;
        durationEditState.milliseconds = parsedParts.milliseconds;
        return;
      }

      const regex = /(\d+)\s*(j|h|ms|m|s)/gi;
      let match;
      let days = 0;
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      let milliseconds = 0;
      while ((match = regex.exec(text)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        switch (unit) {
          case 'j':
            days = value;
            break;
          case 'h':
            hours = value;
            break;
          case 'm':
            minutes = value;
            break;
          case 's':
            seconds = value;
            break;
          case 'ms':
            milliseconds = value;
            break;
        }
      }
      durationEditState.days = days;
      durationEditState.hours = hours;
      durationEditState.minutes = minutes;
      durationEditState.seconds = seconds;
      durationEditState.milliseconds = milliseconds;
    };

    const findRowSafe = (row: IReading): IReading | undefined => {
      return props.readings.find((r: IReading) =>
        (row.id && r.id === row.id) || (row.tempId && r.tempId === row.tempId) || r === row
      );
    };

    const applyDateTime = (row: IReading, dateValue: Date) => {
      const targetRow = findRowSafe(row);
      if (!targetRow) return;
      targetRow.dateTime = dateValue;
      targetRow.updatedAt = new Date();
      observation.readings.methods.sortReadingsChronologically();
    };

    const parseCalendarDateTime = (value: string, row: IReading): Date | null => {
      if (!value || value.includes('_')) {
        return null;
      }
      const sourceDate = toDate(row.dateTime);
      if (formatDateTime(sourceDate) === value) return sourceDate;
      if (observation.isChronometerMode.value) {
        const parsed = qDate.extractDate(value, 'DD/MM/YYYY HH:mm:ss.SSS');
        return parsed && !isNaN(parsed.getTime()) && parsed.getFullYear() >= 1970
          ? parsed
          : null;
      }
      const timeZone = getObservationTimeZone(
        observation.sharedState.currentObservation?.meta,
      );
      if (timeZone) {
        return parseCalendarDateTimeEditInTimeZone(value, sourceDate, timeZone);
      }
      const parsed = qDate.extractDate(value, 'DD/MM/YYYY HH:mm:ss.SSS');
      if (!parsed || isNaN(parsed.getTime()) || parsed.getFullYear() < 1970) {
        return null;
      }
      return parsed;
    };

    const commitCalendarDateTime = (row: IReading) => {
      const parsed = parseCalendarDateTime(getCalendarDateTimeValue(row), row);
      clearCalendarDraft(row);
      if (!parsed) return;
      applyDateTime(row, parsed);
    };

    const commitDuration = (row: IReading) => {
      const text = getDurationInputValue(row);
      parseDurationFromText(text);
      clearDurationDraft(row);
      if (!duration.validateParts(durationEditState)) return;
      const durationMs = duration.partsToMilliseconds(durationEditState);
      applyDateTime(row, observation.chronometerMethods.durationToDate(durationMs));
    };

    const emitRemoveReading = (row: IReading) => {
      emit('remove-reading', row);
    };

    const emitDuplicateReading = (row: IReading) => {
      emit('duplicate-reading', row);
    };

    const emitClearAll = () => {
      emit('clear-all');
    };

    const readingTypeOptions = computed(() => [
      { label: t('readingsUi.readingTypeStart'), value: ReadingTypeEnum.START },
      { label: t('readingsUi.readingTypeStop'), value: ReadingTypeEnum.STOP },
      { label: t('readingsUi.readingTypePauseStart'), value: ReadingTypeEnum.PAUSE_START },
      { label: t('readingsUi.readingTypePauseEnd'), value: ReadingTypeEnum.PAUSE_END },
      { label: t('readingsUi.readingTypeData'), value: ReadingTypeEnum.DATA },
    ]);

    const getReadingTypeLabel = (type: ReadingTypeEnum) => {
      const opt = readingTypeOptions.value.find((item) => item.value === type);
      return opt?.label ?? String(type);
    };

    const commitType = (row: IReading, val: ReadingTypeEnum | null) => {
      if (!val) return;
      const targetRow = findRowSafe(row);
      if (!targetRow || targetRow.type === val) return;
      targetRow.type = val;
      targetRow.updatedAt = new Date();
    };

    const eventValue = (event: Event): string => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return '';
      }
      return target.value;
    };

    const onCalendarInput = (row: IReading, event: Event) => {
      setCalendarDraft(row, eventValue(event));
    };

    const onDurationInput = (row: IReading, event: Event) => {
      setDurationDraft(row, eventValue(event));
    };

    const onCommentNativeInput = (row: IReading, event: Event) => {
      onCommentInput(row, eventValue(event));
    };

    const isCommentReading = (row: IReading): boolean =>
      typeof row.name === 'string' && row.name.trimStart().startsWith('#');

    const commentBodyFromName = (name: string | undefined): string =>
      (name ?? '').replace(/^\s*#+\s*/, '');

    const nameSnapshots = ref<Record<string, string>>({});

    const snapshotName = (row: IReading) => {
      const targetRow = findRowSafe(row);
      if (!targetRow) return;
      nameSnapshots.value = {
        ...nameSnapshots.value,
        [getRowKey(row)]: targetRow.name,
      };
    };

    const restoreNameIfEmpty = (row: IReading, candidate: string): boolean => {
      if (candidate.trim()) return false;
      const targetRow = findRowSafe(row);
      const previous = nameSnapshots.value[getRowKey(row)];
      if (!targetRow || previous == null) return true;
      targetRow.name = previous;
      targetRow.updatedAt = new Date();
      return true;
    };

    const onCommentInput = (row: IReading, val: string | number | null) => {
      const targetRow = findRowSafe(row);
      if (!targetRow) return;
      const body = String(val ?? '').replace(/^\s*#+\s*/, '');
      targetRow.name = body ? `# ${body}` : '# ';
      targetRow.updatedAt = new Date();
    };

    const commitComment = (row: IReading) => {
      const targetRow = findRowSafe(row);
      if (!targetRow) return;
      const body = commentBodyFromName(targetRow.name).trim();
      if (restoreNameIfEmpty(row, body)) return;
      targetRow.name = `# ${body}`;
      targetRow.updatedAt = new Date();
    };

    const openEditReading = (row: IReading) => {
      Dialog.create({
        component: EditReadingDialog,
        componentProps: {
          reading: row,
        },
      }).onOk((payload: {
        id?: number;
        tempId?: string | null;
        type: ReadingTypeEnum;
        dateTime: Date;
        name: string;
        description?: string;
      }) => {
        observation.readings.methods.updateReading(
          { id: payload.id, tempId: payload.tempId },
          {
            type: payload.type,
            name: payload.name,
            description: payload.description,
            dateTime: payload.dateTime,
          },
        );
      });
    };

    return {
      t,
      pagination,
      isChronometerMode,
      columns,
      getRowKey,
      getDurationInputValue,
      setDurationDraft,
      clearDurationDraft,
      commitDuration,
      getCalendarDateTimeValue,
      setCalendarDraft,
      clearCalendarDraft,
      commitCalendarDateTime,
      emitRemoveReading,
      emitDuplicateReading,
      emitClearAll,
      readingTypeOptions,
      getReadingTypeLabel,
      commitType,
      onCalendarInput,
      onDurationInput,
      onCommentNativeInput,
      isCommentReading,
      commentBodyFromName,
      snapshotName,
      onCommentInput,
      commitComment,
      getLabelTooltip,
      openEditReading,
      isUnrecognizedObservable,
    };
  },
});
</script>

<style scoped>
.readings-inline-control {
  display: inline-block;
  box-sizing: content-box;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  line-height: inherit;
  vertical-align: middle;
  width: auto;
  min-width: 0;
  field-sizing: content;
  accent-color: var(--accent);
}

.readings-inline-control:focus,
.readings-inline-control:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.readings-type-trigger {
  cursor: pointer;
}

.readings-type-option {
  color: var(--primary);
}

.readings-type-option--active {
  color: var(--accent);
  background: var(--button-rest-bg);
}

.comment-reading {
  color: #3b82f6;
  font-weight: 500;
}

.readings-label-tooltip-text {
  white-space: pre-line;
}

.unrecognized-observable {
  color: var(--danger, #ef4444) !important;
  font-weight: 600;
}

.unrecognized-observable-row {
  background-color: rgba(239, 68, 68, 0.08);
}

.readings-table {
  position: absolute;
  inset: 0;
}

.readings-q-table {
  position: absolute;
  inset: 0;

  &:deep() {
    .q-table__container {
      height: 100%;
      width: max-content;
    }

    thead tr th {
      position: sticky;
      top: 0;
      z-index: 1;
      background-color: white;
    }

    .q-table {
      table-layout: auto;
      width: max-content;
    }

    th,
    td {
      padding-left: 4px;
      padding-right: 8px;
      vertical-align: middle;
    }

    th:last-child,
    td:last-child {
      padding-right: 4px;
    }
  }
}
</style>
