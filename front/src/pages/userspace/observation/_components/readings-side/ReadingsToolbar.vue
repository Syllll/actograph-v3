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
      
      <div class="row q-gutter-sm">
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
          color="negative"
          icon="delete"
          :disable="!hasSelected"
          @click="$emit('remove-reading')"
          flat
          round
          dense
        >
          <q-tooltip>Supprimer le relevé sélectionné</q-tooltip>
        </q-btn>
        <q-btn
          color="negative"
          icon="mdi-delete-forever"
          @click="methods.removeAllReadings()"
          flat
          round
          dense
        >
          <q-tooltip>Supprimer tous les relevés</q-tooltip>
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
    </div>
  </div>
</template>

<script lang="ts">
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ReadingsToolbar',
  
  props: {
    search: {
      type: String,
      default: '',
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
    'remove-reading',
    'remove-all-readings',
    'activate-chronometer-mode',
    'auto-correct-readings'
  ],

  setup(props, { emit }) {
    // Handle search input changes
    const onSearchInput = (value: string | number | null) => {
      emit('update:search', String(value ?? ''));
    };
    
    // Handle clear button click
    const onSearchClear = () => {
      emit('update:search', '');
    };

    const methods = {
      removeAllReadings: async () => {
        const dialog = await createDialog({
          title: 'Suppression de tous les relevés',
          message: 'Voulez-vous vraiment supprimer tous les relevés ?',
          cancel: 'Annuler',
          ok: {
            label: 'Supprimer',
            color: 'negative',
          }
        });

        if (!dialog) return;

        emit('remove-all-readings');
      }
    }
    
    return {
      onSearchInput,
      onSearchClear,
      methods
    };
  },
});
</script>

<style scoped>
</style> 