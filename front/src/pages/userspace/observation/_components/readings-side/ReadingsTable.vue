<template>
  <div class="readings-table">
    <q-table
      ref="tableRef"
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
          'unrecognized-observable-row': isUnrecognizedObservable(props.row),
          'reading-row--selected': isSelectedReading(props.row),
        }"
        :aria-selected="isSelectedReading(props.row)"
        :data-reading-key="getRowKey(props.row)"
        tabindex="0"
        @click="selectReading(props.row)"
        @focusin="selectReading(props.row)"
        @keydown="onRowKeydown(props.row, $event)"
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
            @click.stop="selectReading(props.row)"
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
          <ReadingTimeInput
            v-if="isChronometerMode"
            class="readings-inline-control"
            kind="duration"
            :model-value="getDurationInputValue(props.row)"
            :saved-value="formatDurationCompactFromRow(props.row)"
            :ariaLabel="t('readingsUi.editDurationTitle')"
            :invalid="!!durationErrors[getRowKey(props.row)]"
            :title="durationErrors[getRowKey(props.row)] ? t('readingsUi.invalidTimestamp') : undefined"
            @update:model-value="setDurationDraft(props.row, $event)"
            @commit="commitDuration(props.row, $event)"
            @cancel="clearDurationDraft(props.row)"
            @click.stop="selectReading(props.row)"
          />
          <ReadingTimeInput
            v-else
            class="readings-inline-control"
            kind="calendar"
            :model-value="getCalendarDateTimeValue(props.row)"
            :saved-value="formatDateTime(props.row.dateTime)"
            :ariaLabel="t('readingsUi.colDateTime')"
            :invalid="!!calendarErrors[getRowKey(props.row)]"
            :title="calendarErrors[getRowKey(props.row)] ? t('readingsUi.invalidTimestamp') : undefined"
            @update:model-value="setCalendarDraft(props.row, $event)"
            @commit="commitCalendarDateTime(props.row, $event)"
            @cancel="clearCalendarDraft(props.row)"
            @click.stop="selectReading(props.row)"
          />
          <div v-if="calendarErrors[getRowKey(props.row)] || durationErrors[getRowKey(props.row)]"
            class="text-negative text-caption" role="alert">
            {{ t('readingsUi.invalidTimestamp') }}
          </div>
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
              @click.stop="selectReading(props.row)"
            >
            <span
              v-else
              class="readings-observable-editor"
            >
              <input
                class="readings-inline-control readings-observable-input"
                :class="{ 'unrecognized-observable': isUnrecognizedObservable(props.row) }"
                type="text"
                :value="getObservableValue(props.row)"
                :aria-label="t('readingsUi.colLabel')"
                @input="setObservableDraft(props.row, $event)"
                @blur="commitObservable(props.row)"
                @keydown.enter.stop.prevent="commitObservable(props.row)"
                @keydown.esc.stop="clearObservableDraft(props.row)"
                @click.stop="selectReading(props.row)"
              >
              <q-btn
                icon="arrow_drop_down"
                flat round dense size="xs"
                :disable="observableOptions.length === 0"
                :aria-label="t('readingsUi.chooseObservable')"
                @click.stop="selectReading(props.row)"
              >
                <q-tooltip>{{ t('readingsUi.chooseObservable') }}</q-tooltip>
                <q-menu>
                  <q-list dense class="readings-observable-options">
                    <template v-for="group in observableOptions" :key="group.name">
                      <q-item dense class="text-weight-bold" aria-disabled="true">
                        <q-item-section>{{ group.name }}</q-item-section>
                      </q-item>
                      <q-item
                        v-for="name in group.names"
                        :key="name"
                        clickable dense v-close-popup
                        :active="props.row.name === name"
                        :data-observable-option="name"
                        @click="chooseObservable(props.row, name)"
                      >
                        <q-item-section>{{ name }}</q-item-section>
                      </q-item>
                    </template>
                  </q-list>
                </q-menu>
              </q-btn>
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
import { defineComponent, computed, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { QTableColumn, QTable, Dialog } from 'quasar';
import { readingKey, sameReading } from 'src/utils/reading-identity';
import { date as qDate } from 'quasar';
import { useObservation } from 'src/composables/use-observation';
import { formatSegmentedDuration, parseSegmentedDuration, isValidSegmentedTime } from 'src/utils/segmented-time';
import {
  formatCalendarDateTime,
  getObservationTimeZone,
  getLocalTimeZone,
} from '@actograph/core';
import { parseCalendarDateTimeEditInTimeZone } from 'src/utils/calendar-date-time';
import EditReadingDialog from './EditReadingDialog.vue';
import ReadingTimeInput from './ReadingTimeInput.vue';

export default defineComponent({
  name: 'ReadingsTable',
  components: { ReadingTimeInput },

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

  emits: ['remove-reading', 'clear-all', 'invalid-timestamps'],

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
    const tableRef = ref<QTable | null>(null);
    const selectedReading = computed(() => observation.readings.sharedState.selectedReading);
    const isSelectedReading = (row: IReading) => sameReading(row, selectedReading.value);
    const selectReading = (row: IReading) => observation.readings.methods.selectReading(row);
    const onRowKeydown = (row: IReading, event: KeyboardEvent) => {
      // Let inputs, buttons and menu controls handle their own keystrokes.
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectReading(row);
      }
    };
    const selectedDisplayIndex = computed(() => {
      const rows = tableRef.value?.filteredSortedRows ?? props.readings;
      return rows.findIndex((row: IReading) => sameReading(row, selectedReading.value));
    });
    watch(
      [() => selectedReading.value ? readingKey(selectedReading.value) : null, selectedDisplayIndex],
      async () => {
        await nextTick();
        const index = selectedDisplayIndex.value;
        if (index >= 0) tableRef.value?.scrollTo(index, 'center');
      },
      { flush: 'post', immediate: true },
    );
    const isChronometerMode = computed(() => observation.isChronometerMode.value);

    const getRowKey = readingKey;

    const calendarDrafts = ref<Record<string, string>>({});
    const calendarErrors = ref<Record<string, boolean>>({});
    const durationDrafts = ref<Record<string, string>>({});
    const durationErrors = ref<Record<string, boolean>>({});
    watch(() => observation.readings.sharedState.currentReadings.some((row) =>
      calendarErrors.value[getRowKey(row)] || durationErrors.value[getRowKey(row)]
    ), (invalid) => emit('invalid-timestamps', invalid), { immediate: true });
    const observableDrafts = ref<Record<string, string>>({});

    const observableOptions = computed(() => {
      const items = observation.protocol.sharedState.currentProtocol?._items ?? [];
      return items
        .filter((item) => item.type === ProtocolItemTypeEnum.Category)
        .map((item) => ({
          name: item.name,
          names: (item.children ?? []).map((child) => child.name).filter((name): name is string => Boolean(name)),
        }))
        .filter((group) => group.names.length > 0);
    });

    const getObservableValue = (row: IReading) => observableDrafts.value[getRowKey(row)] ?? row.name;
    const setObservableDraft = (row: IReading, event: Event) => {
      observableDrafts.value[getRowKey(row)] = (event.target as HTMLInputElement).value;
    };
    const clearObservableDraft = (row: IReading) => {
      delete observableDrafts.value[getRowKey(row)];
    };
    const commitObservable = (row: IReading) => {
      const value = getObservableValue(row).trim();
      clearObservableDraft(row);
      if (!value || value === row.name) return;
      observation.readings.methods.updateReading(
        { id: row.id, tempId: row.tempId },
        { name: value },
      );
    };
    const chooseObservable = (row: IReading, name: string) => {
      observableDrafts.value[getRowKey(row)] = name;
      commitObservable(row);
      selectReading(row);
    };

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
      return formatSegmentedDuration(durationMs);
    };

    const getCalendarDateTimeValue = (row: IReading) =>
      calendarDrafts.value[getRowKey(row)] ?? formatDateTime(row.dateTime);

    const setCalendarDraft = (row: IReading, val: string | number | null) => {
      calendarErrors.value[getRowKey(row)] = !isValidSegmentedTime(String(val ?? ''), 'calendar');
      calendarDrafts.value = {
        ...calendarDrafts.value,
        [getRowKey(row)]: val == null ? '' : String(val),
      };
    };

    const clearCalendarDraft = (row: IReading) => {
      const key = getRowKey(row);
      delete calendarErrors.value[key];
      if (!(key in calendarDrafts.value)) return;
      const next = { ...calendarDrafts.value };
      delete next[key];
      calendarDrafts.value = next;
    };

    const getDurationInputValue = (row: IReading) =>
      durationDrafts.value[getRowKey(row)] ?? formatDurationCompactFromRow(row);

    const setDurationDraft = (row: IReading, val: string | number | null) => {
      durationErrors.value[getRowKey(row)] = !isValidSegmentedTime(String(val ?? ''), 'duration');
      durationDrafts.value = {
        ...durationDrafts.value,
        [getRowKey(row)]: val == null ? '' : String(val),
      };
    };

    const clearDurationDraft = (row: IReading) => {
      const key = getRowKey(row);
      delete durationErrors.value[key];
      if (!(key in durationDrafts.value)) return;
      const next = { ...durationDrafts.value };
      delete next[key];
      durationDrafts.value = next;
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
      if (!isValidSegmentedTime(value, 'calendar')) {
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
      ) ?? getLocalTimeZone();
      return parseCalendarDateTimeEditInTimeZone(value, sourceDate, timeZone);
    };

    const commitCalendarDateTime = (row: IReading, value = getCalendarDateTimeValue(row)) => {
      const parsed = parseCalendarDateTime(value, row);
      if (!parsed) {
        calendarErrors.value[getRowKey(row)] = true;
        return;
      }
      clearCalendarDraft(row);
      applyDateTime(row, parsed);
    };

    const commitDuration = (row: IReading, value = getDurationInputValue(row)) => {
      const durationMs = parseSegmentedDuration(value);
      const dateValue = durationMs === null ? null : observation.chronometerMethods.durationToDate(durationMs);
      if (!dateValue || !Number.isFinite(dateValue.getTime())) {
        durationErrors.value[getRowKey(row)] = true;
        return;
      }
      clearDurationDraft(row);
      applyDateTime(row, dateValue);
    };

    const emitRemoveReading = (row: IReading) => {
      emit('remove-reading', row);
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
      selectReading(row);
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
      resetChronologicalSort: () => { pagination.value = { ...pagination.value, sortBy: 'dateTime', descending: false }; },
      tableRef,
      isSelectedReading,
      selectReading,
      onRowKeydown,
      pagination,
      isChronometerMode,
      columns,
      getRowKey,
      observableOptions,
      getObservableValue,
      setObservableDraft,
      commitObservable,
      chooseObservable,
      clearObservableDraft,
      calendarErrors,
      durationErrors,
      formatDateTime,
      formatDurationCompactFromRow,
      getDurationInputValue,
      setDurationDraft,
      clearDurationDraft,
      commitDuration,
      getCalendarDateTimeValue,
      setCalendarDraft,
      clearCalendarDraft,
      commitCalendarDateTime,
      emitRemoveReading,
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
.reading-row--selected {
  background-color: var(--button-rest-bg, #e8f0fe);
  outline: 2px solid var(--accent, #2563eb);
  outline-offset: -2px;
}

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

.readings-observable-editor {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.readings-observable-options {
  max-height: 20rem;
  min-width: 12rem;
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
  height: 100%;
}

.readings-q-table :deep(thead tr th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: white;
}

.readings-q-table :deep(.q-table) {
  table-layout: auto;
  width: max-content;
}

.readings-q-table :deep(th),
.readings-q-table :deep(td) {
  padding-left: 4px;
  padding-right: 8px;
  vertical-align: middle;
}

.readings-q-table :deep(th:last-child),
.readings-q-table :deep(td:last-child) {
  padding-right: 4px;
}
</style>
