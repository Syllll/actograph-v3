<template>
  <DBtn
    flat
    dense
    title="WIP - Raccourcis clavier"
    class="q-mx-sm q-px-sm"
    icon="mdi-tune-vertical"
    @click="state.showDialog = true"
  />

  <q-dialog v-model="state.showDialog" :backdrop-filter="'blur(4px)'">
    <q-card style="min-width: fit-content;">
      <q-card-section>
        <q-table
          flat
          bordered
          title="Accès rapide"
          no-data-label="Aucun raccourci disponible sur cette page"
          :rows="computedState.filteredShortcuts.value"
          :columns="stateless.columns"
          :pagination="{rowsPerPage: 0}"
        >
          <template v-slot:body-cell-description="props">
            <q-td
              @mouseover="state.currentMouseOver = props.row.tid"
              @mouseout="state.currentMouseOver = null"
            >
              <q-btn
                flat
                size="sm"
                class="overflow-hidden smooth"
                :class="{
                  'q-pa-sm': state.currentMouseOver === props.row.tid,
                  'q-pa-none': state.currentMouseOver !== props.row.tid,
                }"
                :style="{
                  width: state.currentMouseOver !== props.row.tid ? 0 : ''
                }"
                icon="mdi-play-outline"
                :disable="props.row.type === 'passive' || props.row.condition && !props.row.condition()"
                :title="props.row.type === 'passive' ? 'Passive shortcuts cannot be manualy triggered' : null"
                @click="methods.triggerShortcut(props.row)"
              />
              {{ props.row.description }}
            </q-td>
          </template>

          <template v-slot:body-cell-combinaisons="props">
            <q-td :props="props">
              <template v-for="(combinaison, i) in props.row.combinaisons" :key="'combinaison_' + i">
                <q-chip v-if="combinaison.altMode" square class="text-italic q-mr-none">
                  {{ shortcuts.state.altModeCombinaison.specialKeys?.map((key: string) => methods.getPlaceholder(key))?.join(' / ') }}
                </q-chip>
                <span v-if="combinaison.altMode" >
                  {{' + '}}
                </span>
                <q-chip v-if="combinaison.altMode" square class="text-normal q-ml-none q-mr-sm">
                  {{ methods.getPlaceholder(shortcuts.state.altModeCombinaison.key) }}
                </q-chip>

                <q-chip v-if="combinaison.specialKeys?.length >= 1" square class="text-italic q-mr-none">
                  {{ combinaison.specialKeys?.map((key: string) => methods.getPlaceholder(key))?.join(' / ') }}
                </q-chip>
                <span v-if="combinaison.specialKeys?.length >= 1 && combinaison.key">
                  {{' + '}}
                </span>
                <q-chip v-if="combinaison.key" square class="text-normal q-ml-none">
                  {{ methods.getPlaceholder(combinaison.key) }}
                </q-chip>
                <br>
              </template>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch, computed } from 'vue';

import { useKeyboardShortcuts } from '@lib-improba/components/page-builder/lib/ui/use-keyboard-shortcuts';
import { useProps } from '@lib-improba/components/page-builder/lib/ui/use-props';

const { methods: propsMethods } = useProps()

export default defineComponent({
  props: {
    type: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const shortcuts = useKeyboardShortcuts('', { listen: false })

    const stateless = {
      columns: [
        {
          name: 'description',
          label: 'Description',
          field: 'description',
          align: 'left'
        },
        {
          name: 'combinaisons',
          label: 'Combinaisons',
          field: 'combinaisons',
        },
      ] as any // Something isn't happy with the align property even tho it's working, idrc tho
    };

    const state = reactive({
      showDialog: false,
      currentMouseOver: null,
    });

    const methods = {
      getPlaceholder (key: string) {
        return shortcuts.stateless.keyPlaceholders[key] || key
      },
      triggerShortcut (shortcut: any) {
        if (!shortcut.combinaisons[0]) { return }

        const { key, specialKeys, type, altMode } = shortcut.combinaisons[0]

        const manualEvent = (specialKeys || []).reduce((acc: any, cur: any) => {
          acc[cur] = true
          return acc
        }, {
          key,
          type: 'manual'
        })

        // ? If needed, trigger altMode manually
        if (altMode) {
          shortcuts.sharedState.altMode = true
          // const { key, specialKeys } = shortcuts.state.altModeCombinaison
          // const altEvent = (specialKeys || []).reduce((acc: any, cur: any) => {
          //   acc[cur] = true
          //   return acc
          // }, { key: key })

          // shortcuts.methods.handleKeyEvent(altEvent as KeyboardEvent)
        }
        shortcuts.methods.handleKeyEvent(manualEvent as KeyboardEvent)
        shortcuts.sharedState.altMode = false
      }
    };

    const computedState = {
      filteredShortcuts: computed(() => {
        return [
          ...shortcuts.stateless.shortcuts,
          ...shortcuts.sharedState.customShortcuts
        ]
        ?.filter((shortcut: any) => shortcuts.methods.allowOrigin(shortcut))
        ?.map((s, i) => ({...s, tid: i }))
      })
    };


    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {
    });

    return {
      shortcuts,
      props,
      stateless,
      state,
      methods,
      computedState
    };
  },
});
</script>
