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

        <q-scroll-area class="col drawer-nav-scroll">
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
              <q-item class="chronicle-header-item">
                <q-item-section avatar>
                  <q-icon name="mdi-book-open-variant" />
                </q-item-section>
                <q-item-section>
                  <q-item-label lines="1">
                    {{ computedState.chronicleDisplayName.value ?? '' }}
                  </q-item-label>
                  <q-tooltip
                    v-if="computedState.chronicleNameNeedsTooltip.value"
                    anchor="center right"
                    self="center left"
                  >
                    {{ observation.sharedState.currentObservation.name }}
                  </q-tooltip>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="close"
                    color="grey-7"
                    :aria-label="$t('chronicle.closeActiveTooltip')"
                    @click.stop="methods.confirmCloseChronicle"
                  >
                    <q-tooltip>{{ $t('chronicle.closeActiveTooltip') }}</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>

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
            </template>
          </q-list>
        </q-scroll-area>

        <q-separator />

        <q-list dense class="q-py-xs col-auto">
          <q-item
            clickable
            v-ripple
            class="relative-position"
            @click="methods.openPreferencesDialog"
          >
            <q-item-section avatar>
              <q-icon name="settings" />
            </q-item-section>
            <q-item-section>{{ $t('drawer.preferencesDisplay') }}</q-item-section>
          </q-item>
          <q-item
            clickable
            v-ripple
            class="relative-position"
            @click="methods.openHelpDialog"
          >
            <q-item-section avatar>
              <q-icon name="help_outline" />
            </q-item-section>
            <q-item-section>{{ $t('drawer.help') }}</q-item-section>
          </q-item>
        </q-list>

        <q-separator />

        <div class="user-bar q-px-sm q-py-xs col-auto">
          <div
            class="row items-center no-wrap cursor-pointer user-bar-trigger relative-position"
            v-ripple
          >
            <q-avatar
              size="28px"
              color="primary"
              text-color="white"
              icon="person"
              class="user-bar-avatar"
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                {{ $t('drawer.accountMenuTooltip') }}
              </q-tooltip>
            </q-avatar>
            <div class="user-bar-text q-ml-sm">
              <div class="text-weight-medium ellipsis user-name">
                {{ computedState.accountLabel.value }}
                <q-tooltip anchor="top middle" self="bottom middle">
                  {{ computedState.accountLabel.value }}
                </q-tooltip>
              </div>
              <div
                v-if="computedState.accountCaption.value"
                class="text-caption text-grey-7 ellipsis"
              >
                {{ computedState.accountCaption.value }}
              </div>
            </div>
            <q-icon
              name="mdi-chevron-up"
              size="18px"
              class="user-menu-chevron q-ml-xs"
            />

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

                <q-separator
                  v-if="computedState.hasAutosaveRestore.value || computedState.isElectron.value"
                />

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
import securityService from '@services/security/index.service';
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
      chronicleNameNeedsTooltip: computed(() => {
        const name = observation.sharedState.currentObservation?.name?.trim();
        return (name?.length ?? 0) > 14;
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

      confirmCloseChronicle: () => {
        const name = observation.sharedState.currentObservation?.name;
        if (!name) return;

        $q.dialog({
          class: 'actograph-dialog',
          title: t('chronicle.closeActiveTitle'),
          message: t('chronicle.closeActiveMessage', { name }),
          cancel: {
            label: t('dialogs.cancel'),
            flat: true,
          },
          ok: {
            label: t('chronicle.closeActiveConfirm'),
            color: 'negative',
          },
          persistent: true,
        }).onOk(() => {
          observation.methods.closeObservation();
          if (router.currentRoute.value.name !== 'user_home') {
            void router.push({ name: 'user_home' });
          }
        });
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
          return securityService
            .resetElectronAccess()
            .then(async () => {
              license.methods.clearAccess();
              await router.replace({ name: 'gateway_choose-version' });
            })
            .catch((error) => {
              console.error('Error resetting license access:', error);
              $q.notify({
                type: 'negative',
                message: t('drawer.changeLicenseError'),
              });
              return Promise.reject(error);
            });
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

.drawer-nav-scroll {
  min-height: 0;
  min-width: 0;
  max-width: 100%;

  :deep(.q-scrollarea__content) {
    width: 100%;
    max-width: 100%;
  }
}

.chronicle-header-item {
  padding-right: 4px;
}

.chronicle-actions-separator {
  border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
}

.user-bar {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.user-bar-trigger {
  border-radius: 6px;
  padding: 6px 8px;
  width: 100%;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.user-bar-avatar {
  flex: 0 0 auto;
}

.user-bar-text {
  flex: 1 1 auto;
  min-width: 0;
}

.user-menu-chevron {
  flex: 0 0 auto;
}
</style>
