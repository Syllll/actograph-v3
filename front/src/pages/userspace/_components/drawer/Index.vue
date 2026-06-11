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
    <div class="fit overflow-hidden">
      <div class="fit column">
        <div class="column items-center q-px-md q-py-md">
          <Logo />
          <div
            class="q-mt-xs cursor-pointer full-width row justify-center"
            @click="methods.goToLicense"
          >
            <LicenseBadge />
          </div>
        </div>

        <q-separator />

        <div class="column q-mx-md q-py-sm">
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

        <q-separator />

        <q-list class="q-py-xs">
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

              <div class="chronicle-subitems">
                <q-list dense>
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
                    >
                      <q-item-section avatar>
                        <q-icon :name="step.icon" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        {{ step.label }}
                        <q-tooltip v-if="step.tooltip">
                          {{ step.tooltip }}
                        </q-tooltip>
                      </q-item-section>
                    </q-item>
                  </template>

                  <div class="chronicle-actions-separator q-my-xs" />

                  <q-item
                    clickable
                    v-ripple
                    @click="chronicleActions.exportObservation"
                  >
                    <q-item-section avatar>
                      <q-icon name="mdi-download" size="sm" />
                    </q-item-section>
                    <q-item-section>{{ $t('chronicle.export') }}</q-item-section>
                  </q-item>

                  <q-item
                    clickable
                    v-ripple
                    @click="chronicleActions.saveAsObservation"
                  >
                    <q-item-section avatar>
                      <q-icon name="mdi-content-save-edit" size="sm" />
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
                  >
                    <q-item-section avatar>
                      <q-icon name="merge_type" size="sm" />
                    </q-item-section>
                    <q-item-section>
                      {{ $t('chronicle.merge') }}
                      <q-tooltip>{{ $t('chronicle.mergeTooltip') }}</q-tooltip>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-expansion-item>
          </template>
        </q-list>

        <q-space />

        <q-separator />

        <q-list dense class="q-py-xs">
          <q-item clickable v-ripple @click="methods.openPreferencesDialog">
            <q-item-section avatar>
              <q-icon name="settings" />
            </q-item-section>
            <q-item-section>{{ $t('drawer.preferencesDisplay') }}</q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="methods.openHelpDialog">
            <q-item-section avatar>
              <q-icon name="help_outline" />
            </q-item-section>
            <q-item-section>{{ $t('drawer.help') }}</q-item-section>
          </q-item>
        </q-list>

        <q-separator />

        <div class="user-bar q-px-sm q-py-xs">
          <div class="row items-center no-wrap cursor-pointer user-bar-trigger" v-ripple>
            <q-avatar size="28px" color="primary" text-color="white" icon="person" />
            <div class="col q-ml-sm column justify-center" style="min-width: 0">
              <div class="text-weight-medium text-truncate user-name">
                {{ computedState.accountLabel.value }}
              </div>
              <div
                v-if="computedState.accountCaption.value"
                class="text-caption text-grey-7 text-truncate"
              >
                {{ computedState.accountCaption.value }}
              </div>
            </div>
            <q-icon name="mdi-chevron-up" size="18px" class="q-ml-xs" />
            <q-tooltip anchor="top middle" self="bottom middle">
              {{ $t('drawer.accountMenuTooltip') }}
            </q-tooltip>

            <q-menu
              anchor="top left"
              self="bottom left"
              :offset="[0, 8]"
            >
              <q-list dense style="min-width: 200px">
                <q-item
                  v-if="computedState.hasAutosaveRestore.value"
                  clickable
                  v-close-popup
                  v-ripple
                  @click="methods.restoreAutosave"
                >
                  <q-item-section avatar>
                    <q-icon name="mdi-backup-restore" />
                  </q-item-section>
                  <q-item-section>{{ $t('layout.menuAutosave') }}</q-item-section>
                </q-item>

                <q-item
                  v-if="computedState.isElectron.value"
                  clickable
                  v-close-popup
                  v-ripple
                  @click="methods.changeLicense"
                >
                  <q-item-section avatar>
                    <q-icon name="mdi-card-account-details-outline" />
                  </q-item-section>
                  <q-item-section>{{ $t('drawer.changeLicense') }}</q-item-section>
                </q-item>

                <q-separator />

                <q-item
                  clickable
                  v-close-popup
                  v-ripple
                  @click="methods.logout"
                >
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>{{ $t('layout.menuQuit') }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </div>
        </div>
      </div>
    </div>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, computed, inject, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { menu } from './menu';
import { useDrawer } from 'src/composables/use-drawer';
import { useRouter } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useI18n } from 'vue-i18n';
import { useChronicleActions } from 'src/composables/use-chronicle-actions';
import { useChronicleNavigation, type ChronicleNavStep } from 'src/composables/use-chronicle-navigation';
import { useNotifications } from 'src/composables/use-notifications';
import { useAuth } from '@lib-improba/composables/use-auth';
import { useLicense } from 'src/composables/use-license';
import { useCloud } from 'src/composables/use-cloud';
import Logo from '@lib-improba/components/layouts/Logo.vue';
import LicenseBadge from '@lib-improba/components/layouts/standard/toolbar/license/Index.vue';
import HelpDialog from '@pages/userspace/_components/HelpDialog.vue';
import PreferencesDialog from '@pages/userspace/_components/PreferencesDialog.vue';

export default defineComponent({
  components: {
    Logo,
    LicenseBadge,
  },
  setup() {
    const drawer = useDrawer();
    const router = useRouter();
    const auth = useAuth(router);
    const license = useLicense();
    const { isStudentAccess, isProfessionalAccess } = license;
    const cloud = useCloud();
    const observation = useObservation();
    const $q = useQuasar();
    const { t, locale } = useI18n();
    const chronicleActions = useChronicleActions();
    const chronicleNav = useChronicleNavigation();
    const notifications = useNotifications();
    const autosaveRestore = inject<(() => void | Promise<void>) | undefined>(
      'autosaveRestore'
    );

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
      accountLabel: computed(() => {
        void locale.value;
        if (cloud.sharedState.isAuthenticated && cloud.sharedState.currentEmail) {
          return cloud.sharedState.currentEmail;
        }
        const owner = license.sharedState.license?.owner;
        if (owner) {
          return owner;
        }
        return t('drawer.localAccount');
      }),
      accountCaption: computed(() => {
        void locale.value;
        if (isProfessionalAccess.value) {
          return t('licenseUi.accessProfessional');
        }
        if (isStudentAccess.value) {
          return t('licenseUi.accessStudent');
        }
        return '';
      }),
      hasAutosaveRestore: computed(
        () => process.env.MODE === 'electron' && Boolean(autosaveRestore),
      ),
      isElectron: computed(() => process.env.MODE === 'electron'),
    };

    onMounted(() => {
      void cloud.methods.init();
    });

    const methods = {
      goToLicense: () => {
        void router.push({ name: 'user_license' });
      },
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

      restoreAutosave: async () => {
        if (!autosaveRestore) {
          return;
        }

        try {
          await autosaveRestore();
        } catch (error) {
          console.error('Error in autosave restore:', error);
        }
      },

      changeLicense: () => {
        $q.dialog({
          class: 'actograph-dialog',
          title: t('drawer.changeLicenseTitle'),
          message: t('drawer.changeLicenseMessage'),
          cancel: true,
          persistent: true,
          ok: {
            label: t('drawer.changeLicenseConfirm'),
            color: 'primary',
          },
        }).onOk(() => {
          license.methods.clearAccess();
          void router.replace({ name: 'gateway_choose-version' });
        });
      },

      logout: () => {
        auth.methods.logout();
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

.chronicle-subitems {
  margin-left: 20px;
  padding-left: 4px;
  border-left: 2px solid rgba(0, 0, 0, 0.12);
}

.chronicle-actions-separator {
  border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
}

.user-bar-trigger {
  border-radius: 6px;
  padding: 6px 8px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.user-name {
  max-width: 100%;
}
</style>
