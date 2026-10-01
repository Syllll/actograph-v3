<template>
  <q-drawer
    v-model="drawer.sharedState.showDrawer"
    show-if-above
    :mini="computedState.isMiniRail.value"
    :width="250"
    :mini-width="64"
    :breakpoint="drawerBreakpointPx"
    elevated
    bordered
    behavior="desktop"
    class="bg-secondary"
    :class="{ 'is-mini': computedState.isMiniRail.value }"
  >
    <div class="fit overflow-hidden">
      <div class="fit column">
        <div
          class="row no-wrap q-pt-sm"
          :class="
            computedState.isMiniRail.value
              ? 'justify-center q-px-xs q-pb-xs'
              : computedState.isDesktopDrawer.value
                ? 'items-start q-px-sm q-pb-md'
                : 'justify-center q-px-md q-pb-md'
          "
        >
          <div
            v-show="!computedState.isMiniRail.value"
            class="column items-center"
            :class="computedState.isDesktopDrawer.value ? 'col q-px-sm' : ''"
          >
            <Logo />
            <div
              class="q-mt-xs cursor-pointer full-width row justify-center"
              @click="methods.goToLicense"
            >
              <LicenseBadge />
            </div>
          </div>
          <div v-if="computedState.isDesktopDrawer.value" class="col-auto">
            <q-btn
              flat
              dense
              round
              size="sm"
              color="grey-8"
              :icon="
                computedState.isMiniRail.value
                  ? 'mdi-chevron-right'
                  : 'mdi-chevron-left'
              "
              :aria-label="
                computedState.isMiniRail.value
                  ? $t('drawer.expandMenu')
                  : $t('drawer.collapseMenu')
              "
              :aria-expanded="computedState.isMiniRail.value ? 'false' : 'true'"
              @click="methods.toggleMini"
            >
              <q-tooltip
                anchor="center right"
                self="center left"
                :offset="[8, 0]"
              >
                {{
                  computedState.isMiniRail.value
                    ? $t('drawer.expandMenu')
                    : $t('drawer.collapseMenu')
                }}
              </q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-separator />

        <q-list dense class="q-py-md">
          <q-item
            clickable
            v-ripple
            :aria-label="
              computedState.isMiniRail.value ? $t('chronicle.newChronicle') : undefined
            "
            @click="chronicleActions.createObservation"
          >
            <q-item-section avatar>
              <q-icon name="mdi-plus-circle-outline" size="sm" />
            </q-item-section>
            <q-item-section>
              {{ $t('chronicle.newChronicle') }}
              <q-tooltip v-if="!computedState.isMiniRail.value">
                {{ $t('chronicle.newChronicleTooltip') }}
              </q-tooltip>
            </q-item-section>
            <q-tooltip
              v-if="computedState.isMiniRail.value"
              anchor="center right"
              self="center left"
              :offset="[8, 0]"
            >
              {{ $t('chronicle.newChronicle') }}
            </q-tooltip>
          </q-item>
          <q-item
            clickable
            v-ripple
            :aria-label="
              computedState.isMiniRail.value
                ? $t('chronicle.importFromFile')
                : undefined
            "
            @click="chronicleActions.importObservation"
          >
            <q-item-section avatar>
              <q-icon name="mdi-file-import-outline" size="sm" />
            </q-item-section>
            <q-item-section>
              {{ $t('chronicle.importFromFile') }}
              <q-tooltip v-if="!computedState.isMiniRail.value">
                {{ $t('chronicle.importChronicleTooltip') }}
              </q-tooltip>
            </q-item-section>
            <q-tooltip
              v-if="computedState.isMiniRail.value"
              anchor="center right"
              self="center left"
              :offset="[8, 0]"
            >
              {{ $t('chronicle.importFromFile') }}
            </q-tooltip>
          </q-item>
          <q-item
            clickable
            v-ripple
            :aria-label="
              computedState.isMiniRail.value
                ? $t('chronicle.importFromCloud')
                : undefined
            "
            @click="chronicleActions.openCloud"
          >
            <q-item-section avatar>
              <q-icon name="mdi-cloud-download-outline" size="sm" />
            </q-item-section>
            <q-item-section>
              {{ $t('chronicle.importFromCloud') }}
              <q-tooltip v-if="!computedState.isMiniRail.value">
                {{ $t('chronicle.importFromCloudTooltip') }}
              </q-tooltip>
            </q-item-section>
            <q-tooltip
              v-if="computedState.isMiniRail.value"
              anchor="center right"
              self="center left"
              :offset="[8, 0]"
            >
              {{ $t('chronicle.importFromCloud') }}
            </q-tooltip>
          </q-item>
        </q-list>

        <q-separator />

        <q-scroll-area class="col drawer-nav-scroll">
          <q-list class="q-py-xs">
            <template
              v-for="(menuItem, index) in computedState.menuList.value"
              :key="index"
            >
              <q-item
                clickable
                :active="menuItem.isActive()"
                v-ripple
                :aria-label="
                  computedState.isMiniRail.value ? menuItem.label : undefined
                "
                @click="menuItem.action()"
                active-class="active"
              >
                <q-item-section avatar>
                  <q-icon :name="menuItem.icon" />
                </q-item-section>
                <q-item-section>
                  {{ menuItem.label }}
                </q-item-section>
                <q-tooltip
                  v-if="computedState.isMiniRail.value"
                  anchor="center right"
                  self="center left"
                  :offset="[8, 0]"
                >
                  {{ menuItem.label }}
                </q-tooltip>
              </q-item>
              <q-separator :key="'sep' + index" v-if="menuItem.separator" />
            </template>

            <!-- Active chronicle: grouped card so the open file stands out from global nav -->
            <div
              v-if="observation.sharedState.currentObservation"
              class="chronicle-nav-block"
              role="group"
              :aria-label="computedState.chronicleDisplayName.value ?? ''"
            >
              <q-item class="chronicle-header-item">
                <q-item-section avatar>
                  <q-icon name="mdi-book-open-variant" />
                </q-item-section>
                <q-item-section>
                  <q-item-label lines="1" class="text-weight-medium">
                    {{ computedState.chronicleDisplayName.value ?? '' }}
                  </q-item-label>
                  <q-tooltip
                    v-if="
                      !computedState.isMiniRail.value &&
                      computedState.chronicleNameNeedsTooltip.value
                    "
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
                <q-tooltip
                  v-if="computedState.isMiniRail.value"
                  anchor="center right"
                  self="center left"
                  :offset="[8, 0]"
                >
                  {{ computedState.chronicleDisplayName.value ?? '' }}
                </q-tooltip>
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
                      :aria-label="
                        computedState.isMiniRail.value
                          ? step.tooltip || step.label
                          : undefined
                      "
                      @click="methods.handleNavStep(step)"
                      active-class="active"
                      :disable="step.disabled"
                    >
                      <q-item-section avatar>
                        <q-icon :name="step.icon" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        {{ step.label }}
                        <q-tooltip v-if="!computedState.isMiniRail.value && step.tooltip">
                          {{ step.tooltip }}
                        </q-tooltip>
                      </q-item-section>
                      <q-tooltip
                        v-if="computedState.isMiniRail.value"
                        anchor="center right"
                        self="center left"
                        :offset="[8, 0]"
                      >
                        {{ step.tooltip || step.label }}
                      </q-tooltip>
                    </q-item>
                  </template>

                  <div class="chronicle-actions-separator q-my-xs" />

                  <q-item
                    clickable
                    v-ripple
                    :aria-label="
                      computedState.isMiniRail.value ? $t('chronicle.export') : undefined
                    "
                    @click="chronicleActions.exportObservation"
                  >
                    <q-item-section avatar>
                      <q-icon name="mdi-download" size="sm" />
                    </q-item-section>
                    <q-item-section>{{ $t('chronicle.export') }}</q-item-section>
                    <q-tooltip
                      v-if="computedState.isMiniRail.value"
                      anchor="center right"
                      self="center left"
                      :offset="[8, 0]"
                    >
                      {{ $t('chronicle.export') }}
                    </q-tooltip>
                  </q-item>

                  <q-item
                    clickable
                    v-ripple
                    :aria-label="
                      computedState.isMiniRail.value
                        ? $t('cloud.uploadSection')
                        : undefined
                    "
                    @click="chronicleActions.uploadActiveChronicleToCloud"
                  >
                    <q-item-section avatar>
                      <q-icon name="mdi-cloud-upload-outline" size="sm" />
                    </q-item-section>
                    <q-item-section>{{ $t('cloud.uploadSection') }}</q-item-section>
                    <q-tooltip
                      v-if="computedState.isMiniRail.value"
                      anchor="center right"
                      self="center left"
                      :offset="[8, 0]"
                    >
                      {{ $t('cloud.uploadSection') }}
                    </q-tooltip>
                  </q-item>

                  <q-item
                    clickable
                    v-ripple
                    :aria-label="
                      computedState.isMiniRail.value ? $t('chronicle.saveAs') : undefined
                    "
                    @click="chronicleActions.saveAsObservation"
                  >
                    <q-item-section avatar>
                      <q-icon name="mdi-content-duplicate" size="sm" />
                    </q-item-section>
                    <q-item-section>
                      {{ $t('chronicle.saveAs') }}
                      <q-tooltip v-if="!computedState.isMiniRail.value">
                        {{ $t('chronicle.saveAsTooltip') }}
                      </q-tooltip>
                    </q-item-section>
                    <q-tooltip
                      v-if="computedState.isMiniRail.value"
                      anchor="center right"
                      self="center left"
                      :offset="[8, 0]"
                    >
                      {{ $t('chronicle.saveAs') }}
                    </q-tooltip>
                  </q-item>

                  <q-item
                    clickable
                    v-ripple
                    :aria-label="
                      computedState.isMiniRail.value ? $t('chronicle.merge') : undefined
                    "
                    @click="chronicleActions.mergeObservations"
                  >
                    <q-item-section avatar>
                      <q-icon name="merge_type" size="sm" />
                    </q-item-section>
                    <q-item-section>
                      {{ $t('chronicle.merge') }}
                      <q-tooltip v-if="!computedState.isMiniRail.value">
                        {{ $t('chronicle.mergeTooltip') }}
                      </q-tooltip>
                    </q-item-section>
                    <q-tooltip
                      v-if="computedState.isMiniRail.value"
                      anchor="center right"
                      self="center left"
                      :offset="[8, 0]"
                    >
                      {{ $t('chronicle.merge') }}
                    </q-tooltip>
                  </q-item>
                </q-list>
              </div>
            </div>
          </q-list>
        </q-scroll-area>

        <q-separator />

        <q-list dense class="q-py-md col-auto">
          <q-item
            v-if="computedState.hasAutosaveRestore.value"
            clickable
            v-ripple
            :aria-label="
              computedState.isMiniRail.value ? $t('layout.menuAutosave') : undefined
            "
            @click="methods.restoreAutosave"
          >
            <q-item-section avatar>
              <q-icon name="mdi-backup-restore" size="sm" />
            </q-item-section>
            <q-item-section>{{ $t('layout.menuAutosave') }}</q-item-section>
            <q-tooltip
              v-if="computedState.isMiniRail.value"
              anchor="center right"
              self="center left"
              :offset="[8, 0]"
            >
              {{ $t('layout.menuAutosave') }}
            </q-tooltip>
          </q-item>
          <q-item
            clickable
            v-ripple
            :aria-label="computedState.isMiniRail.value ? $t('drawer.help') : undefined"
            @click="methods.openHelpDialog"
          >
            <q-item-section avatar>
              <q-icon name="help_outline" size="sm" />
            </q-item-section>
            <q-item-section>{{ $t('drawer.help') }}</q-item-section>
            <q-tooltip
              v-if="computedState.isMiniRail.value"
              anchor="center right"
              self="center left"
              :offset="[8, 0]"
            >
              {{ $t('drawer.help') }}
            </q-tooltip>
          </q-item>
        </q-list>

        <q-separator />

        <q-list dense class="col-auto user-bar-list q-py-md">
          <q-item
            clickable
            v-ripple
            class="user-bar-item"
            :aria-label="
              computedState.isMiniRail.value
                ? computedState.accountLabel.value
                : undefined
            "
          >
            <q-item-section avatar>
              <q-avatar
                size="28px"
                color="primary"
                text-color="white"
                icon="person"
              >
                <q-tooltip
                  v-if="!computedState.isMiniRail.value"
                  anchor="top middle"
                  self="bottom middle"
                >
                  {{ $t('drawer.accountMenuTooltip') }}
                </q-tooltip>
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium ellipsis">
                {{ computedState.accountLabel.value }}
                <q-tooltip anchor="top middle" self="bottom middle">
                  {{ computedState.accountLabel.value }}
                </q-tooltip>
              </q-item-label>
              <q-item-label
                v-if="computedState.accountCaption.value"
                caption
                class="ellipsis"
              >
                {{ computedState.accountCaption.value }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center no-wrap q-gutter-xs">
                <q-icon
                  :name="computedState.cloudIndicatorIcon.value"
                  size="20px"
                  color="accent"
                  :aria-label="computedState.cloudIndicatorLabel.value"
                  @click.stop="methods.handleCloudIndicatorClick"
                >
                  <q-tooltip anchor="top middle" self="bottom middle">
                    {{ computedState.cloudIndicatorLabel.value }}
                  </q-tooltip>
                </q-icon>
                <q-icon name="mdi-chevron-up" size="18px" />
              </div>
            </q-item-section>
            <q-tooltip
              v-if="computedState.isMiniRail.value"
              anchor="center right"
              self="center left"
              :offset="[8, 0]"
            >
              {{ computedState.accountLabel.value }}
            </q-tooltip>

            <q-menu
              :anchor="computedState.isMiniRail.value ? 'center right' : 'top left'"
              :self="computedState.isMiniRail.value ? 'center left' : 'bottom left'"
              :offset="computedState.isMiniRail.value ? [8, 0] : [0, 8]"
            >
              <q-list dense style="min-width: 200px">
                <q-item
                  clickable
                  v-close-popup
                  v-ripple
                  @click="methods.openPreferencesDialog"
                >
                  <q-item-section avatar>
                    <q-icon name="settings" />
                  </q-item-section>
                  <q-item-section>{{ $t('drawer.preferences') }}</q-item-section>
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

                <q-separator v-if="computedState.showElectronDevLogout.value" />

                <q-item
                  v-if="computedState.showElectronDevLogout.value"
                  clickable
                  v-close-popup
                  v-ripple
                  @click="methods.logout"
                >
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>{{ $t('layout.closeDevSession') }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>
        </q-list>
      </div>
    </div>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, computed, inject, onMounted, watch } from 'vue';
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
import { getLicenseOwnerLabel } from 'src/utils/license-owner-label';
import Logo from '@lib-improba/components/layouts/Logo.vue';
import LicenseBadge from '@lib-improba/components/layouts/standard/toolbar/license/Index.vue';
import HelpDialog from '@pages/userspace/_components/HelpDialog.vue';
import PreferencesDialog from '@pages/userspace/_components/PreferencesDialog.vue';
import ChangeLicenseDialog from '@pages/userspace/_components/ChangeLicenseDialog.vue';
import CloudDisconnectDialog from '@pages/userspace/home/_components/cloud/CloudDisconnectDialog.vue';
import CloseChronicleDialog from './CloseChronicleDialog.vue';

/** Same value as q-drawer breakpoint: rail toggle is desktop-only below this. */
const DRAWER_BREAKPOINT_PX = 500;

export default defineComponent({
  components: {
    Logo,
    LicenseBadge,
  },
  setup() {
    const drawer = useDrawer();
    const quasar = useQuasar();
    const router = useRouter();
    const auth = useAuth(router);
    const license = useLicense();
    const { isStudentAccess, isProfessionalAccess } = license;
    const cloud = useCloud();
    const observation = useObservation();
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
        return (
          getLicenseOwnerLabel(license.sharedState.license?.owner) ||
          t('drawer.localAccount')
        );
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
      // JWT logout is for local Electron dev (auth flows); end users auto-login at startup.
      showElectronDevLogout: computed(
        () => process.env.MODE === 'electron' && process.env.DEV,
      ),
      cloudIndicatorIcon: computed(() =>
        cloud.sharedState.isAuthenticated
          ? 'mdi-cloud-outline'
          : 'mdi-cloud-off-outline',
      ),
      cloudIndicatorLabel: computed(() => {
        void locale.value;
        return cloud.sharedState.isAuthenticated
          ? t('drawer.cloudConnected')
          : t('drawer.cloudDisconnected');
      }),
      isDesktopDrawer: computed(
        () => quasar.screen.width >= DRAWER_BREAKPOINT_PX,
      ),
      isMiniRail: computed(
        () => drawer.sharedState.mini && quasar.screen.width >= DRAWER_BREAKPOINT_PX,
      ),
    };

    watch(
      () => computedState.isDesktopDrawer.value,
      (isDesktop) => {
        if (!isDesktop && drawer.sharedState.mini) {
          drawer.sharedState.mini = false;
        }
      },
    );

    onMounted(() => {
      void cloud.methods.init();
    });

    const methods = {
      toggleMini() {
        if (!computedState.isDesktopDrawer.value) {
          return;
        }
        drawer.sharedState.mini = !drawer.sharedState.mini;
      },
      handleCloudIndicatorClick(event: MouseEvent) {
        if (!cloud.sharedState.isAuthenticated) {
          event.stopPropagation();
          chronicleActions.openCloud();
          return;
        }

        event.stopPropagation();
        createDialog({
          component: CloudDisconnectDialog,
        });
      },
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

      confirmCloseChronicle: async () => {
        const name = observation.sharedState.currentObservation?.name;
        if (!name) return;

        const confirmed = await createDialog({
          component: CloseChronicleDialog,
          componentProps: { chronicleName: name },
        });
        if (!confirmed) return;

        observation.methods.closeObservation();
        if (router.currentRoute.value.name !== 'user_home') {
          void router.push({ name: 'user_home' });
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
        createDialog({
          component: ChangeLicenseDialog,
          componentProps: {},
          persistent: true,
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
      drawerBreakpointPx: DRAWER_BREAKPOINT_PX,
    };
  },
});
</script>

<style scoped lang="scss">
.active {
  color: var(--accent);
}

.chronicle-nav-block {
  margin: 4px 8px 8px;
  padding: 4px 0;
  border-radius: 8px;
  overflow: hidden;
  /* accent-lowest lightens to white; mix keeps a readable peach on light and dark. */
  background: color-mix(in srgb, var(--accent) 14%, var(--secondary));
}

.chronicle-subitems {
  box-shadow: inset 3px 0 0 var(--accent);
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
  /* 8px + the 8px card gutter = 16px, same as Mes chroniques above. */
  padding-left: 8px;
  padding-right: 4px;
}

.chronicle-actions-separator {
  border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
}

.user-bar-list {
  min-width: 0;
  max-width: 100%;
}

.user-bar-item {
  min-width: 0;
}

.is-mini {
  .chronicle-nav-block {
    margin-left: 0;
    margin-right: 0;
    border-radius: 0;
  }

  .chronicle-subitems {
    box-shadow: none;
  }

  .chronicle-header-item {
    padding-left: 8px;
    padding-right: 8px;
  }

  :deep(.q-item) {
    min-width: 0;
    padding-left: 8px;
    padding-right: 8px;
    justify-content: center;
  }

  :deep(.q-item__section--avatar) {
    min-width: 0;
    padding-right: 0;
    justify-content: center;
  }

  :deep(.q-item__section:not(.q-item__section--avatar)) {
    display: none;
  }
}

</style>
