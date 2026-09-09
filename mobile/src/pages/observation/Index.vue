<template>
  <DPage clip-content>
    <!-- Header compact -->
    <div class="timer-toolbar q-py-sm q-px-md">
      <div class="row items-center no-wrap q-gutter-x-sm">
        <!-- Left: Edit or Cancel -->
        <q-btn
          v-if="editMode.sharedState.isEditing"
          flat round icon="mdi-close" color="negative" size="md"
          aria-label="Annuler l'édition"
          :disable="editMode.sharedState.isSaving"
          @click="methods.cancelEditMode"
        />
        <q-btn
          v-else-if="canEnterEditMode"
          flat round icon="mdi-pencil" color="white" size="md"
          aria-label="Éditer le protocole"
          @click="methods.enterEditMode"
        />
        <div v-else class="toolbar-spacer" />

        <!-- Center: Timer (+ REC dot while recording) -->
        <div
          ref="timerDisplayRef"
          class="timer-display text-weight-bold col text-center"
          :class="chronicle.sharedState.isPaused ? 'text-warning blink' : 'text-accent'"
          :aria-label="state.isRecording && !chronicle.sharedState.isPaused ? 'Enregistrement en cours' : undefined"
        >
          <span
            v-if="state.isRecording && !chronicle.sharedState.isPaused"
            class="rec-dot"
            aria-hidden="true"
          />
          <span
            ref="timerTextRef"
            class="timer-text"
            :style="timerTextStyle"
          >{{ chronicle.formattedTime.value }}</span>
        </div>

        <!-- Right: Edit mode actions OR Record controls -->
        <template v-if="editMode.sharedState.isEditing">
          <q-btn flat round icon="mdi-refresh" color="white" size="md" aria-label="Réinitialiser les positions" @click="methods.resetCategoryPositions" />
          <q-btn flat round icon="mdi-check" color="positive" size="md" aria-label="Valider" :loading="editMode.sharedState.isSaving" @click="methods.exitEditMode" />
        </template>
        <template v-else>
          <q-btn
            v-if="!state.isRecording"
            round color="positive-strong" icon="mdi-play" size="md"
            aria-label="Démarrer l'enregistrement"
            :disable="state.recordingBusy || state.categories.length === 0"
            @click="methods.startRecording"
          />
          <template v-else>
            <q-btn
              round size="md"
              :color="chronicle.sharedState.isPaused ? 'positive-strong' : 'warning'"
              :text-color="chronicle.sharedState.isPaused ? 'white' : 'primary'"
              :icon="chronicle.sharedState.isPaused ? 'mdi-play' : 'mdi-pause'"
              :disable="state.recordingBusy"
              :aria-label="chronicle.sharedState.isPaused ? 'Reprendre' : 'Mettre en pause'"
              @click="methods.togglePause"
            />
            <q-btn round color="negative-strong" icon="mdi-stop" size="md" aria-label="Arrêter l'enregistrement" :disable="state.recordingBusy" @click="methods.stopRecording" />
          </template>
        </template>
      </div>
    </div>

    <!-- Zone scrollable des catégories -->
    <div class="categories-container">
      <!-- Empty state -->
      <div v-if="state.categories.length === 0" class="empty-state text-center q-pa-xl">
        <q-icon name="mdi-alert-circle-outline" size="48px" color="grey-5" />
        <div class="text-body1 text-muted q-mt-md">
          Aucune catégorie définie
        </div>
        <div class="text-body2 text-muted q-mb-md">
          Ajoutez des catégories et observables pour commencer
        </div>
        <q-btn
          color="primary"
          label="Ajouter une catégorie"
          icon="mdi-plus"
          @click="state.showAddCategoryDialog = true"
        />
      </div>

      <!-- Conteneur avec positions absolues (mode normal ET édition) -->
      <q-scroll-area
        v-else
        class="categories-scroll"
      >
        <div
          ref="editContainerRef"
          class="positioned-container"
          :style="{
            minHeight: editMode.methods.getMinContainerHeight() + 'px',
            '--ui-scale': uiScale.state.scale,
          }"
        >
          <!-- Catégories : même composant pour les deux modes -->
          <DraggableCategory
            v-for="category in state.categories"
            :key="category.id"
            :category="category"
            :position="editMode.sharedState.categoryPositions[category.id] || { x: 0, y: 0 }"
            :width="editMode.getCategoryWidth(category.id)"
            :resizable="editMode.sharedState.isEditing"
            :container-bounds="containerBounds"
            :active-observable-by-category="state.activeObservableByCategory"
            :draggable="editMode.sharedState.isEditing"
            :continuous-observables-disabled="editMode.sharedState.isEditing || chronicle.sharedState.isPaused"
            :discrete-observables-disabled="editMode.sharedState.isEditing || !state.isRecording || chronicle.sharedState.isPaused"
            :on-toggle-observable="editMode.sharedState.isEditing ? undefined : methods.toggleObservable"
            :on-press-observable="editMode.sharedState.isEditing ? undefined : methods.pressObservable"
            :style="editMode.sharedState.isEditing
              ? editMode.methods.getCategoryStyle(category.id)
              : methods.getCategoryPositionStyle(category.id)"
            @drag-start="editMode.methods.startDrag"
            @drag-move="methods.handleDragMove"
            @drag-end="editMode.methods.endDrag"
            @resize-start="editMode.methods.startResize"
            @resize-move="methods.handleResizeMove"
            @resize-end="methods.handleResizeEnd"
          />

        </div>
      </q-scroll-area>
    </div>

    <!-- Bandeau "Éditer protocole" en mode édition -->
    <div v-if="editMode.sharedState.isEditing" class="edit-protocol-banner" role="button" tabindex="0" @keydown.enter="state.showProtocolSheet = true" @click="state.showProtocolSheet = true">
      <q-icon name="mdi-clipboard-edit-outline" size="18px" class="q-mr-xs" />
      Éditer protocole
    </div>

    <!-- FAB pour ajouter un commentaire -->
    <q-page-sticky v-if="!editMode.sharedState.isEditing" position="bottom-left" :offset="[18, 18]">
      <q-btn
        round
        color="info"
        icon="mdi-comment-plus"
        size="lg"
        aria-label="Ajouter un commentaire"
        @click="state.showAddCommentDialog = true"
      />
    </q-page-sticky>

    <!-- Dialog ajout commentaire -->
    <q-dialog v-model="state.showAddCommentDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-info text-white">
          <div class="text-h6">Nouveau commentaire</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.newComment.text"
            label="Commentaire"
            placeholder="# Mon commentaire..."
            outlined
            autofocus
            :rules="[(val) => (val && val.trim().length > 0) || 'Le commentaire ne peut pas être vide']"
            @keyup.enter="methods.addComment"
          />
          <q-input
            v-model="state.newComment.description"
            label="Description (optionnel)"
            outlined
            type="textarea"
            rows="2"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="info"
            label="Ajouter"
            @click="methods.addComment"
            :loading="state.savingComment"
            :disable="!state.newComment.text || !state.newComment.text.trim() || state.savingComment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ajout catégorie -->
    <q-dialog v-model="state.showAddCategoryDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Nouvelle catégorie</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.newCategory.name"
            label="Nom de la catégorie"
            outlined
            autofocus
            @keyup.enter="methods.addCategory"
          />
          <q-select
            v-model="state.newCategory.action"
            :options="[
              { label: 'Discret (événement)', value: 'discrete' },
              { label: 'Continu (état)', value: 'continuous' }
            ]"
            label="Type de catégorie"
            outlined
            emit-value
            map-options
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Ajouter"
            @click="methods.addCategory"
            :disable="!state.newCategory.name"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ajout observable -->
    <q-dialog v-model="state.showAddObservableDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Nouvel observable</div>
          <div class="text-caption">
            Dans : {{ state.selectedCategory?.name }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.newObservable.name"
            label="Nom de l'observable"
            outlined
            autofocus
            @keyup.enter="methods.addObservable"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Ajouter"
            @click="methods.addObservable"
            :disable="!state.newObservable.name"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog renommer catégorie -->
    <q-dialog v-model="state.showRenameCategoryDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Renommer la catégorie</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.renameCategory.name"
            label="Nouveau nom"
            outlined
            autofocus
            @keyup.enter="methods.renameCategory"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Renommer"
            @click="methods.renameCategory"
            :disable="!state.renameCategory.name"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog renommer observable -->
    <q-dialog v-model="state.showRenameObservableDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Renommer l'observable</div>
          <div class="text-caption">
            Dans : {{ state.selectedCategory?.name }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.renameObservable.name"
            label="Nouveau nom"
            outlined
            autofocus
            @keyup.enter="methods.renameObservable"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Renommer"
            @click="methods.renameObservable"
            :disable="!state.renameObservable.name"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Readings counter badge -->
    <q-page-sticky v-if="state.totalReadingsCount > 0 && !editMode.sharedState.isEditing" position="bottom-right" :offset="[18, 18]">
      <q-btn
        round
        color="primary"
        size="md"
        :class="{ 'readings-counter-pulse': state.readingsCountAnimating }"
        @click="$router.push({ name: 'readings' })"
      >
        <q-icon name="mdi-table" size="20px" />
        <q-badge floating color="accent-strong" :label="state.totalReadingsCount" />
      </q-btn>
    </q-page-sticky>

    <!-- Bottom sheet pour gérer le protocole -->
    <q-dialog v-model="state.showProtocolSheet" position="bottom" full-width>
      <q-card class="protocol-sheet">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            <q-icon name="mdi-cog" class="q-mr-sm" />
            Protocole
          </div>
          <q-space />
          <q-btn flat round dense icon="mdi-close" aria-label="Fermer" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm protocol-sheet-body">
          <div class="text-body2 text-muted q-mb-md">
            Les modifications seront appliquées à la validation. Annuler conserve le protocole précédent.
          </div>

          <!-- Liste des catégories -->
          <q-list separator class="protocol-list">
            <template v-for="category in state.categories" :key="category.id">
              <!-- Catégorie header -->
              <q-item class="category-item">
                <q-item-section avatar>
                  <q-icon 
                    name="mdi-folder" 
                    color="control"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ category.name }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ category.action === 'continuous' ? 'Continu' : 'Discret' }} • 
                    {{ category.children?.length || 0 }} observable(s)
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-btn
                      flat
                      round
                      dense
                      icon="mdi-plus"
                      color="positive"
                      aria-label="Ajouter observable"
                      @click="methods.openAddObservableForCategory(category)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="mdi-pencil"
                      color="info"
                      aria-label="Renommer"
                      @click="methods.openRenameCategory(category)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="mdi-delete"
                      color="negative"
                      aria-label="Supprimer catégorie"
                      @click="methods.deleteCategory(category)"
                    />
                  </div>
                </q-item-section>
              </q-item>

              <!-- Observables de la catégorie -->
              <q-item
                v-for="observable in category.children"
                :key="observable.id"
                class="observable-item q-pl-xl"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-circle" size="xs" :color="observable.color || 'green'" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ observable.name }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-btn
                      flat
                      round
                      dense
                      icon="mdi-pencil"
                      color="info"
                      aria-label="Renommer"
                      @click="methods.openRenameObservable(category, observable)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="mdi-delete"
                      color="negative"
                      aria-label="Supprimer"
                      @click="methods.deleteObservable(category, observable)"
                    />
                  </div>
                </q-item-section>
              </q-item>
            </template>

            <!-- Empty state -->
            <q-item v-if="state.categories.length === 0">
              <q-item-section class="text-center text-muted q-pa-md">
                <q-icon name="mdi-folder-alert-outline" size="32px" class="q-mb-sm" />
                <div>Aucune catégorie</div>
                <div class="text-body2">Ajoutez une catégorie pour commencer</div>
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Réglage de la taille d'affichage (contextuel à l'édition du protocole) -->
          <div class="q-mt-sm q-pa-sm ui-scale-card">
            <div class="row items-center q-mb-xs">
              <q-icon name="mdi-resize" size="18px" color="control" class="q-mr-sm" />
              <div class="text-caption text-weight-medium">Taille d'affichage</div>
              <q-space />
              <q-badge color="primary" :label="Math.round(uiScale.state.scale * 100) + '%'" />
            </div>
            <q-slider
              dense
              :model-value="uiScale.state.scale"
              :min="uiScale.min"
              :max="uiScale.max"
              :step="uiScale.step"
              color="control"
              aria-label="Taille des catégories"
              @update:model-value="methods.onUiScaleChange"
            />
            <div class="row items-center justify-between">
              <q-btn flat dense label="Compact" class="text-muted" size="sm" @click="methods.onUiScaleChange(uiScale.min)" />
              <q-btn flat dense label="Standard" class="text-muted" size="sm" @click="methods.onUiScaleChange(1)" />
              <q-btn flat dense label="Grand" class="text-muted" size="sm" @click="methods.onUiScaleChange(uiScale.max)" />
            </div>
          </div>

          <!-- Bouton ajouter catégorie -->
          <q-btn
            color="primary"
            label="Ajouter une catégorie"
            icon="mdi-folder-plus"
            class="full-width q-mt-sm"
            unelevated
            @click="methods.openAddCategoryFromSheet"
          />
        </q-card-section>
        <q-card-actions align="right" class="protocol-sheet-actions">
          <q-btn flat label="Annuler" :disable="editMode.sharedState.isSaving" @click="methods.cancelEditMode" />
          <q-btn unelevated color="accent-strong" label="Enregistrer" :loading="editMode.sharedState.isSaving" @click="methods.exitEditMode" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </DPage>
</template>

<script lang="ts">
/* eslint-disable vue/multi-word-component-names */
import { defineComponent, reactive, onMounted, onBeforeUnmount, watch, ref, computed, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useChronicle } from '@composables/use-chronicle';
import { useEditMode, useHaptics } from '@composables';
import { protocolService } from '@services/protocol.service';
import { observationService } from '@services/observation.service';
import { DPage, DraggableCategory } from '@components';
import type { IProtocolItemWithChildren } from '@database/repositories/protocol.repository';
import { useProtocolDraft } from '@composables/use-protocol-draft';
import { protocolRepository } from '@database/repositories/protocol.repository';
import { isRecordingActiveFromReadings, convertMobileReadings } from '@actograph/core';

export default defineComponent({
  name: 'ObservationPage',
  components: {
    DPage,
    DraggableCategory,
  },
  setup() {
    const $q = useQuasar();
    const chronicle = useChronicle();
    const editMode = useEditMode();
    const protocolDraft = useProtocolDraft();
    const haptics = useHaptics();
    const uiScale = editMode.uiScale;

    const state = reactive({
      categories: [] as IProtocolItemWithChildren[],
      isRecording: false,
      recordingBusy: false,
      activeObservableByCategory: {} as Record<number, string>,
      totalReadingsCount: 0,
      readingsCountAnimating: false,
      // Dialogs
      showAddCategoryDialog: false,
      showAddObservableDialog: false,
      showAddCommentDialog: false,
      showProtocolSheet: false,
      showRenameCategoryDialog: false,
      showRenameObservableDialog: false,
      selectedCategory: null as IProtocolItemWithChildren | null,
      selectedObservable: null as IProtocolItemWithChildren | null,
      newCategory: {
        name: '',
        action: 'continuous',
      },
      newObservable: {
        name: '',
      },
      newComment: {
        text: '',
        description: '',
      },
      savingComment: false,
      renameCategory: {
        name: '',
      },
      renameObservable: {
        name: '',
      },
    });

    // Edit mode container ref for bounds calculation
    const editContainerRef = ref<HTMLElement | null>(null);

    // Timer: scale font so the full string (HH:mm:ss.mmm) always fits the toolbar slot.
    const timerDisplayRef = ref<HTMLElement | null>(null);
    const timerTextRef = ref<HTMLElement | null>(null);
    const TIMER_FONT_MAX_PX = 34;
    // Floor for pathological viewports only; typical fitted size stays 15–32px.
    const TIMER_FONT_ABSOLUTE_MIN_PX = 12;

    const timerFontSizePx = ref(TIMER_FONT_MAX_PX);
    const timerTextStyle = computed(() => ({ fontSize: `${timerFontSizePx.value}px` }));

    const fitTimerText = () => {
      const container = timerDisplayRef.value;
      const text = timerTextRef.value;
      if (!container || !text) return;

      const recDot = container.querySelector('.rec-dot') as HTMLElement | null;
      const reserved = recDot ? recDot.offsetWidth + 6 : 0;
      const maxTextWidth = container.clientWidth - reserved;
      if (maxTextWidth <= 0) return;

      let size = TIMER_FONT_MAX_PX;
      text.style.fontSize = `${size}px`;
      while (text.scrollWidth > maxTextWidth && size > TIMER_FONT_ABSOLUTE_MIN_PX) {
        size -= 0.5;
        text.style.fontSize = `${size}px`;
      }
      timerFontSizePx.value = Math.max(size, TIMER_FONT_ABSOLUTE_MIN_PX);
    };

    let timerResizeObserver: ResizeObserver | null = null;
    let layoutResizeObserver: ResizeObserver | null = null;
    let fitTimerRaf = 0;

    const scheduleFitTimerText = () => {
      cancelAnimationFrame(fitTimerRaf);
      fitTimerRaf = requestAnimationFrame(() => {
        fitTimerRaf = 0;
        fitTimerText();
      });
    };

    // Container bounds for drag constraints (reactive)
    const containerBounds = ref({ width: 350, height: 600 });
    
    // Update bounds when container ref changes
    const updateContainerBounds = () => {
      if (editContainerRef.value) {
        const rect = editContainerRef.value.getBoundingClientRect();
        containerBounds.value = { width: rect.width, height: rect.height };
      }
    };

    // Computed: can enter edit mode (not recording)
    const canEnterEditMode = computed(() => 
      !state.isRecording && !chronicle.sharedState.isPaused
    );

    const methods = {
      getDefaultContinuousObservableName: (category: IProtocolItemWithChildren): string | null => {
        const observables = category.children ?? [];
        if (category.action !== 'continuous' || observables.length === 0) {
          return null;
        }

        const defaultObservable = observables[observables.length - 1];
        return defaultObservable?.name || null;
      },

      initializeContinuousActiveObservables: () => {
        const nextActiveObservableByCategory: Record<number, string> = {};

        state.categories.forEach((category) => {
          if (category.action !== 'continuous') {
            return;
          }

          const observableNames = (category.children ?? []).map((child) => child.name);
          if (observableNames.length === 0) {
            return;
          }

          const currentActive = state.activeObservableByCategory[category.id];
          if (currentActive && observableNames.includes(currentActive)) {
            nextActiveObservableByCategory[category.id] = currentActive;
            return;
          }

          const defaultObservableName = methods.getDefaultContinuousObservableName(category);
          if (defaultObservableName) {
            nextActiveObservableByCategory[category.id] = defaultObservableName;
          }
        });

        state.activeObservableByCategory = nextActiveObservableByCategory;
      },

      loadProtocol: () => {
        // Filter and normalize categories - more lenient check
        const filteredCategories = (editMode.sharedState.isEditing ? protocolDraft.categories.value : chronicle.sharedState.currentProtocol)
          .filter((cat) => {
            if (!cat) return false;
            // More lenient check - just ensure id exists and can be converted to number
            const id = cat.id;
            if (id === undefined || id === null || (typeof id === 'string' && id === '')) {
              return false;
            }
            // Check that name exists and is a non-empty string
            if (!cat.name || typeof cat.name !== 'string' || !cat.name.trim()) {
              return false;
            }
            // Check that type is 'category'
            if (cat.type !== 'category') {
              return false;
            }
            return true;
          })
          .map((cat) => ({
            ...cat,
            id: Number(cat.id), // Convert to number here
            children: Array.isArray(cat.children) ? cat.children : [],
          }));
        
        // Initialize positions when categories change, but only if NOT in edit mode
        // (to avoid overwriting positions being edited)
        if (filteredCategories.length > 0 && !editMode.sharedState.isEditing) {
          editMode.methods.initializePositions(filteredCategories);
        }
        
        // Sort categories by their position (row first, then column)
        // This ensures the grid view reflects the order defined in edit mode
        state.categories = filteredCategories.sort((a, b) => {
          const posA = editMode.sharedState.categoryPositions[a.id] || { x: 0, y: 0 };
          const posB = editMode.sharedState.categoryPositions[b.id] || { x: 0, y: 0 };
          
          // Sort by Y (row) first, then by X (column)
          if (posA.y !== posB.y) {
            return posA.y - posB.y;
          }
          return posA.x - posB.x;
        });

        methods.initializeContinuousActiveObservables();
      },

      loadRecentReadings: () => {
        const readings = chronicle.sharedState.currentReadings;
        const newCount = readings.length;
        
        if (newCount > state.totalReadingsCount && state.totalReadingsCount > 0) {
          state.readingsCountAnimating = true;
          setTimeout(() => { state.readingsCountAnimating = false; }, 600);
        }
        state.totalReadingsCount = newCount;

        state.isRecording = isRecordingActiveFromReadings(
          convertMobileReadings(readings),
        );

        const nextActiveObservableByCategory: Record<number, string> = {};
        state.categories.forEach((category) => {
          if (category.action !== 'continuous') {
            return;
          }

          const categoryObservableNames = (category.children ?? []).map((observable) => observable.name);
          if (categoryObservableNames.length === 0) {
            return;
          }

          if (state.isRecording) {
            const lastDataReading = [...readings]
              .reverse()
              .find((reading) => (
                reading.type === 'DATA'
                && !!reading.name
                && categoryObservableNames.includes(reading.name)
              ));

            if (lastDataReading?.name) {
              nextActiveObservableByCategory[category.id] = lastDataReading.name;
              return;
            }
          }

          const currentActive = state.activeObservableByCategory[category.id];
          if (currentActive && categoryObservableNames.includes(currentActive)) {
            nextActiveObservableByCategory[category.id] = currentActive;
            return;
          }

          const defaultObservableName = methods.getDefaultContinuousObservableName(category);
          if (defaultObservableName) {
            nextActiveObservableByCategory[category.id] = defaultObservableName;
          }
        });

        state.activeObservableByCategory = nextActiveObservableByCategory;
      },

      runRecordingAction: async (action: () => Promise<void>) => {
        if (state.recordingBusy) return;
        state.recordingBusy = true;
        try { await action(); }
        catch (error) {
          $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Enregistrement impossible' });
          await chronicle.methods.refreshReadings();
          chronicle.methods.syncRecordingStateFromReadings();
        } finally { state.recordingBusy = false; }
      },

      startRecording: async () => {
        haptics.impactLight();
        methods.initializeContinuousActiveObservables();

        const initialContinuousObservableNames = state.categories
          .filter((category) => category.action === 'continuous')
          .map((category) => {
            const activeObservableName = state.activeObservableByCategory[category.id];
            if (activeObservableName) {
              return activeObservableName;
            }
            return methods.getDefaultContinuousObservableName(category);
          })
          .filter((observableName): observableName is string => Boolean(observableName));

        await methods.runRecordingAction(() => chronicle.methods.startRecording(initialContinuousObservableNames));
        methods.loadRecentReadings();
      },

      stopRecording: async () => {
        haptics.impactMedium();
        await methods.runRecordingAction(() => chronicle.methods.stopRecording());
        methods.initializeContinuousActiveObservables();
        methods.loadRecentReadings();
      },

      togglePause: async () => {
        haptics.impactLight();
        if (!chronicle.sharedState.isPaused) {
          await methods.runRecordingAction(() => chronicle.methods.pauseRecording());
        } else {
          await methods.runRecordingAction(() => chronicle.methods.resumeRecording());
        }
        methods.loadRecentReadings();
      },

      toggleObservable: async (category: IProtocolItemWithChildren, observable: IProtocolItemWithChildren) => {
        haptics.impactLight();

        if (category.action !== 'continuous') {
          return;
        }

        const currentActiveObservable = state.activeObservableByCategory[category.id];
        if (currentActiveObservable === observable.name) {
          return;
        }

        state.activeObservableByCategory[category.id] = observable.name;

        // Before recording starts, selecting a continuous observable only updates
        // the active state used for the initial DATA reading at START.
        if (!state.isRecording || chronicle.sharedState.isPaused) {
          return;
        }

        try {
          await chronicle.methods.toggleObservable(observable.name);
          methods.loadRecentReadings();
        } catch (error) {
          state.activeObservableByCategory[category.id] = currentActiveObservable;
          $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Relevé non enregistré' });
        }
      },

      pressObservable: async (observable: IProtocolItemWithChildren) => {
        if (!state.isRecording || chronicle.sharedState.isPaused) {
          return;
        }

        haptics.impactLight();
        try {
          await chronicle.methods.toggleObservable(observable.name);
          methods.loadRecentReadings();
        } catch (error) {
          $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Relevé non enregistré' });
        }
      },

      refreshProtocol: async () => {
        if (!editMode.sharedState.isEditing && chronicle.sharedState.currentChronicle) {
          await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle.id);
        }
        methods.loadProtocol();
      },

      // Protocol management
      addCategory: async () => {
        if (!state.newCategory.name.trim()) {
          $q.notify({
            type: 'warning',
            message: 'Veuillez saisir un nom pour la catégorie',
            position: 'top',
          });
          return;
        }

        if (!chronicle.sharedState.currentChronicle) {
          $q.notify({
            type: 'negative',
            message: 'Aucune chronique chargée. Veuillez charger une chronique depuis l\'accueil.',
            position: 'top',
          });
          return;
        }

        const trimmedName = state.newCategory.name.trim();
        
        // Vérifier l'unicité du nom
        const existingCategory = state.categories.find(
          (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (existingCategory) {
          $q.notify({
            type: 'warning',
            message: 'Une catégorie avec ce nom existe déjà',
            position: 'top',
          });
          return;
        }

        try {
          const newCategory = editMode.sharedState.isEditing
            ? protocolDraft.addCategory(trimmedName, state.newCategory.action)
            : await protocolService.addCategory(
            chronicle.sharedState.currentChronicle.id,
            trimmedName,
            state.newCategory.action
          );

          state.showAddCategoryDialog = false;
          state.newCategory.name = '';
          state.newCategory.action = 'continuous';
          await methods.refreshProtocol();
          await nextTick();

          const allCategories = state.categories;
          const addedCategory = allCategories.find((category) => category.id === newCategory.id)
            || allCategories.find((category) => category.name === trimmedName);
          
          // If in edit mode, add a position for the new category
          if (editMode.sharedState.isEditing) {
            if (addedCategory) {
              editMode.methods.addCategoryPosition(addedCategory.id, allCategories);
            }
          } else if (addedCategory) {
            // Shortcut UX: immediately propose creating the first observable.
            state.selectedCategory = addedCategory;
            state.newObservable.name = '';
            state.showAddObservableDialog = true;
          }
          
          $q.notify({
            type: 'positive',
            message: `Catégorie "${trimmedName}" ajoutée`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to add category:', error);
          $q.notify({
            type: 'negative',
            message: `Erreur lors de l'ajout de la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            position: 'top',
          });
        }
      },

      addObservable: async () => {
        if (!chronicle.sharedState.currentChronicle || !state.selectedCategory || !state.newObservable.name.trim()) return;

        const trimmedName = state.newObservable.name.trim();
        
        // Vérifier l'unicité du nom dans la catégorie
        const existingObservable = state.categories.flatMap((category) => category.children ?? []).find(
          (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (existingObservable) {
          $q.notify({
            type: 'warning',
            message: 'Un observable avec ce nom existe déjà dans le protocole',
            position: 'top',
          });
          return;
        }

        try {
          const categoryName = state.selectedCategory.name;
          if (editMode.sharedState.isEditing) {
            protocolDraft.addObservable(state.selectedCategory.id, trimmedName);
          } else await protocolService.addObservable(
            chronicle.sharedState.currentChronicle.id,
            state.selectedCategory.id,
            trimmedName
          );
          state.showAddObservableDialog = false;
          state.newObservable.name = '';
          state.selectedCategory = null;
          await methods.refreshProtocol();
          $q.notify({
            type: 'positive',
            message: `Observable "${trimmedName}" ajouté à "${categoryName}"`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to add observable:', error);
          $q.notify({
            type: 'negative',
            message: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de l\'observable',
            position: 'top',
          });
        }
      },

      addComment: async () => {
        if (
          !chronicle.sharedState.currentChronicle
          || !state.newComment.text?.trim()
          || state.savingComment
        ) {
          return;
        }

        haptics.impactLight();
        state.savingComment = true;
        try {
          await observationService.addComment(
            chronicle.sharedState.currentChronicle.id,
            state.newComment.text,
            state.newComment.description || undefined
          );
          state.showAddCommentDialog = false;
          state.newComment.text = '';
          state.newComment.description = '';
          await chronicle.methods.refreshReadings();
          methods.loadRecentReadings();
        } catch (error) {
          console.error('Failed to add comment:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'ajout du commentaire',
            position: 'top',
          });
        } finally {
          state.savingComment = false;
        }
      },

      // Protocol sheet methods
      openAddCategoryFromSheet: () => {
        state.showAddCategoryDialog = true;
      },

      openAddObservableForCategory: (category: IProtocolItemWithChildren) => {
        state.selectedCategory = category;
        state.showAddObservableDialog = true;
      },

      deleteCategory: async (category: IProtocolItemWithChildren) => {
        if (!chronicle.sharedState.currentChronicle) return;

        try {
          const categoryName = category.name;
          const categoryId = category.id;
          
          if ((category.children ?? []).some((observable) => chronicle.sharedState.currentReadings.some((reading) => reading.type === 'DATA' && reading.name === observable.name))) {
            throw new Error('Cette catégorie contient des relevés. Dupliquez la chronique sans relevés pour la supprimer.');
          }
          if (editMode.sharedState.isEditing) {
            protocolDraft.remove(categoryId);
            editMode.methods.removeCategoryPosition(categoryId);
          }
          else await protocolService.deleteItem(categoryId);
          await methods.refreshProtocol();
          $q.notify({
            type: 'info',
            message: `Catégorie "${categoryName}" supprimée`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to delete category:', error);
          $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Suppression impossible' });
        }
      },

      deleteObservable: async (category: IProtocolItemWithChildren, observable: IProtocolItemWithChildren) => {
        if (!chronicle.sharedState.currentChronicle) return;

        try {
          if (chronicle.sharedState.currentReadings.some((reading) => reading.type === 'DATA' && reading.name === observable.name)) {
            throw new Error('Cet observable contient des relevés. Dupliquez la chronique sans relevés pour le supprimer.');
          }
          if (editMode.sharedState.isEditing) protocolDraft.remove(observable.id);
          else await protocolService.deleteItem(observable.id);
          await methods.refreshProtocol();
          $q.notify({
            type: 'info',
            message: `Observable "${observable.name}" supprimé`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to delete observable:', error);
          $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Suppression impossible' });
        }
      },

      // Rename methods
      openRenameCategory: (category: IProtocolItemWithChildren) => {
        state.selectedCategory = category;
        state.renameCategory.name = category.name;
        state.showRenameCategoryDialog = true;
      },

      openRenameObservable: (category: IProtocolItemWithChildren, observable: IProtocolItemWithChildren) => {
        state.selectedCategory = category;
        state.selectedObservable = observable;
        state.renameObservable.name = observable.name;
        state.showRenameObservableDialog = true;
      },

      renameCategory: async () => {
        if (!chronicle.sharedState.currentChronicle || !state.selectedCategory || !state.renameCategory.name.trim()) return;

        const trimmedName = state.renameCategory.name.trim();
        
        // Vérifier l'unicité du nom (sauf si c'est le même)
        if (trimmedName.toLowerCase() !== state.selectedCategory.name.toLowerCase()) {
          const existingCategory = state.categories.find(
            (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
          );
          if (existingCategory) {
            $q.notify({
              type: 'warning',
              message: 'Une catégorie avec ce nom existe déjà',
              position: 'top',
            });
            return;
          }
        }

        try {
          if (editMode.sharedState.isEditing) protocolDraft.rename(state.selectedCategory.id, trimmedName);
          else await protocolService.updateItem(state.selectedCategory.id, { name: trimmedName });
          state.showRenameCategoryDialog = false;
          state.renameCategory.name = '';
          state.selectedCategory = null;
          await methods.refreshProtocol();
          $q.notify({
            type: 'positive',
            message: `Catégorie renommée en "${trimmedName}"`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to rename category:', error);
          $q.notify({
            type: 'negative',
            message: error instanceof Error ? error.message : 'Erreur lors du renommage',
            position: 'top',
          });
        }
      },

      renameObservable: async () => {
        if (!chronicle.sharedState.currentChronicle || !state.selectedCategory || !state.selectedObservable || !state.renameObservable.name.trim()) return;

        const trimmedName = state.renameObservable.name.trim();
        
        // Vérifier l'unicité du nom dans la catégorie (sauf si c'est le même)
        if (trimmedName.toLowerCase() !== state.selectedObservable.name.toLowerCase()) {
          const existingObservable = state.categories.flatMap((category) => category.children ?? []).find(
            (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
          );
          if (existingObservable) {
            $q.notify({
              type: 'warning',
              message: 'Un observable avec ce nom existe déjà dans le protocole',
              position: 'top',
            });
            return;
          }
        }

        try {
          if (editMode.sharedState.isEditing) protocolDraft.rename(state.selectedObservable.id, trimmedName);
          else await protocolService.updateItem(state.selectedObservable.id, { name: trimmedName });
          state.showRenameObservableDialog = false;
          state.renameObservable.name = '';
          state.selectedObservable = null;
          state.selectedCategory = null;
          await methods.refreshProtocol();
          $q.notify({
            type: 'positive',
            message: `Observable renommé en "${trimmedName}"`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to rename observable:', error);
          $q.notify({
            type: 'negative',
            message: error instanceof Error ? error.message : 'Erreur lors du renommage',
            position: 'top',
          });
        }
      },

      // Edit mode methods
      enterEditMode: () => {
        if (canEnterEditMode.value) {
          protocolDraft.begin(chronicle.sharedState.currentProtocol);
          editMode.methods.enterEditMode();
          methods.loadProtocol();
        }
      },

      exitEditMode: async () => {
        const current = chronicle.sharedState.currentChronicle;
        if (!current || editMode.sharedState.isSaving) return;
        editMode.sharedState.isSaving = true;
        try {
          const categories = protocolDraft.categories.value.map((category) => {
            const meta = { ...(category.meta ?? {}) };
            meta.position = editMode.sharedState.categoryPositions[category.id];
            const size = editMode.sharedState.categorySizes[category.id];
            if (size) meta.size = size;
            else delete meta.size;
            return { ...category, meta };
          });
          await protocolRepository.saveDraft(current.id, categories, uiScale.state.scale);
          state.showProtocolSheet = false;
          editMode.methods.acceptChanges();
          await uiScale.setScale(uiScale.state.scale);
          await chronicle.methods.loadChronicle(current.id);
          methods.loadProtocol();
          $q.notify({ type: 'positive', message: 'Protocole et disposition enregistrés' });
        } catch (error) {
          $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde' });
        } finally {
          editMode.sharedState.isSaving = false;
        }
      },

      cancelEditMode: () => {
        if (editMode.sharedState.isSaving) return;
        state.showProtocolSheet = false;
        editMode.methods.cancelEditMode();
        methods.loadProtocol();
        methods.remeasureLayout();
      },

      handleDragMove: ({ categoryId, position }: { categoryId: number; position: { x: number; y: number } }) => {
        editMode.methods.updateCategoryPosition(categoryId, position);
      },

      handleResizeMove: ({ categoryId, width }: { categoryId: number; width: number }) => {
        editMode.methods.updateCategorySize(categoryId, { width });
      },

      handleResizeEnd: (categoryId: number) => {
        editMode.methods.endResize();
        // Remesure après la fin du resize pour dimensionner le conteneur
        // à la hauteur réelle (la carte a pu changer de hauteur via reflow).
        nextTick(() => {
          editMode.methods.measureHeights(editContainerRef.value);
          updateContainerBounds();
        });
        // Petit feedback haptique de fin de redimensionnement.
        haptics.impactLight();
        void categoryId;
      },

      /**
       * Remesure les hauteurs rendues et rafraîchit les bornes du conteneur.
       * À appeler après tout changement affectant la hauteur des cartes.
       */
      remeasureLayout: () => {
        nextTick(() => {
          layoutResizeObserver?.disconnect();
          if (editContainerRef.value) {
            layoutResizeObserver?.observe(editContainerRef.value);
            editContainerRef.value.querySelectorAll('[data-category-id]').forEach((element) => layoutResizeObserver?.observe(element));
          }
          editMode.methods.measureHeights(editContainerRef.value);
          updateContainerBounds();
        });
      },

      resetCategoryPositions: () => {
        editMode.methods.resetPositions(state.categories);
        // Les largeurs ayant été remises à la valeur par défaut, il faut
        // remesurer les hauteurs (le reflow peut changer la hauteur).
        methods.remeasureLayout();
      },

      onUiScaleChange: async (value: number | null) => {
        if (value == null || !Number.isFinite(value)) return;
        uiScale.state.scale = Math.max(uiScale.min, Math.min(uiScale.max, value));
        methods.remeasureLayout();
      },

      /**
       * Applique le uiScale sauvegardé dans le meta de la chronic courante.
       * Compat ascendante : si pas de meta.uiScale, on garde la valeur
       * courante (préf appareil). Ne persiste pas en backend.
       */
      applyChronicleUiScale: () => {
        const fromMeta = chronicle.sharedState.currentChronicle?.meta?.uiScale;
        if (typeof fromMeta === 'number' && Number.isFinite(fromMeta)) {
          void uiScale.setScale(fromMeta);
        }
      },

      /**
       * Get CSS position style for a category in normal mode
       * Uses the same positions as edit mode but without drag effects
       */
      getCategoryPositionStyle: (categoryId: number): Record<string, string | number> => {
        const position = editMode.sharedState.categoryPositions[categoryId] || { x: 0, y: 0 };
        const width = editMode.getCategoryWidth(categoryId);

        return {
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${width}px`,
          transition: 'left 0.3s ease, top 0.3s ease',
        };
      },
      
      updateContainerBounds,
    };

    onMounted(() => {
      layoutResizeObserver = new ResizeObserver(() => {
        editMode.methods.measureHeights(editContainerRef.value);
        updateContainerBounds();
      });
      // Always load protocol and readings on mount
      methods.loadProtocol();
      methods.loadRecentReadings();

      // Resume timer if recording is active and not paused
      if (state.isRecording && !chronicle.sharedState.isPaused) {
        chronicle.methods.startTimer();
      }

      // Load persisted UI scale (by device) and then measure real heights.
      // Après le chargement de la prefs appareil, on surcharge avec le uiScale
      // sauvegardé dans le meta de la chronic courante (si présent).
      uiScale.load().finally(() => {
        methods.applyChronicleUiScale();
        methods.remeasureLayout();
      });

      // Update container bounds after DOM is ready
      nextTick(() => {
        scheduleFitTimerText();
        if (timerDisplayRef.value) {
          timerResizeObserver = new ResizeObserver(() => scheduleFitTimerText());
          timerResizeObserver.observe(timerDisplayRef.value);
        }
        setTimeout(() => {
          updateContainerBounds();
          editMode.methods.measureHeights(editContainerRef.value);
          scheduleFitTimerText();
        }, 100);
      });
    });

    // Clean up edit mode when component unmounts
    onBeforeUnmount(() => {
      cancelAnimationFrame(fitTimerRaf);
      fitTimerRaf = 0;
      timerResizeObserver?.disconnect();
      timerResizeObserver = null;
      layoutResizeObserver?.disconnect();
      layoutResizeObserver = null;
      // Cancel edit mode if active to prevent state leakage
      if (editMode.sharedState.isEditing) {
        editMode.methods.cancelEditMode();
      }
    });

    watch(protocolDraft.categories, () => {
      if (editMode.sharedState.isEditing) methods.loadProtocol();
    }, { deep: true });

    // Watch for protocol changes
    watch(
      () => chronicle.sharedState.currentProtocol,
      () => {
        methods.loadProtocol();
      },
      { deep: true, immediate: true }
    );

    watch(
      () => chronicle.sharedState.currentReadings,
      () => methods.loadRecentReadings(),
      { deep: true }
    );

    watch(
      () => chronicle.sharedState.currentChronicle?.id,
      () => {
        state.showAddCommentDialog = false;
        state.newComment.text = '';
        state.newComment.description = '';
        state.savingComment = false;
      }
    );

    // Restaurer le uiScale sauvegardé dans le meta quand on change de chronic
    // (sans écraser la prefs appareil au premier chargement, géré dans onMounted).
    watch(
      () => chronicle.sharedState.currentChronicle?.meta?.uiScale,
      (fromMeta) => {
        if (typeof fromMeta === 'number' && Number.isFinite(fromMeta)) {
          void uiScale.setScale(fromMeta);
        }
      }
    );

    // Watch orientation changes to recalculate bounds
    watch(() => $q.screen.width, () => {
      if (editContainerRef.value) {
        updateContainerBounds();
        nextTick(() => editMode.methods.measureHeights(editContainerRef.value));
      }
      nextTick(scheduleFitTimerText);
    });

    watch(
      () => [
        chronicle.formattedTime.value.length,
        state.isRecording,
        chronicle.sharedState.isPaused,
        chronicle.sharedState.isPlaying,
        editMode.sharedState.isEditing,
      ],
      () => {
        nextTick(scheduleFitTimerText);
      },
    );

    // Watch edit mode to update bounds when entering
    watch(() => editMode.sharedState.isEditing, (isEditing) => {
      if (isEditing) {
        nextTick(() => {
          updateContainerBounds();
          editMode.methods.measureHeights(editContainerRef.value);
        });
      }
      // Note: Cleanup is handled by onBeforeUnmount, no need for watch cleanup
      // to avoid double-cancel after exitEditMode()
    });

    // Remesurer quand les catégories changent (ajout/suppression/contenu).
    watch(
      () => state.categories,
      () => methods.remeasureLayout(),
      { deep: true }
    );

    // Remesurer quand une largeur personnalisée change (resize terminé).
    watch(
      () => editMode.sharedState.categorySizes,
      () => methods.remeasureLayout(),
      { deep: true }
    );

    // Remesurer quand l'échelle globale change (les hauteurs reflow).
    watch(
      () => uiScale.state.scale,
      () => methods.remeasureLayout()
    );

    return {
      chronicle,
      state,
      methods,
      editMode,
      uiScale,
      editContainerRef,
      containerBounds,
      canEnterEditMode,
      timerDisplayRef,
      timerTextRef,
      timerTextStyle,
    };
  },
});
</script>

<style scoped lang="scss">
.timer-toolbar {
  flex: 0 0 auto;
  background: linear-gradient(135deg, var(--primary) 0%, #161d27 100%);
  border-bottom: 2px solid var(--accent);
  min-height: 64px;

  // Side controls keep a fixed footprint so the timer slot width stays predictable.
  .q-btn,
  .toolbar-spacer {
    flex-shrink: 0;
  }
}

.toolbar-spacer {
  // Match the round md q-btn footprint so the timer stays centered.
  width: 42px;
  height: 42px;
}

.timer-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1 1 0;
  min-width: 0;
  line-height: 1.2;

  &.blink {
    animation: blink-animation 1s ease-in-out infinite;
  }
}

.timer-text {
  flex: 0 1 auto;
  min-width: 0;
  font-family: 'Roboto Mono', 'Courier New', monospace;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  // Never ellipsize: fitTimerText() scales font-size down to keep the full string visible.
}

.rec-dot {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--q-negative);
  animation: rec-dot-pulse 1.1s ease-in-out infinite;
}

@keyframes blink-animation {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes rec-dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.85); }
}

.categories-container {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.categories-scroll {
  position: absolute;
  inset: 0;
}

.positioned-container {
  position: relative;
  padding: 8px;
  min-height: 100%;
}

.edit-protocol-banner {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: var(--primary);
  color: white;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);

  &:active {
    background: color-mix(in srgb, var(--primary) 85%, black);
  }
}

.empty-state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.readings-counter-pulse {
  animation: counter-pulse 0.6s ease-out;
}

@keyframes counter-pulse {
  0% { transform: scale(1); }
  30% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

// Protocol sheet styles
.protocol-sheet {
  border-radius: 16px 16px 0 0;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.protocol-sheet-body { overflow-y: auto; min-height: 0; }
.protocol-sheet-actions { flex-shrink: 0; border-top: 1px solid rgba(128, 128, 128, 0.25); }
.protocol-list :deep(.q-item__section--avatar) { min-width: 28px; padding-right: 8px; }
.protocol-list :deep(.q-item__section--side) { padding-left: 4px; }
.protocol-list :deep(.observable-item) { padding-left: 16px; }
.protocol-list {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;

}

.category-item {
  background: white;
  margin-bottom: 1px;
}

.observable-item {
  background: rgba(0, 0, 0, 0.02);
}

.ui-scale-card {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

</style>
