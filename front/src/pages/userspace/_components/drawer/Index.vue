<template>
  <q-drawer
    v-model="drawer.sharedState.showDrawer"
    show-if-above
    :width="250"
    :breakpoint="500"
    elevated
    bordered
    behavior="desktop"
    class="bg-secondary"
  >
    <div class="fit">
      <div class="fit column q-pt-md">
        <!-- tools in a row -->
        <div class="column q-mx-md q-mb-md">
          <div class="row justify-center q-gutter-sm">
            <d-action-btn
              icon="mdi-new-box"
              :tooltip="$t('chronicle.newChronicleTooltip')"
              :label="$t('chronicle.newChronicle')"
              @click="chronicleActions.createObservation"
            />
            <d-action-btn
              icon="mdi-file-import"
              :tooltip="$t('chronicle.importChronicleTooltip')"
              :label="$t('chronicle.importFromFile')"
              @click="chronicleActions.importObservation"
            />
          </div>
        </div>

        <q-separator spaced />

        <!-- Menu -->
        <q-list>
          <!-- Accueil -->
          <template
            v-for="(menuItem, index) in computedState.menuList.value"
            :key="index"
          >
            <q-item
              clickable
              :active="menuItem.isActive()"
              v-ripple
              @click="menuItem.action()"
              active-class="active"
            >
              <q-item-section avatar>
                <q-icon :name="menuItem.icon" />
              </q-item-section>
              <q-item-section>
                {{ menuItem.label }}
              </q-item-section>
            </q-item>
            <q-separator :key="'sep' + index" v-if="menuItem.separator" />
          </template>

          <!-- Chronique active avec sous-menus -->
          <template v-if="observation.sharedState.currentObservation">
            <q-expansion-item
              :default-opened="true"
            >
              <template v-slot:header>
                <q-item-section avatar>
                  <q-icon name="mdi-book-open-variant" />
                </q-item-section>
                <q-item-section>
                  <div class="row items-center">
                    <q-tooltip>
                      {{ observation.sharedState.currentObservation.name }}
                    </q-tooltip>
                    <span 
                      class="text-truncate" 
                      style="max-width: 200px"
                    >
                      {{ computedState.chronicleDisplayName.value ?? '' }}
                    </span>
                  </div>
                </q-item-section>
              </template>

              <!-- Sous-menus navigation -->
              <q-list>
                <template
                  v-for="step in chronicleNav.steps.value"
                  :key="step.key"
                >
                  <q-item
                    clickable
                    :active="step.isActive()"
                    v-ripple
                    @click="methods.handleNavStep(step)"
                    active-class="active"
                    :disable="step.disabled"
                    class="q-pl-lg"
                  >
                    <q-item-section avatar>
                      <q-icon :name="step.icon" />
                    </q-item-section>
                    <q-item-section>
                      {{ step.label }}
                      <q-tooltip v-if="step.tooltip">
                        {{ step.tooltip }}
                      </q-tooltip>
                    </q-item-section>
                  </q-item>
                </template>

                <!-- Actions chronique (export, enregistrer sous, fusionner) -->
                <q-item
                  clickable
                  v-ripple
                  @click="chronicleActions.exportObservation"
                  class="q-pl-lg"
                >
                  <q-item-section avatar>
                    <q-icon name="mdi-download" />
                  </q-item-section>
                  <q-item-section>{{ $t('chronicle.export') }}</q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-ripple
                  @click="chronicleActions.saveAsObservation"
                  class="q-pl-lg"
                >
                  <q-item-section avatar>
                    <q-icon name="mdi-content-save-as" />
                  </q-item-section>
                  <q-item-section>
                    {{ $t('chronicle.saveAs') }}
                    <q-tooltip>{{ $t('chronicle.saveAsTooltip') }}</q-tooltip>
                  </q-item-section>
                </q-item>

                <q-item
                  clickable
                  v-ripple
                  @click="chronicleActions.mergeObservations"
                  class="q-pl-lg"
                >
                  <q-item-section avatar>
                    <q-icon name="merge_type" />
                  </q-item-section>
                  <q-item-section>
                    {{ $t('chronicle.merge') }}
                    <q-tooltip>{{ $t('chronicle.mergeTooltip') }}</q-tooltip>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-expansion-item>
          </template>
        </q-list>

        <q-space />

        <!-- Aide et Préférences -->
        <div class="column q-px-md q-pb-md">
          <q-btn
            flat
            icon="help_outline"
            :label="$t('drawer.help')"
            class="full-width justify-start"
            @click="methods.openHelpDialog"
          />
          <q-btn
            flat
            icon="settings"
            :label="$t('drawer.preferences')"
            class="full-width justify-start"
            @click="methods.openPreferencesDialog"
          />
        </div>
      </div>
    </div>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { menu } from './menu';
import { useDrawer } from 'src/composables/use-drawer';
import { useRouter } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useI18n } from 'vue-i18n';
import { useChronicleActions } from 'src/composables/use-chronicle-actions';
import { useChronicleNavigation, type ChronicleNavStep } from 'src/composables/use-chronicle-navigation';
import { useNotifications } from 'src/composables/use-notifications';
import HelpDialog from '@pages/userspace/_components/HelpDialog.vue';
import PreferencesDialog from '@pages/userspace/_components/PreferencesDialog.vue';

export default defineComponent({
  setup() {
    const drawer = useDrawer();
    const router = useRouter();
    const observation = useObservation();
    const { t, locale } = useI18n();
    const chronicleActions = useChronicleActions();
    const chronicleNav = useChronicleNavigation();
    const notifications = useNotifications();

    const computedState = {
      menuList: computed(() => {
        void locale.value;
        return menu(router, t);
      }),
      chronicleDisplayName: computed(() => {
        const name = observation.sharedState.currentObservation?.name;
        if (!name) return '';
        return name.trim();
      }),
    };

    const methods = {
      handleNavStep(step: ChronicleNavStep) {
        if (step.disabled) {
          if (step.tooltip) {
            if (step.key === 'graph') {
              notifications.methods.showGraphWarning();
            } else if (step.key === 'statistics') {
              notifications.methods.showStatsWarning();
            } else {
              notifications.methods.warning(step.tooltip);
            }
          }
        } else {
          chronicleNav.navigateTo(step);
        }
      },

      openHelpDialog: () => {
        createDialog({
          component: HelpDialog,
          componentProps: {},
          persistent: true,
        });
      },

      openPreferencesDialog: () => {
        createDialog({
          component: PreferencesDialog,
          componentProps: {},
          persistent: true,
        });
      },
    };

    return {
      methods,
      computedState,
      drawer,
      observation,
      chronicleActions,
      chronicleNav,
    };
  },
});
</script>

<style scoped lang="scss">
.active {
  color: var(--accent);
}
</style>
