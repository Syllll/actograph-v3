<template>
  <div v-if="observation.sharedState.currentObservation?.id" class="exchange-actions row items-center no-wrap">
    <span class="exchange-import"><q-btn flat dense no-caps icon="mdi-import" :label="$t('exchange.import')" :disable="recording || busy" :aria-label="recording ? $t('exchange.recording') : $t('exchange.import')" @click="openImport" /><q-tooltip v-if="recording">{{ $t('exchange.recording') }}</q-tooltip></span>
    <q-btn flat dense no-caps icon="mdi-export" :label="$t('exchange.export')" :disable="empty || busy">
      <q-menu><q-list dense><q-item clickable v-close-popup @click="save('xlsx')"><q-item-section>Excel (.xlsx)</q-item-section></q-item><q-item clickable v-close-popup @click="save('csv')"><q-item-section>CSV (.csv)</q-item-section></q-item></q-list></q-menu>
    </q-btn>
    <q-dialog v-model="opened" persistent>
      <q-card style="width: 620px; max-width: 95vw">
        <q-card-section class="text-h6">{{ $t('exchange.preview') }}</q-card-section>
        <q-card-section>
          <div>{{ $t('exchange.previewHelp') }}</div>
          <div v-if="legacy">{{ $t('exchange.legacy') }}</div>
          <q-option-group v-model="importMode" :options="modeOptions" :disable="busy" type="radio" @update:model-value="refreshPreview" />
          <div v-if="preview" class="q-mt-md">
            {{ $t('exchange.counts', preview.counts) }}
            <div v-if="importMode === 'replace'" class="q-mt-sm">{{ $t('exchange.backup') }}</div>
            <div v-if="preview.diagnostics.some(d => d.severity === 'error')" class="text-negative q-mt-sm">{{ $t('exchange.errors') }}</div>
            <ul v-if="preview.diagnostics.some(d => d.severity === 'error')"><li v-for="(diagnostic, i) in preview.diagnostics.filter(d => d.severity === 'error')" :key="i">{{ diagnostic.row ? `${$t('exchange.line')} ${diagnostic.row}: ` : '' }}{{ diagnostic.message }}</li></ul>
            <div v-if="preview.diagnostics.some(d => d.severity === 'warning')" class="q-mt-sm">{{ $t('exchange.warnings') }}</div>
            <ul v-if="preview.diagnostics.some(d => d.severity === 'warning')"><li v-for="(diagnostic, i) in preview.diagnostics.filter(d => d.severity === 'warning')" :key="i">{{ diagnostic.row ? `${$t('exchange.line')} ${diagnostic.row}: ` : '' }}{{ diagnostic.message }}</li></ul>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps :label="$t('exchange.cancel')" :disable="busy" v-close-popup />
          <q-btn color="primary" no-caps :label="$t('exchange.import')" :loading="busy" :disable="!preview?.canApply || recording" @click="apply" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, ref, watch } from 'vue';
import { Dialog, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';
import { waitForPendingReadingSynchronization } from 'src/composables/use-observation/use-readings';
import { tabularExchangeService, type ExchangePreview } from '@services/observations/tabular-exchange.service';
import { ObservationModeEnum, type TabularExchangeDocument } from '@actograph/core';
import { createChronicleGeneration } from 'src/utils/chronicle-generation';

export default defineComponent({
  name: 'TabularExchangeActions',
  props: {
    kind: { type: String as PropType<'readings' | 'protocol'>, required: true },
    prepare: { type: Function as PropType<() => boolean>, default: () => true },
  },
  emits: ['applied'],
  setup(props, { emit }) {
    const observation = useObservation();
    const { t } = useI18n();
    const $q = useQuasar();
    const opened = ref(false);
    const legacy = ref(false);
    const busy = ref(false);
    const document = ref<TabularExchangeDocument | null>(null);
    const preview = ref<ExchangePreview | null>(null);
    const importMode = ref<'add' | 'replace'>('add');
    let previewSequence = 0;
    const generation = createChronicleGeneration();
    let previewObservationId: number | undefined;
    watch(() => observation.sharedState.currentObservation?.id, () => {
      previewSequence++;
      generation.invalidate();
      opened.value = false;
      preview.value = null;
      document.value = null;
      previewObservationId = undefined;
    }, { flush: 'sync' });
    const recording = computed(() => observation.sharedState.currentObservation?.meta?.entryMode !== 'manual' && (observation.sharedState.isPlaying || observation.sharedState.startTime != null));
    const empty = computed(() => props.kind === 'readings' ? !observation.readings.sharedState.currentReadings.length : !observation.protocol.sharedState.currentProtocol?._items?.length);
    const modeOptions = computed(() => [{ label: t('exchange.add'), value: 'add' }, { label: t('exchange.replace'), value: 'replace' }]);
    const fail = (error: unknown) => {
      const response = (error as { response?: { data?: { code?: string; message?: string } }; message?: string });
      const diagnostics = (error as { diagnostics?: { row?: number; message: string }[] }).diagnostics;
      const details = diagnostics?.map((entry) => `${entry.row ? `${t('exchange.line')} ${entry.row}: ` : ''}${entry.message}`).join('\n');
      $q.notify({ type: 'negative', timeout: 0, multiLine: true, message: response.response?.data?.code === 'EXCHANGE_PREVIEW_STALE' ? t('exchange.stale') : details || response.response?.data?.message || response.message || t('exchange.failed'), actions: [{ label: t('exchange.close'), color: 'white' }] });
    };
    const synchronize = async () => {
      if (!props.prepare()) throw new Error(t('exchange.invalidDraft'));
      await waitForPendingReadingSynchronization();
      await observation.readings.methods.synchronizeReadings();
      await waitForPendingReadingSynchronization();
    };
    const refreshPreview = async () => {
      const id = observation.sharedState.currentObservation?.id;
      if (!id || id !== previewObservationId || !document.value) return;
      preview.value = null;
      const sequence = ++previewSequence;
      try {
        const result = await tabularExchangeService.preview(id, props.kind, importMode.value, document.value);
        if (sequence === previewSequence) preview.value = result;
      } catch (error) { if (sequence === previewSequence) fail(error); }
    };
    const openImport = async () => {
      const id = observation.sharedState.currentObservation?.id;
      if (!id || recording.value) return;
      const capturedGeneration = generation.capture();
      busy.value = true;
      try {
        await synchronize();
        const mode = observation.sharedState.currentObservation?.mode === 'chronometer' ? ObservationModeEnum.Chronometer : ObservationModeEnum.Calendar;
        const selected = await tabularExchangeService.read(id, props.kind, mode, () => new Promise((resolve) => {
          Dialog.create({ title: t('exchange.timeZoneTitle'), message: t('exchange.timeZoneHelp'), prompt: { model: Intl.DateTimeFormat().resolvedOptions().timeZone, type: 'text' }, cancel: true, persistent: true })
            .onOk((value: string) => resolve(value.trim()))
            .onCancel(() => resolve(null));
        }), (names) => new Promise((resolve) => {
          Dialog.create({ title: t('exchange.sheetTitle'), options: { type: 'radio', model: names[0], items: names.map((name) => ({ label: name, value: name })) }, cancel: true, persistent: true })
            .onOk((value: string) => resolve(value))
            .onCancel(() => resolve(null));
        }));
        if (!selected) return;
        if (!generation.isCurrent(capturedGeneration) || observation.sharedState.currentObservation?.id !== id || recording.value) throw new Error(t('exchange.stale'));
        previewObservationId = id;
        document.value = selected.document;
        legacy.value = selected.legacy;
        importMode.value = 'add';
        opened.value = true;
        await refreshPreview();
      } catch (error) { fail(error); } finally { busy.value = false; }
    };
    const save = async (format: 'csv' | 'xlsx') => {
      const id = observation.sharedState.currentObservation?.id;
      if (!id) return;
      const capturedGeneration = generation.capture();
      busy.value = true;
      try { await synchronize(); if (!generation.isCurrent(capturedGeneration)) throw new Error(t('exchange.stale')); await tabularExchangeService.save(id, props.kind, format); } catch (error) { fail(error); } finally { busy.value = false; }
    };
    const execute = async () => {
      const current = observation.sharedState.currentObservation;
      if (!current?.id || current.id !== previewObservationId || !document.value || !preview.value || recording.value) return;
      busy.value = true;
      const sequence = previewSequence;
      const capturedGeneration = generation.capture();
      try {
        await synchronize();
        if (recording.value || !generation.isCurrent(capturedGeneration) || previewSequence !== sequence || observation.sharedState.currentObservation?.id !== current.id) throw new Error(t('exchange.stale'));
        const result = await tabularExchangeService.apply(current.id, props.kind, importMode.value, document.value, preview.value.revision);
        const stillCurrent = () => generation.isCurrent(capturedGeneration) && previewSequence === sequence && observation.sharedState.currentObservation?.id === current.id;
        if (stillCurrent()) opened.value = false;
        $q.notify({ type: 'positive', message: result.backup ? t('exchange.successBackup', { name: result.backup.name }) : t('exchange.successFor', { name: current.name }) });
        try {
          await observation.readings.methods.loadReadings(current, stillCurrent);
          await observation.protocol.methods.loadProtocol(current, stillCurrent);
          if (stillCurrent()) emit('applied');
        } catch (error) {
          $q.notify({ type: 'warning', timeout: 0, message: t('exchange.refreshFailed'), actions: [{ label: t('exchange.close'), color: 'white' }] });
        }
      } catch (error) { fail(error); } finally { busy.value = false; }
    };
    const apply = () => {
      if (importMode.value !== 'replace') { void execute(); return; }
      Dialog.create({ title: t('exchange.confirmTitle'), message: t('exchange.confirmReplace', preview.value?.counts || {}), cancel: true, persistent: true }).onOk(() => { void execute(); });
    };
    return { observation, opened, legacy, busy, preview, importMode, recording, empty, modeOptions, openImport, refreshPreview, save, apply };
  },
});
</script>
<style scoped>
.exchange-actions { gap: 0.15rem; }
@container (max-width: 340px) { .exchange-actions :deep(.q-btn__content > .block) { display: none; } }
</style>
