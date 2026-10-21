<template>
  <main class="mini-graph-popup">
    <header class="popup-header">
      <strong>{{ $t('miniGraph.title') }}</strong>
      <span class="popup-name">{{ snapshot?.observation.name }}</span>
      <q-space />
      <q-btn flat dense no-caps icon="fit_screen" :label="$t('miniGraph.fit')" @click="viewer?.fit()" />
      <q-btn flat dense no-caps icon="close_fullscreen" :label="$t('miniGraph.attach')" @click="attach" />
    </header>
    <div class="popup-content">
      <MiniGraphViewer v-if="snapshot" ref="viewer" :observation="snapshot.observation" :selected-time="snapshot.selectedTime" />
      <div v-else class="popup-status" role="status">
        <q-spinner v-if="!expired" color="primary" size="30px" />
        {{ $t(expired ? 'miniGraph.ownerGone' : 'miniGraph.loading') }}
      </div>
    </div>
    <footer>{{ $t('miniGraph.completeChronicle') }}<span v-if="snapshot?.selectedTime != null"> · {{ $t('miniGraph.selectedReading') }}</span></footer>
  </main>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { miniGraphChannelName, type MiniGraphMessage } from 'src/utils/mini-graph-window';
import type { MiniGraphSnapshot } from 'src/utils/mini-graph-data';
import MiniGraphViewer from './MiniGraphViewer.vue';

export default defineComponent({
  name: 'MiniGraphPopup',
  components: { MiniGraphViewer },
  setup() {
    const route = useRoute();
    const snapshot = shallowRef<MiniGraphSnapshot | null>(null);
    const viewer = ref<InstanceType<typeof MiniGraphViewer> | null>(null);
    const expired = ref(false);
    let channel: BroadcastChannel | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let revision = 0;
    let lastOwner = Date.now();
    let disposed = false;
    let observationId: number | undefined;
    const send = (message: MiniGraphMessage) => { if (!disposed) channel?.postMessage(message); };
    const cleanup = () => {
      if (disposed) return;
      send({ type: 'closed' });
      disposed = true;
      snapshot.value = null;
      if (timer !== null) clearInterval(timer);
      channel?.close();
      channel = null;
      window.removeEventListener('beforeunload', cleanup);
    };
    const close = () => { cleanup(); window.close(); };
    const attach = () => { send({ type: 'attach' }); close(); };
    onMounted(() => {
      const session = route.query.session;
      if (typeof session !== 'string' || !/^[a-f0-9-]{36}$/i.test(session) || typeof BroadcastChannel === 'undefined') {
        expired.value = true;
        return;
      }
      channel = new BroadcastChannel(miniGraphChannelName(session));
      channel.onmessage = (event: MessageEvent<MiniGraphMessage>) => {
        if (disposed || !event.data) return;
        const message = event.data;
        if (message.type === 'close') { close(); return; }
        if (message.type === 'owner') { lastOwner = Date.now(); return; }
        if (message.type !== 'snapshot' || !Number.isSafeInteger(message.revision) || message.revision <= revision
          || !message.snapshot?.observation?.protocol
          || (observationId !== undefined && message.snapshot.observation.id !== observationId)) return;
        revision = message.revision;
        observationId = message.snapshot.observation.id;
        lastOwner = Date.now();
        const previous = snapshot.value;
        snapshot.value = previous && previous.dataVersion !== undefined
          && previous.dataVersion === message.snapshot.dataVersion
          ? { ...message.snapshot, observation: previous.observation }
          : message.snapshot;
        document.title = `${message.snapshot.observation.name} - ActoGraph`;
      };
      send({ type: 'ready' });
      timer = setInterval(() => {
        if (Date.now() - lastOwner > (snapshot.value ? 8000 : 20000)) {
          expired.value = true;
          close();
          return;
        }
        send({ type: snapshot.value ? 'ping' : 'ready' });
      }, 1000);
      window.addEventListener('beforeunload', cleanup);
    });
    onBeforeUnmount(cleanup);
    return { snapshot, viewer, expired, attach };
  },
});
</script>

<style scoped>
.mini-graph-popup { width: 100vw; height: 100vh; overflow: hidden; display: flex; flex-direction: column; background: white; color: #243447; }
.popup-header { display: flex; align-items: center; gap: 12px; padding: 6px 12px; border-bottom: 1px solid #e2e8ee; background: #f5f8fa; }
.popup-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; color: #697888; }
.popup-content { flex: 1; min-height: 0; }
.popup-status { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
footer { padding: 5px 12px; font-size: 11px; color: #697888; border-top: 1px solid #edf0f4; }
</style>
