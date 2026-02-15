<template>
  <q-table
    class="readings-table"
    dense
    :rows="readings"
    :columns="columns"
    :row-key="getRowKey"
    binary-state-sort
    virtual-scroll
    :virtual-scroll-sticky-size-start="48"
    table-style="max-height: 100%;"
    :rows-per-page-options="[0]"
    hide-pagination
    hide-bottom
  >
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr 
          :props="props" 
          :class="{ 
            'selected-row': isRowSelected(props.row),
            'unrecognized-observable-row': isUnrecognizedObservable(props.row)
          }"
          @click="toggleRowSelection(props.row)"
        >
          <q-td key="order" :props="props">
            {{ props.rowIndex + 1 }}
          </q-td>
          <q-td key="type" :props="props">
            <div class="editable-cell">
              {{ getReadingTypeLabel(props.row.type) }}
              <q-popup-edit 
                v-model="props.row.type" 
                title="Editer le type" 
                buttons
                @save="(val, initialVal) => handleTypeSave(props.row, val, initialVal)"
                v-slot="scope"
              >
                <q-select
                  v-model="scope.value"
                  :options="readingTypeOptions"
                  option-label="label"
                  option-value="value"
                  emit-value
                  map-options
                  dense
                  autofocus
                />
              </q-popup-edit>
            </div>
          </q-td>
          <q-td key="dateTime" :props="props">
            <div class="editable-cell">
              <span v-if="observation.isChronometerMode.value">
                {{ formatDuration(props.row.dateTime) }}
              </span>
              <span v-else>
              {{ formatDateTime(props.row.dateTime) }}
              </span>
              <q-popup-edit 
                :model-value="observation.isChronometerMode.value ? formatDurationForEdit(props.row.dateTime) : formatDateTimeForEdit(props.row.dateTime)"
                :title="observation.isChronometerMode.value ? 'Editer la durée' : 'Editer la date et l\'heure'" 
                buttons
                @before-show="() => syncDurationEditStateFromRow(props.row)"
                @save="(val, initialVal) => handleDateTimeSave(props.row, val, initialVal)"
                v-slot="scope"
              >
                <!-- Duration editor (chronometer mode) -->
                <div v-if="observation.isChronometerMode.value" class="column q-gutter-sm">
                  <!-- Champ texte pour copier-coller rapide (Bug 2b.4) -->
                  <q-input
                    :model-value="formatDurationCompact()"
                    @update:model-value="parseDurationFromText($event)"
                    label="Durée (copier-coller)"
                    dense
                    placeholder="ex: 1h 30m 45s"
                    hint="Formats: Xj Yh Zm Ws Vms"
                  />
                  <div class="row q-gutter-sm">
                    <q-input
                      v-model.number="durationEditState.days"
                      type="number"
                      label="Jours"
                      dense
                      autofocus
                      :min="0"
                      style="width: 100px"
                    />
                    <q-input
                      v-model.number="durationEditState.hours"
                      type="number"
                      label="Heures"
                      dense
                      :min="0"
                      :max="23"
                      style="width: 100px"
                    />
                    <q-input
                      v-model.number="durationEditState.minutes"
                      type="number"
                      label="Minutes"
                      dense
                      :min="0"
                      :max="59"
                      style="width: 100px"
                    />
                  </div>
                  <div class="row q-gutter-sm">
                    <q-input
                      v-model.number="durationEditState.seconds"
                      type="number"
                      label="Secondes"
                      dense
                      :min="0"
                      :max="59"
                      style="width: 100px"
                    />
                    <q-input
                      v-model.number="durationEditState.milliseconds"
                      type="number"
                      label="Millisecondes"
                      dense
                      :min="0"
                      :max="999"
                      style="width: 150px"
                    />
                  </div>
                </div>
                <!-- Date/time editor (calendar mode) -->
                <div v-else class="column q-gutter-sm">
                  <q-input
                    v-model="scope.value"
                    mask="##/##/#### ##:##:##.###"
                    fill-mask="_"
                    dense
                    autofocus
                    hint="Format: DD/MM/YYYY HH:mm:ss.SSS"
                    label="Date et heure"
                  >
                    <template v-slot:append>
                      <q-icon name="event" class="cursor-pointer">
                        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                          <q-date
                            :model-value="getDatePart(scope.value)"
                            @update:model-value="(val) => updateDatePart(scope, val)"
                            mask="DD/MM/YYYY"
                          >
                            <div class="row items-center justify-end">
                              <q-btn v-close-popup label="OK" color="primary" flat />
                            </div>
                          </q-date>
                        </q-popup-proxy>
                      </q-icon>
                      <q-icon name="access_time" class="cursor-pointer">
                        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                          <q-time
                            :model-value="getTimePartWithoutMs(scope.value)"
                            @update:model-value="(val) => updateTimePartFromPicker(scope, val)"
                            mask="HH:mm:ss"
                            format24h
                          >
                            <div class="row items-center justify-end">
                              <q-btn v-close-popup label="OK" color="primary" flat />
                            </div>
                          </q-time>
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </div>
              </q-popup-edit>
            </div>
          </q-td>
          <q-td key="name" :props="props">
            <div class="editable-cell">
              <span 
                :class="{ 
                  'comment-reading': props.row.name?.startsWith('#'),
                  'unrecognized-observable': isUnrecognizedObservable(props.row)
                }"
                :title="getUnrecognizedObservableTitle(props.row)"
              >
                {{ props.row.name }}
              </span>
              <q-popup-edit 
                v-model="props.row.name" 
                title="Editer le libellé" 
                buttons
                @save="(val, initialVal) => handleNameSave(props.row, val, initialVal)"
                v-slot="scope"
              >
                <q-select
                  v-if="protocolObservableOptions.length > 0"
                  v-model="scope.value"
                  :options="filteredObservableOptions"
                  option-label="label"
                  option-value="value"
                  :option-disable="(opt) => opt.disable === true"
                  use-input
                  fill-input
                  hide-selected
                  input-debounce="0"
                  emit-value
                  map-options
                  dense
                  autofocus
                  new-value-mode="add-unique"
                  @filter="filterObservables"
                  :rules="[val => val && val.length > 0 || 'Le libellé ne peut pas être vide']"
                  class="observable-autocomplete"
                >
                  <template v-slot:option="optScope">
                    <q-item v-if="optScope.opt.isCategory" dense class="text-weight-bold non-selectable" :style="{ color: optScope.opt.categoryColor || 'var(--primary)' }">
                      <q-item-section>{{ optScope.opt.label }}</q-item-section>
                    </q-item>
                    <q-item v-else v-bind="optScope.itemProps" dense class="q-pl-lg">
                      <q-item-section>{{ optScope.opt.label }}</q-item-section>
                    </q-item>
                  </template>
                  <template v-slot:no-option>
                    <q-item dense>
                      <q-item-section class="text-grey text-italic">
                        Saisie libre — appuyez Entrée pour valider
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <q-input
                  v-else
                  type="text"
                  v-model="scope.value"
                  dense
                  autofocus
                  :rules="[val => val && val.length > 0 || 'Le libellé ne peut pas être vide']"
                />
              </q-popup-edit>
            </div>
          </q-td>
          <q-td key="description" :props="props">
            <div class="editable-cell">
              {{ props.row.description || '-' }}
              <q-popup-edit 
                v-model="props.row.description" 
                title="Editer la description" 
                buttons
                @save="(val, initialVal) => handleDescriptionSave(props.row, val, initialVal)"
                v-slot="scope"
              >
                <q-input 
                  type="textarea" 
                  v-model="scope.value" 
                  dense 
                  autofocus
                  autogrow
                />
              </q-popup-edit>
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, reactive } from 'vue';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { ProtocolItemTypeEnum } from '@services/observations/protocol.service';
import { QTableColumn } from 'quasar';
import { date as qDate } from 'quasar';
import { useObservation } from 'src/composables/use-observation';
import { useDuration } from 'src/composables/use-duration';

export default defineComponent({
  name: 'ReadingsTable',
  
  props: {
    readings: {
      type: Array as () => IReading[],
      required: true,
    },
    selected: {
      type: Array as () => IReading[],
      default: () => [],
    },
  },
  
  emits: ['update:selected'],
  
  setup(props, { emit }) {
    const columns: QTableColumn[] = [
      {
        name: 'order',
        label: 'N°',
        field: 'order',
        align: 'left',
        sortable: false,
      },
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        align: 'left',
        sortable: true,
      },
      {
        name: 'dateTime',
        label: 'Date & heure',
        field: 'dateTime',
        align: 'left',
        sortable: true,
      },
      {
        name: 'name',
        label: 'Libellé',
        field: 'name',
        align: 'left',
        sortable: true,
      },
      {
        name: 'description',
        label: 'Description',
        field: 'description',
        align: 'left',
        sortable: false,
      },
    ];

    const observation = useObservation();
    const duration = useDuration();
    const isChronometerMode = computed(() => observation.isChronometerMode.value);

    // Bug 2.6 : Liste des noms d'observables reconnus dans le protocole
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

    // Bug 2.8 : Options pour le menu déroulant des observables (groupées par catégorie)
    type ProtocolObservableOption = {
      label: string;
      value: string;
      isCategory?: boolean;
      categoryColor?: string;
      disable?: boolean;
    };
    const protocolObservableOptions = computed((): ProtocolObservableOption[] => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol?._items) return [];
      const options: ProtocolObservableOption[] = [];
      for (const item of protocol._items) {
        const isCategory = item.type === ProtocolItemTypeEnum.Category;
        if (isCategory) {
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
                options.push({
                  label: child.name,
                  value: child.name,
                });
              }
            }
          }
        }
      }
      return options;
    });

    // Options filtrées pour l'autocomplétion (réactif, mis à jour par @filter)
    const filteredObservableOptions = ref<ProtocolObservableOption[]>([]);

    // Filtre les options d'observables selon la saisie utilisateur
    // Affiche les catégories uniquement si elles ont des enfants correspondants
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
            // Collecter les enfants correspondants de cette catégorie
            const children: ProtocolObservableOption[] = [];
            let j = i + 1;
            while (j < allOptions.length && !allOptions[j].isCategory) {
              if (allOptions[j].label.toLowerCase().includes(needle)) {
                children.push(allOptions[j]);
              }
              j++;
            }
            // Ajouter la catégorie uniquement si elle a des enfants correspondants
            if (children.length > 0) {
              result.push(opt);
              result.push(...children);
            }
          }
        }
        filteredObservableOptions.value = result;
      });
    };

    // Bug 2.6 : Titre tooltip pour un observable non reconnu
    const getUnrecognizedObservableTitle = (row: IReading): string | undefined => {
      if (!isUnrecognizedObservable(row)) return undefined;
      return 'Observable non reconnu : "' + row.name + '" n\'existe pas dans le protocole actuel';
    };

    // Bug 2.6 : Vérifie si un relevé DATA a un observable non reconnu
    const isUnrecognizedObservable = (row: IReading): boolean => {
      if (row.type !== ReadingTypeEnum.DATA || !row.name) return false;
      if (row.name.startsWith('#')) return false; // Commentaires
      return !protocolObservableNames.value.has(row.name);
    };
    
    // State for duration editing
    const durationEditState = reactive({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    const selectedInternal = ref<IReading[]>([]);
    
    // Watch the parent's selected readings and update internal state
    // This keeps the table's selection in sync with the parent component
    watch(() => props.selected, (newVal) => {
      selectedInternal.value = newVal || [];
    }, { immediate: true });
    
    // Check if a row is selected using a safe comparison (supports both id and tempId)
    // This function handles three cases:
    // 1. Readings with id (persisted readings from backend)
    // 2. Readings with tempId (newly created readings not yet saved)
    // 3. Same object reference (direct comparison)
    const isRowSelected = (row: IReading) => {
      if (!row || selectedInternal.value.length === 0) {
        return false;
      }
      
      return selectedInternal.value.some(r => {
        if (!r) return false;
        // Compare by id if both have id
        if (r.id && row.id && r.id === row.id) return true;
        // Compare by tempId if both have tempId
        if (r.tempId && row.tempId && r.tempId === row.tempId) return true;
        // Compare by reference (same object)
        return r === row;
      });
    };
    
    // Toggle row selection with improved safety (supports both id and tempId)
    // This allows selecting readings whether they have an id or tempId
    const toggleRowSelection = (row: IReading) => {
      if (!row) return;
      if (isRowSelected(row)) {
        selectedInternal.value = [];
      } else {
        // Make sure we only select this row
        selectedInternal.value = [row];
      }
      
      emit('update:selected', selectedInternal.value);
    };
    
    // Format date and time for display
    const formatDateTime = (dateTime: Date | string) => {
      if (!dateTime) return '';
      
      const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
      
      return qDate.formatDate(date, 'DD/MM/YYYY HH:mm:ss.SSS');
    };

    // Format date and time for editing (returns string)
    const formatDateTimeForEdit = (dateTime: Date | string) => {
      if (!dateTime) return '';
      return formatDateTime(dateTime);
    };

    // Format duration for display (chronometer mode)
    const formatDuration = (dateTime: Date | string): string => {
      if (!dateTime) return '';
      
      const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
      
      if (!isChronometerMode.value) {
        return formatDateTime(dateTime);
      }
      
      return observation.chronometerMethods.formatDateAsDuration(date);
    };

    // Format duration for editing (returns object with parts)
    const formatDurationForEdit = (dateTime: Date | string) => {
      if (!dateTime) {
        durationEditState.days = 0;
        durationEditState.hours = 0;
        durationEditState.minutes = 0;
        durationEditState.seconds = 0;
        durationEditState.milliseconds = 0;
        return '';
      }
      
      const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
      
      if (!isChronometerMode.value) {
        return formatDateTimeForEdit(dateTime);
      }
      
      // Convert date to duration milliseconds
      const durationMs = observation.chronometerMethods.dateToDuration(date);
      const parts = duration.millisecondsToParts(durationMs);
      
      // Update edit state
      durationEditState.days = parts.days;
      durationEditState.hours = parts.hours;
      durationEditState.minutes = parts.minutes;
      durationEditState.seconds = parts.seconds;
      durationEditState.milliseconds = parts.milliseconds;
      
      return duration.formatCompact(durationMs);
    };

    // Bug 2b.3 : Synchronise l'état d'édition avec la ligne correcte à l'ouverture du popup
    const syncDurationEditStateFromRow = (row: IReading) => {
      if (row?.dateTime) {
        formatDurationForEdit(row.dateTime);
      }
    };

    // Bug 2b.4 : Format compact pour affichage (ex: "1j 2h 30m 45s 500ms")
    const formatDurationCompact = () => {
      const parts: string[] = [];
      if (durationEditState.days > 0) parts.push(`${durationEditState.days}j`);
      if (durationEditState.hours > 0) parts.push(`${durationEditState.hours}h`);
      if (durationEditState.minutes > 0) parts.push(`${durationEditState.minutes}m`);
      if (durationEditState.seconds > 0) parts.push(`${durationEditState.seconds}s`);
      if (durationEditState.milliseconds > 0) parts.push(`${durationEditState.milliseconds}ms`);
      return parts.join(' ') || '0s';
    };

    // Bug 2b.4 : Parse du format compact (ex: "1j 2h 30m 45s 500ms", "2h30m", "45s")
    const parseDurationFromText = (text: string) => {
      if (!text || typeof text !== 'string') return;
      // ms avant m pour éviter que "500ms" soit interprété comme "500s"
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

    // Extract date part from datetime string (DD/MM/YYYY)
    const getDatePart = (dateTimeStr: string) => {
      if (!dateTimeStr) return '';
      const parts = dateTimeStr.split(' ');
      return parts[0] || '';
    };

    // Extract time part from datetime string without milliseconds (HH:mm:ss)
    const getTimePartWithoutMs = (dateTimeStr: string) => {
      if (!dateTimeStr) return '';
      const parts = dateTimeStr.split(' ');
      const timePart = parts[1] || '';
      // Remove milliseconds if present
      return timePart.split('.')[0] || '';
    };

    // Extract time part from datetime string (HH:mm:ss.SSS)
    const getTimePart = (dateTimeStr: string) => {
      if (!dateTimeStr) return '';
      const parts = dateTimeStr.split(' ');
      return parts[1] || '';
    };

    // Update date part in scope value
    const updateDatePart = (scope: any, dateVal: string) => {
      const timePart = getTimePart(scope.value || '');
      scope.value = `${dateVal} ${timePart || '00:00:00.000'}`;
    };

    // Update time part in scope value from time picker (without ms)
    const updateTimePartFromPicker = (scope: any, timeVal: string | null) => {
      if (timeVal === null) return;
      const datePart = getDatePart(scope.value || '');
      const currentTimePart = getTimePart(scope.value || '');
      // Preserve milliseconds if they exist, otherwise add .000
      const msPart = currentTimePart.includes('.') ? currentTimePart.split('.')[1] : '000';
      scope.value = `${datePart || qDate.formatDate(new Date(), 'DD/MM/YYYY')} ${timeVal}.${msPart}`;
    };
    
    // Get readable label for reading type
    const getReadingTypeLabel = (type: ReadingTypeEnum) => {
      const labels = {
        [ReadingTypeEnum.START]: 'Début',
        [ReadingTypeEnum.STOP]: 'Fin',
        [ReadingTypeEnum.PAUSE_START]: 'Déb pause',
        [ReadingTypeEnum.PAUSE_END]: 'Fin pause',
        [ReadingTypeEnum.DATA]: 'Data',
      };
      
      return labels[type] || type;
    };

    // Options for reading type select
    const readingTypeOptions = [
      { label: 'Début', value: ReadingTypeEnum.START },
      { label: 'Fin', value: ReadingTypeEnum.STOP },
      { label: 'Déb pause', value: ReadingTypeEnum.PAUSE_START },
      { label: 'Fin pause', value: ReadingTypeEnum.PAUSE_END },
      { label: 'Data', value: ReadingTypeEnum.DATA },
    ];

    // Retrouve la ligne réelle par id/tempId dans le tableau readings.
    // Nécessaire car le virtual-scroll de q-table peut recycler les références d'objets row.
    const findRowSafe = (row: IReading): IReading | undefined => {
      return props.readings.find((r: IReading) =>
        (row.id && r.id === row.id) || (row.tempId && r.tempId === row.tempId) || r === row
      );
    };

    // Handle type save
    const handleTypeSave = (row: IReading, val: ReadingTypeEnum, initialVal: ReadingTypeEnum) => {
      if (!val) return;
      const targetRow = findRowSafe(row);
      if (targetRow) {
        targetRow.type = val;
        targetRow.updatedAt = new Date();
      }
    };

    // Handle date/time save with proper conversion
    const handleDateTimeSave = (row: IReading, val: any, initialVal: any) => {
      if (!val && !isChronometerMode.value) return;
      
      let dateValue: Date;
      
      if (isChronometerMode.value) {
        // In chronometer mode, convert duration parts to date
        if (!duration.validateParts(durationEditState)) {
          return; // Invalid duration parts
        }
        
        const durationMs = duration.partsToMilliseconds(durationEditState);
        dateValue = observation.chronometerMethods.durationToDate(durationMs);
      } else {
        // In calendar mode, parse date string
        if (val instanceof Date) {
          dateValue = val;
        } else if (typeof val === 'string') {
          const parsed = qDate.extractDate(val, 'DD/MM/YYYY HH:mm:ss.SSS');
          if (parsed) {
            dateValue = parsed;
          } else {
            dateValue = new Date(val);
          }
        } else {
          dateValue = new Date(val);
        }
      }
      
      const targetRow = findRowSafe(row);
      if (targetRow) {
        targetRow.dateTime = dateValue;
        targetRow.updatedAt = new Date();
      }
    };

    // Handle name save
    // Utilise le même pattern de row-lookup que handleDateTimeSave (sécurité virtual-scroll)
    const handleNameSave = (row: IReading, val: string, initialVal: string) => {
      if (!val || !val.trim()) return;
      const targetRow = findRowSafe(row);
      if (targetRow) {
        targetRow.name = val.trim();
        targetRow.updatedAt = new Date();
      }
    };

    // Handle description save
    // Utilise le même pattern de row-lookup que handleDateTimeSave (sécurité virtual-scroll)
    const handleDescriptionSave = (row: IReading, val: string | undefined, initialVal: string | undefined) => {
      const targetRow = findRowSafe(row);
      if (targetRow) {
        targetRow.description = val || undefined;
        targetRow.updatedAt = new Date();
      }
    };
    
    // Get row key for q-table (use id if available, otherwise tempId)
    // This ensures that both persisted readings (with id) and new readings (with tempId)
    // can be properly tracked by the table's virtual scrolling and selection system
    const getRowKey = (row: IReading) => {
      return row.id ? `id-${row.id}` : `tempId-${row.tempId || 'unknown'}`;
    };
    
    return {
      observation,
      duration,
      isChronometerMode,
      durationEditState,
      columns,
      formatDuration,
      formatDurationForEdit,
      syncDurationEditStateFromRow,
      formatDurationCompact,
      parseDurationFromText,
      formatDateTime,
      formatDateTimeForEdit,
      getDatePart,
      getTimePart,
      getTimePartWithoutMs,
      updateDatePart,
      updateTimePartFromPicker,
      getReadingTypeLabel,
      readingTypeOptions,
      isRowSelected,
      toggleRowSelection,
      handleDateTimeSave,
      handleNameSave,
      handleDescriptionSave,
      handleTypeSave,
      getRowKey,
      isUnrecognizedObservable,
      getUnrecognizedObservableTitle,
      protocolObservableOptions,
      filteredObservableOptions,
      filterObservables,
    };
  },
});
</script>

<style scoped>
.selected-row {
  background-color: rgba(25, 118, 210, 0.1);
}

/* Style the selected row more clearly */
tr.selected-row td {
  font-weight: 500;
}

/* Make editable cells more visible */
.editable-cell {
  position: relative;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.editable-cell:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.editable-cell:active {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Style for comment readings (name starting with "#") */
.comment-reading {
  color: #3b82f6; /* Blue color */
  font-weight: 500;
}

/* Bug 2.6 : Observable non reconnu dans le protocole */
.unrecognized-observable {
  color: var(--danger, #ef4444) !important;
  font-weight: 600;
}

.unrecognized-observable-row {
  background-color: rgba(239, 68, 68, 0.08);
}

/* Autocomplete observable : largeur minimale pour le popup */
.observable-autocomplete {
  min-width: 250px;
}

/* Table container for virtual scroll */
.readings-table {
  position: absolute;
  inset: 0;
  
  &:deep() {
    .q-table__container {
      height: 100%;
    }
    
    /* Sticky header */
    thead tr th {
      position: sticky;
      top: 0;
      z-index: 1;
      background-color: white;
    }
  }
}
</style> 