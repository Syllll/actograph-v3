<template>
  <DPage>
    <!-- Timer toolbar (header fixe) -->
    <div class="timer-toolbar q-pa-md">
      <!-- Protocol button -->
      <div class="row items-center justify-between q-mb-sm">
        <q-btn
          flat
          dense
          icon="mdi-clipboard-list"
          color="white"
          size="sm"
          label="Protocole"
          @click="state.showProtocolSheet = true"
        />
        <div class="text-caption text-white text-center col">
          {{ state.categories.length }} catégorie(s)
        </div>
        <div style="width: 40px"></div>
      </div>

      <div class="row items-center justify-center">
        <div 
          class="timer-display text-h4 text-weight-bold" 
          :class="chronicle.sharedState.isPaused ? 'text-warning blink' : 'text-accent'"
        >
          {{ chronicle.formattedTime.value }}
        </div>
      </div>

      <div class="row items-center justify-center q-mt-md q-gutter-md">
        <q-btn
          v-if="!state.isRecording"
          round
          color="positive"
          icon="mdi-play"
          size="lg"
          @click="methods.startRecording"
        >
          <q-tooltip>Démarrer l'enregistrement</q-tooltip>
        </q-btn>

        <template v-else>
          <q-btn
            round
            :color="chronicle.sharedState.isPaused ? 'positive' : 'warning'"
            :icon="chronicle.sharedState.isPaused ? 'mdi-play' : 'mdi-pause'"
            size="lg"
            @click="methods.togglePause"
          >
            <q-tooltip>{{ chronicle.sharedState.isPaused ? 'Reprendre' : 'Pause' }}</q-tooltip>
          </q-btn>

          <q-btn
            round
            color="negative"
            icon="mdi-stop"
            size="lg"
            @click="methods.stopRecording"
          >
            <q-tooltip>Arrêter l'enregistrement</q-tooltip>
          </q-btn>
        </template>
      </div>
    </div>

    <!-- Zone scrollable des catégories -->
    <div class="categories-container">
      <q-scroll-area class="categories-scroll">
        <div class="q-pa-md">
          <!-- Categories grid -->
          <div class="categories-grid">
            <q-card
              v-for="category in state.categories"
              :key="category.id"
              class="category-card"
              :class="{ 'continuous': category.action === 'continuous' }"
            >
              <q-card-section class="category-header q-py-sm">
                <div class="text-subtitle1 text-weight-medium">{{ category.name }}</div>
              </q-card-section>

              <q-card-section class="category-content q-pt-sm">
                <!-- Empty category message -->
                <div v-if="!category.children || category.children.length === 0" class="text-center q-pa-sm">
                  <div class="text-caption text-grey">Aucun observable</div>
                  <q-btn
                    flat
                    dense
                    size="sm"
                    color="primary"
                    label="Ajouter"
                    icon="mdi-plus"
                    @click="methods.openAddObservableForCategory(category)"
                  />
                </div>

                <!-- Continuous category: Switch buttons (toggle) -->
                <div v-else-if="category.action === 'continuous'" class="observables-container row wrap q-gutter-sm">
                  <q-btn
                    v-for="observable in category.children"
                    :key="observable.id"
                    :label="observable.name"
                    :color="state.activeObservableByCategory[category.id] === observable.name ? 'accent' : 'grey-4'"
                    :text-color="state.activeObservableByCategory[category.id] === observable.name ? 'white' : 'dark'"
                    :outline="state.activeObservableByCategory[category.id] !== observable.name"
                    :disable="!state.isRecording || chronicle.sharedState.isPaused"
                    rounded
                    unelevated
                    no-caps
                    class="observable-btn switch-btn"
                    @click="methods.toggleObservable(category, observable)"
                  />
                </div>

                <!-- Discrete category: Press buttons (event) -->
                <div v-else class="observables-container column q-gutter-sm">
                  <q-btn
                    v-for="observable in category.children"
                    :key="observable.id"
                    :label="observable.name"
                    color="primary"
                    :disable="!state.isRecording || chronicle.sharedState.isPaused"
                    rounded
                    unelevated
                    no-caps
                    class="observable-btn press-btn"
                    @click="methods.pressObservable(observable)"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Empty state -->
          <div v-if="state.categories.length === 0" class="empty-state text-center q-pa-xl">
            <q-icon name="mdi-alert-circle-outline" size="48px" color="grey-5" />
            <div class="text-body1 text-grey q-mt-md">
              Aucune catégorie définie
            </div>
            <div class="text-caption text-grey q-mb-md">
              Ajoutez des catégories et observables pour commencer
            </div>
            <q-btn
              color="primary"
              label="Ajouter une catégorie"
              icon="mdi-plus"
              @click="state.showAddCategoryDialog = true"
            />
          </div>
        </div>
      </q-scroll-area>
    </div>

    <!-- FAB pour ajouter un commentaire -->
    <q-page-sticky v-if="state.isRecording" position="bottom-left" :offset="[18, 18]">
      <q-btn
        round
        color="info"
        icon="mdi-comment-plus"
        size="lg"
        @click="state.showAddCommentDialog = true"
      >
        <q-tooltip>Ajouter un commentaire</q-tooltip>
      </q-btn>
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
            dense
            autofocus
            :rules="[(val) => (val && val.trim().length > 0) || 'Le commentaire ne peut pas être vide']"
            @keyup.enter="methods.addComment"
          />
          <q-input
            v-model="state.newComment.description"
            label="Description (optionnel)"
            outlined
            dense
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
            :disable="!state.newComment.text || !state.newComment.text.trim()"
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
            dense
            autofocus
            @keyup.enter="methods.addCategory"
          />
          <q-select
            v-model="state.newCategory.action"
            :options="[
              { label: 'Discret (événement)', value: 'discrete' },
              { label: 'Continu (toggle)', value: 'continuous' }
            ]"
            label="Type de catégorie"
            outlined
            dense
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

    <!-- Dialog sélection catégorie pour ajout observable -->
    <q-dialog v-model="state.showSelectCategoryDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-secondary text-white">
          <div class="text-h6">Choisir une catégorie</div>
        </q-card-section>

        <q-list separator>
          <q-item
            v-for="category in state.categories"
            :key="category.id"
            clickable
            v-close-popup
            @click="methods.selectCategoryForObservable(category)"
          >
            <q-item-section avatar>
              <q-icon name="mdi-folder" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ category.name }}</q-item-label>
              <q-item-label caption>
                {{ category.children?.length || 0 }} observable(s)
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="mdi-chevron-right" color="grey" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog ajout observable -->
    <q-dialog v-model="state.showAddObservableDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-secondary text-white">
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
            dense
            autofocus
            @keyup.enter="methods.addObservable"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="secondary"
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
        <q-card-section class="bg-info text-white">
          <div class="text-h6">Renommer la catégorie</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.renameCategory.name"
            label="Nouveau nom"
            outlined
            dense
            autofocus
            @keyup.enter="methods.renameCategory"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="info"
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
        <q-card-section class="bg-info text-white">
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
            dense
            autofocus
            @keyup.enter="methods.renameObservable"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="info"
            label="Renommer"
            @click="methods.renameObservable"
            :disable="!state.renameObservable.name"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Recent readings mini-list -->
    <q-expansion-item
      v-if="state.recentReadings.length > 0"
      class="recent-readings bg-grey-2"
      icon="mdi-history"
      label="Derniers relevés"
      :caption="`${state.recentReadings.length} relevé(s) récent(s)`"
      dense
      header-class="text-primary"
    >
      <q-list dense separator class="bg-white">
        <q-item v-for="reading in state.recentReadings" :key="reading.id">
          <q-item-section avatar>
            <q-icon
              :name="methods.getReadingIcon(reading.type)"
              :color="methods.getReadingColor(reading.type)"
              size="sm"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ reading.name || methods.getReadingLabel(reading.type) }}</q-item-label>
            <q-item-label caption>
              {{ methods.formatTime(reading.date) }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>

    <!-- Bottom sheet pour gérer le protocole -->
    <q-dialog v-model="state.showProtocolSheet" position="bottom" full-width>
      <q-card class="protocol-sheet">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            <q-icon name="mdi-cog" class="q-mr-sm" />
            Protocole
          </div>
          <q-space />
          <q-btn flat round dense icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="text-caption text-grey q-mb-md">
            Gérez les catégories et observables de votre chronique
          </div>

          <!-- Liste des catégories -->
          <q-list separator class="protocol-list">
            <template v-for="category in state.categories" :key="category.id">
              <!-- Catégorie header -->
              <q-item class="category-item">
                <q-item-section avatar>
                  <q-icon 
                    name="mdi-folder" 
                    :color="category.action === 'continuous' ? 'accent' : 'primary'" 
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
                  <div class="row q-gutter-xs">
                    <q-btn
                      flat
                      round
                      dense
                      size="sm"
                      icon="mdi-plus"
                      color="positive"
                      @click="methods.openAddObservableForCategory(category)"
                    >
                      <q-tooltip>Ajouter observable</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      size="sm"
                      icon="mdi-pencil"
                      color="info"
                      @click="methods.openRenameCategory(category)"
                    >
                      <q-tooltip>Renommer</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      size="sm"
                      icon="mdi-delete"
                      color="negative"
                      @click="methods.deleteCategory(category)"
                    >
                      <q-tooltip>Supprimer catégorie</q-tooltip>
                    </q-btn>
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
                  <div class="row q-gutter-xs">
                    <q-btn
                      flat
                      round
                      dense
                      size="sm"
                      icon="mdi-pencil"
                      color="info"
                      @click="methods.openRenameObservable(category, observable)"
                    >
                      <q-tooltip>Renommer</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      size="sm"
                      icon="mdi-delete"
                      color="negative"
                      @click="methods.deleteObservable(category, observable)"
                    >
                      <q-tooltip>Supprimer</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </template>

            <!-- Empty state -->
            <q-item v-if="state.categories.length === 0">
              <q-item-section class="text-center text-grey q-pa-md">
                <q-icon name="mdi-folder-alert-outline" size="32px" class="q-mb-sm" />
                <div>Aucune catégorie</div>
                <div class="text-caption">Ajoutez une catégorie pour commencer</div>
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Bouton ajouter catégorie -->
          <q-btn
            color="primary"
            label="Ajouter une catégorie"
            icon="mdi-folder-plus"
            class="full-width q-mt-md"
            unelevated
            @click="methods.openAddCategoryFromSheet"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </DPage>
</template>

<script lang="ts">
/* eslint-disable vue/multi-word-component-names */
import { defineComponent, reactive, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useChronicle } from '@composables/use-chronicle';
import { protocolService } from '@services/protocol.service';
import { observationService } from '@services/observation.service';
import { DPage } from '@components';
import type { IReadingEntity, ReadingType } from '@database/repositories/reading.repository';
import type { IProtocolItemWithChildren } from '@database/repositories/protocol.repository';

export default defineComponent({
  name: 'ObservationPage',
  components: {
    DPage,
  },
  setup() {
    const $q = useQuasar();
    const chronicle = useChronicle();

    const state = reactive({
      categories: [] as IProtocolItemWithChildren[],
      isRecording: false,
      activeObservableByCategory: {} as Record<number, string>,
      recentReadings: [] as IReadingEntity[],
      // Dialogs
      showAddCategoryDialog: false,
      showSelectCategoryDialog: false,
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
      renameCategory: {
        name: '',
      },
      renameObservable: {
        name: '',
      },
    });

    const methods = {
      loadProtocol: () => {
        // Filter and normalize categories - more lenient check
        state.categories = chronicle.sharedState.currentProtocol
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
      },

      loadRecentReadings: () => {
        const readings = chronicle.sharedState.currentReadings;
        state.recentReadings = readings.slice(-5).reverse();

        // Find active observables for continuous categories
        state.categories.forEach((category) => {
          if (category.action === 'continuous') {
            // Find the last DATA reading for this category's observables
            const categoryObservableNames = category.children?.map((o) => o.name) || [];
            const lastDataReading = [...readings]
              .reverse()
              .find((r) => r.type === 'DATA' && categoryObservableNames.includes(r.name || ''));
            
            if (lastDataReading && lastDataReading.name) {
              state.activeObservableByCategory[category.id] = lastDataReading.name;
            }
          }
        });

        // Determine if recording is currently active
        // We look at the LAST reading of type START or STOP to handle multiple sessions correctly
        // Example: START -> STOP -> START -> STOP -> START means recording is active (last is START)
        // Example: START -> STOP -> START -> STOP means recording is stopped (last is STOP)
        const startStopReadings = readings.filter((r) => r.type === 'START' || r.type === 'STOP');
        if (startStopReadings.length > 0) {
          const lastStartStop = startStopReadings[startStopReadings.length - 1];
          state.isRecording = lastStartStop.type === 'START';
        } else {
          // No START/STOP readings yet - not recording
          state.isRecording = false;
        }
      },

      startRecording: async () => {
        await chronicle.methods.startRecording();
        state.isRecording = true;
        methods.loadRecentReadings();
      },

      stopRecording: async () => {
        await chronicle.methods.stopRecording();
        state.isRecording = false;
        state.activeObservableByCategory = {};
        methods.loadRecentReadings();
      },

      togglePause: async () => {
        if (!chronicle.sharedState.isPaused) {
          await chronicle.methods.pauseRecording();
        } else {
          await chronicle.methods.resumeRecording();
        }
        methods.loadRecentReadings();
      },

      toggleObservable: async (category: IProtocolItemWithChildren, observable: IProtocolItemWithChildren) => {
        await chronicle.methods.toggleObservable(observable.name);
        state.activeObservableByCategory[category.id] = observable.name;
        methods.loadRecentReadings();
      },

      pressObservable: async (observable: IProtocolItemWithChildren) => {
        await chronicle.methods.toggleObservable(observable.name);
        methods.loadRecentReadings();
      },

      getReadingIcon: (type: ReadingType): string => {
        const icons: Record<ReadingType, string> = {
          START: 'mdi-play-circle',
          STOP: 'mdi-stop-circle',
          PAUSE_START: 'mdi-pause-circle',
          PAUSE_END: 'mdi-play-circle-outline',
          DATA: 'mdi-circle',
        };
        return icons[type] || 'mdi-circle';
      },

      getReadingColor: (type: ReadingType): string => {
        const colors: Record<ReadingType, string> = {
          START: 'positive',
          STOP: 'negative',
          PAUSE_START: 'warning',
          PAUSE_END: 'positive',
          DATA: 'accent',
        };
        return colors[type] || 'grey';
      },

      getReadingLabel: (type: ReadingType): string => {
        const labels: Record<ReadingType, string> = {
          START: 'Début',
          STOP: 'Fin',
          PAUSE_START: 'Pause',
          PAUSE_END: 'Reprise',
          DATA: 'Data',
        };
        return labels[type] || type;
      },

      formatTime: (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      },

      // Protocol management
      selectCategoryForObservable: (category: IProtocolItemWithChildren) => {
        state.selectedCategory = category;
        state.showAddObservableDialog = true;
      },

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
          await protocolService.addCategory(
            chronicle.sharedState.currentChronicle.id,
            trimmedName,
            state.newCategory.action
          );

          state.showAddCategoryDialog = false;
          state.newCategory.name = '';
          state.newCategory.action = 'continuous';
          await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle.id);
          methods.loadProtocol();
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
        const existingObservable = state.selectedCategory.children?.find(
          (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (existingObservable) {
          $q.notify({
            type: 'warning',
            message: 'Un observable avec ce nom existe déjà dans cette catégorie',
            position: 'top',
          });
          return;
        }

        try {
          const categoryName = state.selectedCategory.name;
          await protocolService.addObservable(
            chronicle.sharedState.currentChronicle.id,
            state.selectedCategory.id,
            trimmedName
          );
          state.showAddObservableDialog = false;
          state.newObservable.name = '';
          state.selectedCategory = null;
          await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle.id);
          methods.loadProtocol();
          $q.notify({
            type: 'positive',
            message: `Observable "${trimmedName}" ajouté à "${categoryName}"`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to add observable:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'ajout de l\'observable',
            position: 'top',
          });
        }
      },

      addComment: async () => {
        if (!chronicle.sharedState.currentChronicle || !state.newComment.text) return;

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
          await protocolService.deleteItem(category.id);
          await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle.id);
          methods.loadProtocol();
          $q.notify({
            type: 'info',
            message: `Catégorie "${categoryName}" supprimée`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to delete category:', error);
        }
      },

      deleteObservable: async (category: IProtocolItemWithChildren, observable: IProtocolItemWithChildren) => {
        if (!chronicle.sharedState.currentChronicle) return;

        try {
          await protocolService.deleteItem(observable.id);
          await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle.id);
          methods.loadProtocol();
          $q.notify({
            type: 'info',
            message: `Observable "${observable.name}" supprimé`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to delete observable:', error);
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
          await protocolService.updateItem(state.selectedCategory.id, { name: trimmedName });
          state.showRenameCategoryDialog = false;
          state.renameCategory.name = '';
          state.selectedCategory = null;
          await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle.id);
          methods.loadProtocol();
          $q.notify({
            type: 'positive',
            message: `Catégorie renommée en "${trimmedName}"`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to rename category:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du renommage',
            position: 'top',
          });
        }
      },

      renameObservable: async () => {
        if (!chronicle.sharedState.currentChronicle || !state.selectedCategory || !state.selectedObservable || !state.renameObservable.name.trim()) return;

        const trimmedName = state.renameObservable.name.trim();
        
        // Vérifier l'unicité du nom dans la catégorie (sauf si c'est le même)
        if (trimmedName.toLowerCase() !== state.selectedObservable.name.toLowerCase()) {
          const existingObservable = state.selectedCategory.children?.find(
            (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
          );
          if (existingObservable) {
            $q.notify({
              type: 'warning',
              message: 'Un observable avec ce nom existe déjà dans cette catégorie',
              position: 'top',
            });
            return;
          }
        }

        try {
          await protocolService.updateItem(state.selectedObservable.id, { name: trimmedName });
          state.showRenameObservableDialog = false;
          state.renameObservable.name = '';
          state.selectedObservable = null;
          state.selectedCategory = null;
          await chronicle.methods.loadChronicle(chronicle.sharedState.currentChronicle.id);
          methods.loadProtocol();
          $q.notify({
            type: 'positive',
            message: `Observable renommé en "${trimmedName}"`,
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to rename observable:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du renommage',
            position: 'top',
          });
        }
      },
    };

    onMounted(() => {
      // Always load protocol and readings on mount
      methods.loadProtocol();
      methods.loadRecentReadings();

      // Resume timer if recording is active and not paused
      if (state.isRecording && !chronicle.sharedState.isPaused) {
        chronicle.methods.startTimer();
      }
    });

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

    return {
      chronicle,
      state,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.timer-toolbar {
  flex: 0 0 auto;
  background: linear-gradient(135deg, var(--primary) 0%, #161d27 100%);
  border-bottom: 3px solid var(--accent);
}

.timer-display {
  font-family: 'Roboto Mono', 'Courier New', monospace;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &.blink {
    animation: blink-animation 1s ease-in-out infinite;
  }
}

@keyframes blink-animation {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.category-card {
  border-radius: 12px;
  border-left: 4px solid var(--primary);
  transition: all 0.2s ease;
  
  &.continuous {
    border-left-color: var(--accent);
  }
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.category-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.03) 0%, transparent 100%);
}

.category-content {
  padding-top: 12px;
}

.observables-container {
  &.row {
    flex-wrap: wrap;
  }
}

.observable-btn {
  min-width: 80px;
  transition: all 0.2s ease;
  
  &.switch-btn {
    border-radius: 20px;
    
    &:not(.disabled) {
      &:active {
        transform: scale(0.95);
      }
    }
  }
  
  &.press-btn {
    border-radius: 8px;
    
    &:not(.disabled) {
      &:active {
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }
    }
  }
}

.empty-state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.recent-readings {
  flex: 0 0 auto;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

// Protocol sheet styles
.protocol-sheet {
  border-radius: 16px 16px 0 0;
  max-height: 70vh;
  overflow-y: auto;
}

.protocol-list {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  max-height: 40vh;
  overflow-y: auto;
}

.category-item {
  background: white;
  margin-bottom: 1px;
}

.observable-item {
  background: rgba(0, 0, 0, 0.02);
}
</style>
