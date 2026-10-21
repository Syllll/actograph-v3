<template>
  <Teleport to="body">
    <section
      v-if="visible && snapshot && !detached"
      class="mini-graph-panel"
      :style="panelStyle"
      role="region"
      :aria-label="$t('miniGraph.title')"
      data-testid="mini-graph-panel"
    >
      <header class="mini-graph-header">
        <div class="mini-graph-drag" role="button" tabindex="0"
          :aria-label="$t('miniGraph.move')" @pointerdown="startGesture($event, 'move')" @keydown="onMoveKey">
          <q-icon name="drag_indicator" size="18px" />
          <span class="mini-graph-heading">{{ $t('miniGraph.title') }}</span>
          <span class="mini-graph-name">{{ snapshot.observation.name }}</span>
        </div>
        <q-btn flat round dense size="sm" icon="fit_screen" :aria-label="$t('miniGraph.fit')" @click="viewer?.fit()">
          <q-tooltip>{{ $t('miniGraph.fit') }}</q-tooltip>
        </q-btn>
        <q-btn flat round dense size="sm" icon="open_in_new" :disable="opening" :aria-label="$t('miniGraph.detach')" @click="detach">
          <q-tooltip>{{ $t('miniGraph.detach') }}</q-tooltip>
        </q-btn>
        <q-btn flat round dense size="sm" icon="close" :aria-label="$t('miniGraph.close')" @click="miniGraph.requested.value = false">
          <q-tooltip>{{ $t('miniGraph.close') }}</q-tooltip>
        </q-btn>
      </header>
      <div class="mini-graph-content">
        <MiniGraphViewer ref="viewer" :observation="snapshot.observation" :selected-time="snapshot.selectedTime" />
      </div>
      <footer class="mini-graph-footer">
        <span>{{ $t('miniGraph.completeChronicle') }}</span>
        <span v-if="snapshot.selectedTime !== null" class="mini-graph-selection"><i />{{ $t('miniGraph.selectedReading') }}</span>
      </footer>
      <div class="mini-graph-resize" role="button" tabindex="0" :aria-label="$t('miniGraph.resize')"
        @pointerdown="startGesture($event, 'resize')" @keydown="onResizeKey"><q-icon name="south_east" size="16px" /></div>
    </section>
  </Teleport>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { IObservation } from '@actograph/core';
import { useObservation } from 'src/composables/use-observation';
import { useMiniGraph } from 'src/composables/use-mini-graph';
import { buildMiniGraphObservation, type MiniGraphSnapshot } from 'src/utils/mini-graph-data';
import { clampMiniGraphRect, readMiniGraphRect, saveMiniGraphRect, type MiniGraphRect } from 'src/utils/mini-graph-geometry';
import { openMiniGraphWindow } from 'src/utils/mini-graph-window';
import MiniGraphViewer from './MiniGraphViewer.vue';

export default defineComponent({
  name: 'MiniGraphHost',
  components: { MiniGraphViewer },
  props: { active: { type: Boolean, required: true } },
  setup(props) {
    const observation = useObservation();
    const miniGraph = useMiniGraph();
    const $q = useQuasar();
    const { t } = useI18n();
    const screen = () => ({ width: window.innerWidth, height: window.innerHeight });
    const rect = reactive(readMiniGraphRect(screen()));
    const snapshot = shallowRef<MiniGraphSnapshot | null>(null);
    const viewer = ref<InstanceType<typeof MiniGraphViewer> | null>(null);
    const detached = ref(false);
    const opening = ref(false);
    let remote: ReturnType<typeof openMiniGraphWindow> = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;
    let lastTime: number | null = null;
    let dataVersion = 0;
    let cancelGesture: () => void = () => undefined;
    const visible = computed(() => props.active && miniGraph.requested.value
      && !observation.sharedState.loading && !!observation.sharedState.currentObservation
      && !!observation.protocol.sharedState.currentProtocol);
    const panelStyle = computed(() => ({ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` }));

    const selectedTime = () => {
      const reading = observation.readings.sharedState.selectedReading;
      const time = reading ? +new Date(reading.dateTime) : NaN;
      return Number.isFinite(time) ? time : null;
    };
    const currentTime = () => {
      const state = observation.sharedState;
      const time = state.startTime !== null && state.currentDate ? +new Date(state.currentDate) : NaN;
      return Number.isFinite(time) ? time : null;
    };
    const refresh = () => {
      if (!visible.value || disposed) return;
      const source = observation.sharedState.currentObservation;
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!source || !protocol) return;
      lastTime = currentTime();
      snapshot.value = {
        observation: buildMiniGraphObservation({
          id: source.id, name: source.name, type: source.type, mode: source.mode,
          meta: source.meta, protocol,
          readings: observation.readings.sharedState.currentReadings,
        } as unknown as IObservation, lastTime),
        selectedTime: selectedTime(),
        dataVersion: ++dataVersion,
      };
      remote?.publish();
    };
    const closeRemote = () => {
      remote?.close();
      remote = null;
      detached.value = opening.value = false;
    };
    const stop = () => {
      cancelGesture();
      if (timer !== null) clearInterval(timer);
      timer = null;
      closeRemote();
      snapshot.value = null;
    };
    // Loading also covers reloading the SAME id and a failed fetch.
    watch(() => [observation.sharedState.loading, observation.sharedState.currentObservation?.id] as const,
      ([loading, id], previous) => {
        if (loading || (previous && id !== previous[1])) {
          miniGraph.requested.value = false;
          stop();
        }
      }, { flush: 'sync' });
    watch(visible, (enabled) => {
      stop();
      if (!enabled) return;
      Object.assign(rect, clampMiniGraphRect(rect, screen()));
      refresh();
      timer = setInterval(() => { if (currentTime() !== lastTime) refresh(); }, 250);
    }, { immediate: true, flush: 'sync' });
    watch(() => [observation.sharedState.currentObservation, observation.readings.sharedState.currentReadings,
      observation.protocol.sharedState.currentProtocol], refresh, { deep: true });
    watch(() => observation.readings.sharedState.selectedReading, () => {
      if (!visible.value || !snapshot.value) return;
      snapshot.value = { ...snapshot.value, selectedTime: selectedTime() };
      remote?.publish();
    }, { deep: true });

    const detach = () => {
      if (remote || !snapshot.value || !visible.value) return;
      opening.value = true;
      remote = openMiniGraphWindow({
        snapshot: () => snapshot.value,
        onDetached: () => { if (!disposed && visible.value) { detached.value = true; opening.value = false; } },
        onAttached: () => { if (!disposed) { remote = null; detached.value = opening.value = false; } },
        onFailure: () => {
          opening.value = false;
          $q.notify({ type: 'warning', message: t('miniGraph.popupFailed') });
        },
      });
    };

    let gesture: { kind: 'move' | 'resize'; x: number; y: number; rect: MiniGraphRect; pointer: number } | null = null;
    const finishGesture = () => {
      gesture = null;
      window.removeEventListener('pointermove', moveGesture);
      window.removeEventListener('pointerup', finishGesture);
      window.removeEventListener('pointercancel', finishGesture);
      saveMiniGraphRect(rect);
    };
    cancelGesture = finishGesture;
    const moveGesture = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.pointer) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const next = gesture.kind === 'move'
        ? { ...gesture.rect, x: gesture.rect.x + dx, y: gesture.rect.y + dy }
        : { ...gesture.rect, width: gesture.rect.width + dx, height: gesture.rect.height + dy };
      Object.assign(rect, clampMiniGraphRect(next, screen()));
    };
    const startGesture = (event: PointerEvent, kind: 'move' | 'resize') => {
      if (event.button !== 0) return;
      event.preventDefault();
      finishGesture();
      gesture = { kind, x: event.clientX, y: event.clientY, rect: { ...rect }, pointer: event.pointerId };
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', moveGesture);
      window.addEventListener('pointerup', finishGesture);
      window.addEventListener('pointercancel', finishGesture);
    };
    const keyboardRect = (event: KeyboardEvent, resize: boolean) => {
      const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = steps[event.key];
      if (!direction) return;
      event.preventDefault();
      const dx = direction[0] * (event.shiftKey ? 40 : 10);
      const dy = direction[1] * (event.shiftKey ? 40 : 10);
      Object.assign(rect, clampMiniGraphRect(resize
        ? { ...rect, width: rect.width + dx, height: rect.height + dy }
        : { ...rect, x: rect.x + dx, y: rect.y + dy }, screen()));
      saveMiniGraphRect(rect);
    };
    const onWindowResize = () => { Object.assign(rect, clampMiniGraphRect(rect, screen())); };
    window.addEventListener('resize', onWindowResize);
    const onUnload = () => closeRemote();
    window.addEventListener('beforeunload', onUnload);
    onBeforeUnmount(() => {
      disposed = true;
      stop();
      finishGesture();
      miniGraph.requested.value = false;
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('beforeunload', onUnload);
    });
    return { miniGraph, visible, snapshot, viewer, detached, opening, panelStyle, detach, startGesture,
      onMoveKey: (event: KeyboardEvent) => keyboardRect(event, false),
      onResizeKey: (event: KeyboardEvent) => keyboardRect(event, true) };
  },
});
</script>

<style scoped>
.mini-graph-panel { position: fixed; z-index: 2500; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #cbd5df; border-radius: 10px; background: white; box-shadow: 0 12px 40px #23304730, 0 2px 8px #23304718; color: #243447; }
.mini-graph-header { display: flex; align-items: center; gap: 3px; padding: 5px 8px 5px 4px; background: #f5f8fa; border-bottom: 1px solid #e2e8ee; flex: 0 0 40px; }
.mini-graph-drag { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; align-self: stretch; cursor: move; touch-action: none; user-select: none; }
.mini-graph-heading { font-size: 13px; font-weight: 600; white-space: nowrap; }
.mini-graph-name { margin-left: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: #697888; }
.mini-graph-content { flex: 1; min-height: 0; }
.mini-graph-footer { display: flex; align-items: center; gap: 16px; flex: 0 0 27px; padding: 0 26px 0 12px; border-top: 1px solid #edf0f4; color: #697888; font-size: 11px; }
.mini-graph-selection { display: flex; align-items: center; gap: 5px; }
.mini-graph-selection i { display: inline-block; height: 12px; border-left: 2px solid #d33b68; }
.mini-graph-resize { position: absolute; bottom: 0; right: 0; display: grid; place-items: center; width: 25px; height: 25px; color: #8190a0; cursor: nwse-resize; touch-action: none; }
.mini-graph-drag:focus-visible, .mini-graph-resize:focus-visible { outline: 2px solid var(--q-primary); outline-offset: -2px; }
@media (max-width: 600px) { .mini-graph-name { display: none; } }
</style>
