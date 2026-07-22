<template>
  <div class="chronicle-local-meta-cell row items-center q-gutter-xs no-wrap" @click.stop>
    <q-btn
      flat
      round
      dense
      size="sm"
      :icon="meta.archived ? 'mdi-archive-arrow-up' : 'mdi-archive'"
      :color="meta.archived ? 'grey-7' : 'grey-6'"
      @click="methods.toggleArchived"
    >
      <q-tooltip>
        {{
          meta.archived
            ? $t('observationsList.localMetaUnarchive')
            : $t('observationsList.localMetaArchive')
        }}
      </q-tooltip>
    </q-btn>

    <q-btn
      flat
      round
      dense
      size="sm"
      :icon="meta.isProtocol ? 'mdi-star' : 'mdi-star-outline'"
      :color="meta.isProtocol ? 'amber-8' : 'grey-5'"
      class="protocol-star-btn"
      :class="{ 'protocol-star-btn--active': meta.isProtocol }"
      @click="methods.toggleProtocol"
    >
      <q-tooltip>{{ $t('observationsList.localMetaProtocol') }}</q-tooltip>
    </q-btn>

    <q-btn
      flat
      round
      dense
      size="sm"
      icon="mdi-note-text-outline"
      :color="meta.note ? 'primary' : 'grey-6'"
    >
      <q-tooltip>{{ $t('observationsList.localMetaNote') }}</q-tooltip>
      <q-popup-edit
        :model-value="meta.note ?? ''"
        :title="$t('observationsList.localMetaNote')"
        buttons
        v-slot="scope"
        @save="methods.saveNote"
      >
        <q-input
          v-model="scope.value"
          type="textarea"
          autogrow
          dense
          autofocus
          :label="$t('observationsList.localMetaNote')"
        />
      </q-popup-edit>
    </q-btn>

    <div class="used-for-chips row items-center q-gutter-xs no-wrap">
      <q-chip
        v-for="option in usedForOptions"
        :key="option.value"
        dense
        size="sm"
        clickable
        :outline="!methods.isUsedForSelected(option.value)"
        :color="methods.isUsedForSelected(option.value) ? 'primary' : 'grey-4'"
        :text-color="methods.isUsedForSelected(option.value) ? 'white' : 'grey-8'"
        :label="option.label"
        @click="methods.toggleUsedFor(option.value)"
      />
    </div>

    <q-input
      v-if="methods.isUsedForSelected('other')"
      :model-value="meta.usedForOther ?? ''"
      dense
      outlined
      class="used-for-other-input"
      :placeholder="$t('observationsList.localMetaUsedForOtherPlaceholder')"
      @update:model-value="methods.onUsedForOtherInput"
      @blur="methods.saveUsedForOther"
      @keyup.enter="methods.saveUsedForOther"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { observationService } from '@services/observations/index.service';
import {
  getEffectiveLocalMeta,
  IObservation,
  IObservationLocalMetaResponse,
  ObservationLocalMetaUsedFor,
  OBSERVATION_LOCAL_META_USED_FOR_VALUES,
} from '@services/observations/interface';

export default defineComponent({
  name: 'ChronicleLocalMetaCell',
  props: {
    observation: {
      type: Object as PropType<IObservation>,
      required: true,
    },
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const $q = useQuasar();
    const { t, locale } = useI18n();

    const meta = computed(() => getEffectiveLocalMeta(props.observation));
    const pendingOtherSelection = ref(false);
    let saveChain: Promise<void> = Promise.resolve();

    type LocalMetaSnapshot = {
      archived: boolean;
      isProtocol: boolean;
      usedFor: ObservationLocalMetaUsedFor[];
      usedForOther: string | null;
      note: string | null;
    };

    const snapshotMeta = (): LocalMetaSnapshot => ({
      archived: meta.value.archived,
      isProtocol: meta.value.isProtocol,
      usedFor: [...meta.value.usedFor],
      usedForOther: meta.value.usedForOther,
      note: meta.value.note,
    });

    const usedForOptions = computed(() => {
      void locale.value;
      return OBSERVATION_LOCAL_META_USED_FOR_VALUES.map((value) => ({
        value,
        label: t(`observationsList.localMetaUsedFor.${value}`),
      }));
    });

    const methods = {
      applyLocalUpdate(partial: {
        archived?: boolean;
        isProtocol?: boolean;
        usedFor?: ObservationLocalMetaUsedFor[];
        usedForOther?: string | null;
        note?: string | null;
      }) {
        emit('updated', {
          observationId: props.observation.id,
          localMeta: {
            id: props.observation.localMeta?.id,
            ...meta.value,
            ...partial,
          },
        });
      },

      isUsedForSelected(value: ObservationLocalMetaUsedFor): boolean {
        return meta.value.usedFor.includes(value);
      },

      applyResponse(response: IObservationLocalMetaResponse) {
        pendingOtherSelection.value = false;
        emit('updated', {
          observationId: props.observation.id,
          localMeta: {
            id: props.observation.localMeta?.id,
            archived: response.archived,
            isProtocol: response.isProtocol,
            usedFor: response.usedFor,
            usedForOther: response.usedForOther,
            note: response.note,
          },
        });
      },

      async save(
        partial: {
          archived?: boolean;
          isProtocol?: boolean;
          usedFor?: ObservationLocalMetaUsedFor[];
          usedForOther?: string | null;
          note?: string | null;
        },
        revertSnapshot?: LocalMetaSnapshot
      ) {
        saveChain = saveChain
          .then(() => methods.doSave(partial, revertSnapshot))
          .catch(() => undefined);
        return saveChain;
      },

      async doSave(
        partial: {
          archived?: boolean;
          isProtocol?: boolean;
          usedFor?: ObservationLocalMetaUsedFor[];
          usedForOther?: string | null;
          note?: string | null;
        },
        revertSnapshot?: LocalMetaSnapshot
      ) {
        const snapshot = revertSnapshot ?? snapshotMeta();
        const current = meta.value;
        let usedFor = partial.usedFor ?? current.usedFor;
        let usedForOther =
          partial.usedForOther !== undefined
            ? partial.usedForOther
            : current.usedForOther;

        const otherSelectedWithoutText =
          usedFor.includes('other') &&
          (!usedForOther || usedForOther.trim() === '');

        if (otherSelectedWithoutText) {
          usedFor = usedFor.filter((value) => value !== 'other');
          pendingOtherSelection.value = false;
        }

        if (!usedFor.includes('other')) {
          usedForOther = null;
        } else if (usedForOther) {
          usedForOther = usedForOther.trim();
        }

        const body = {
          archived: partial.archived ?? current.archived,
          isProtocol: partial.isProtocol ?? current.isProtocol,
          usedFor,
          usedForOther,
          note: partial.note !== undefined ? partial.note : current.note,
        };

        try {
          const response = await observationService.upsertLocalMeta(
            props.observation.id,
            body
          );
          methods.applyResponse(response);
        } catch (error) {
          console.error('Error saving local meta:', error);
          methods.applyLocalUpdate(snapshot);
          $q.notify({
            type: 'negative',
            message: t('observationsList.localMetaSaveError'),
          });
        }
      },

      toggleArchived() {
        const archived = !meta.value.archived;
        void methods.save({ archived });
      },

      toggleProtocol() {
        const snapshot = snapshotMeta();
        const isProtocol = !meta.value.isProtocol;
        methods.applyLocalUpdate({ isProtocol });
        void methods.save({ isProtocol }, snapshot);
      },

      saveNote(value: string) {
        const snapshot = snapshotMeta();
        const note = value.trim() === '' ? null : value;
        methods.applyLocalUpdate({ note });
        void methods.save({ note }, snapshot);
      },

      toggleUsedFor(value: ObservationLocalMetaUsedFor) {
        const current = [...meta.value.usedFor];
        const index = current.indexOf(value);
        const isSelected = index >= 0;

        if (value === 'other') {
          if (isSelected) {
            const snapshot = snapshotMeta();
            current.splice(index, 1);
            methods.applyLocalUpdate({
              usedFor: current,
              usedForOther: null,
            });
            if (pendingOtherSelection.value) {
              pendingOtherSelection.value = false;
            } else {
              void methods.save({ usedFor: current, usedForOther: null }, snapshot);
            }
          } else {
            pendingOtherSelection.value = true;
            methods.applyLocalUpdate({ usedFor: [...current, 'other'] });
          }
          return;
        }

        const snapshot = snapshotMeta();
        if (isSelected) {
          current.splice(index, 1);
        } else {
          current.push(value);
        }

        const partial: {
          usedFor: ObservationLocalMetaUsedFor[];
          usedForOther?: string | null;
        } = { usedFor: current };

        if (!current.includes('other')) {
          partial.usedForOther = null;
        }

        methods.applyLocalUpdate(partial);
        void methods.save(partial, snapshot);
      },

      onUsedForOtherInput(value: string | number | null) {
        methods.applyLocalUpdate({
          usedForOther: value == null ? null : String(value),
        });
      },

      saveUsedForOther() {
        if (!meta.value.usedFor.includes('other')) {
          return;
        }
        const text = meta.value.usedForOther?.trim() ?? '';
        if (text === '') {
          return;
        }
        const snapshot = snapshotMeta();
        void methods.save(
          {
            usedFor: meta.value.usedFor,
            usedForOther: text,
          },
          snapshot
        );
      },
    };

    return {
      meta,
      usedForOptions,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.chronicle-local-meta-cell {
  max-width: 100%;
  overflow-x: auto;
}

.protocol-star-btn--active {
  :deep(.q-icon) {
    filter: drop-shadow(0 0 2px rgba(255, 193, 7, 0.6));
  }
}

.used-for-chips {
  flex-wrap: wrap;
}

.used-for-other-input {
  min-width: 140px;
  max-width: 200px;
}
</style>
