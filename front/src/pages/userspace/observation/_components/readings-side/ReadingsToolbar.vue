<template>
  <div class="readings-toolbar q-pb-md">
    <div class="row justify-between items-center">
      <div class="row items-center q-gutter-md">
        <div class="text-h6">Relevés</div>
        <!-- Mode indicator - Always visible -->
        <q-chip
          :color="currentMode === 'chronometer' ? 'primary' : 'grey-7'"
          text-color="white"
          :icon="currentMode === 'chronometer' ? 'timer' : 'event'"
          size="sm"
        >
          {{ currentMode === 'chronometer' ? 'Mode Chronomètre' : currentMode === 'calendar' ? 'Mode Calendrier' : 'Mode non défini' }}
        </q-chip>
      </div>
      
      <div class="column">
        <div class="row q-gutter-sm items-center">
          <!-- Search input -->
          <q-input
            :modelValue="search"
            outlined
            dense
            placeholder="Rechercher des relevés..."
            class="q-mr-sm"
            style="min-width: 200px"
            clearable
            @update:model-value="onSearchInput"
            @clear="onSearchClear"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <!-- Rechercher/Remplacer toggle button -->
          <q-btn
            :color="state.showReplace ? 'primary' : undefined"
            icon="find_replace"
            flat
            round
            dense
            @click="state.showReplace = !state.showReplace"
          >
            <q-tooltip>Rechercher et remplacer</q-tooltip>
          </q-btn>
        
        <!-- Action buttons -->
        <q-btn
          color="primary"
          icon="add"
          :disable="isAddDisabled"
          @click="$emit('add-reading')"
          flat
          round
          dense
        >
          <q-tooltip>Ajouter un relevé</q-tooltip>
        </q-btn>

        <q-btn
          color="primary"
          icon="mdi-comment-text-outline"
          @click="$emit('add-comment')"
          flat
          round
          dense
        >
          <q-tooltip>Ajouter un commentaire horodaté</q-tooltip>
        </q-btn>

        <q-btn
          color="negative"
          icon="delete"
          label="Supprimer"
          :disable="!hasSelected"
          @click="methods.removeReading()"
          flat
          rounded
          dense
        >
          <q-tooltip>Supprimer le relevé sélectionné</q-tooltip>
        </q-btn>
        <q-separator vertical />
        <q-btn
          color="negative"
          icon="mdi-delete-sweep"
          label="Tout effacer"
          @click="methods.removeAllReadings()"
          outline
          dense
        >
          <q-tooltip>Effacer toute la liste des relevés</q-tooltip>
        </q-btn>
        
        <!-- Auto-correct readings button -->
        <q-btn
          color="accent"
          icon="auto_fix_high"
          @click="$emit('auto-correct-readings')"
          flat
          round
          dense
        >
          <q-tooltip>Corriger automatiquement les relevés</q-tooltip>
        </q-btn>
        
        <!-- Activate chronometer mode button -->
        <q-btn
          v-if="canActivateChronometerMode"
          color="primary"
          icon="timer"
          label="Mode chronomètre"
          @click="$emit('activate-chronometer-mode')"
          flat
          dense
        >
          <q-tooltip>Passer en mode chronomètre (iéo)</q-tooltip>
        </q-btn>
        </div>

        <!-- Panel Rechercher/Remplacer -->
        <div v-if="state.showReplace" class="row items-center q-gutter-sm q-mt-xs">
          <q-input
            v-model="state.replaceValue"
            placeholder="Remplacer par..."
            dense
            outlined
            class="col"
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="find_replace" size="xs" />
            </template>
          </q-input>
          <span v-if="search" class="text-caption text-grey">
            {{ matchCount }} résultat(s) trouvé(s)
          </span>
          <q-btn
            flat
            dense
            label="Remplacer"
            color="primary"
            :disable="!hasSelected || !state.replaceValue"
            @click="$emit('replace-selected', state.replaceValue)"
          />
          <q-btn
            flat
            dense
            label="Tout remplacer"
            color="primary"
            :disable="!search || !state.replaceValue"
            @click="$emit('replace-all', { search: search, replace: state.replaceValue })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  name: 'ReadingsToolbar',
  
  props: {
    search: {
      type: String,
      default: '',
    },
    matchCount: {
      type: Number,
      default: 0,
    },
    hasSelected: {
      type: Boolean,
      default: false,
    },
    isAddDisabled: {
      type: Boolean,
      default: false,
    },
    canActivateChronometerMode: {
      type: Boolean,
      default: false,
    },
    currentMode: {
      type: String,
      default: null,
      validator: (value: string | null) => {
        return value === null || value === 'calendar' || value === 'chronometer';
      },
    },
  },
  
  emits: [
    'update:search',
    'add-reading',
    'add-comment',
    'remove-reading',
    'remove-all-readings',
    'activate-chronometer-mode',
    'auto-correct-readings',
    'replace-selected',
    'replace-all',
  ],

  setup(props, { emit }) {
    const state = reactive({
      showReplace: false,
      replaceValue: '',
    });
    // Handle search input changes
    const onSearchInput = (value: string | number | null) => {
      emit('update:search', String(value ?? ''));
    };
    
    // Handle clear button click
    const onSearchClear = () => {
      emit('update:search', '');
    };

    const methods = {
      removeReading: async () => {
        const confirmed = await createDialog({
          title: 'Supprimer ce relevé ?',
          message: 'Voulez-vous supprimer le relevé sélectionné ?',
          cancel: 'Annuler',
          ok: {
            label: 'Supprimer',
            color: 'negative',
          }
        });

        if (!confirmed) return;

        emit('remove-reading');
      },
      removeAllReadings: async () => {
        const confirmed = await createDialog({
          title: 'Effacer toute la liste',
          message: 'Voulez-vous effacer toute la liste des relevés ? Cette action est irréversible.',
          cancel: 'Annuler',
          ok: {
            label: 'Tout effacer',
            color: 'negative',
          }
        });

        if (!confirmed) return;

        emit('remove-all-readings');
      }
    }
    
    return {
      state,
      onSearchInput,
      onSearchClear,
      methods
    };
  },
});
</script>

<style scoped>
</style> 