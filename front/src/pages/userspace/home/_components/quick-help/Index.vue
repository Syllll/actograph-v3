<template>
  <div class="quick-help">
    <div class="help-header row items-center justify-between q-mb-md">
      <div class="text-subtitle1 text-weight-bold text-primary">
        🔗 Raccourcis
      </div>
    </div>

    <div class="shortcuts-list">
      <q-item
        v-for="shortcut in stateless.shortcuts"
        :key="shortcut.label"
        clickable
        v-ripple
        class="shortcut-item"
        @click="methods.openLink(shortcut.url)"
      >
        <q-item-section avatar>
          <q-icon :name="shortcut.icon" color="primary" size="sm" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="shortcut-label">{{ shortcut.label }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="mdi-open-in-new" size="xs" color="grey-6" />
        </q-item-section>
      </q-item>
    </div>

    <q-separator class="q-my-md" />

    <!-- Tip du jour -->
    <div class="tip-section">
      <div class="tip-header row items-center q-mb-sm">
        <q-icon name="mdi-lightbulb-outline" color="accent" size="sm" class="q-mr-xs" />
        <span class="text-caption text-weight-bold text-accent">Conseil</span>
      </div>
      <div class="tip-content text-body2 text-grey-7">
        {{ computedState.currentTip.value }}
      </div>
    </div>

    <q-separator class="q-my-md" />

    <!-- Info licence -->
    <div class="license-info">
      <div class="text-caption text-grey-6 q-mb-xs">
        Version {{ stateless.appVersion }}
      </div>
      <div class="text-caption text-grey-6">
        {{ licenseName }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from 'vue';
import { useLicense } from 'src/composables/use-license';
import { LicenseTypeEnum } from '@services/security/interface';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'QuickHelp',
  setup() {
    const license = useLicense();
    const observation = useObservation();
    const tipIndex = ref(0);

    const stateless = {
      appVersion: process.env.APP_VERSION || '3.0',
      shortcuts: [
        {
          label: 'Documentation',
          icon: 'mdi-book-open-variant',
          url: 'https://www.actograph.io/fr/software/description',
        },
        {
          label: 'Tutoriels',
          icon: 'mdi-school-outline',
          url: 'https://www.actograph.io/fr/software/tutorial',
        },
        {
          label: 'FAQ',
          icon: 'mdi-help-circle-outline',
          url: 'https://www.actograph.io/fr/faq',
        },
        {
          label: 'Contact',
          icon: 'mdi-email-outline',
          url: 'https://www.actograph.io/fr/contact',
        },
      ],
      tips: [
        'Exportez régulièrement vos chroniques pour les sauvegarder.',
        'Utilisez des catégories pour organiser vos observables.',
        'Le graphe devient disponible dès le premier relevé enregistré.',
        'Vous pouvez importer des chroniques au format .chronic ou .jchronic.',
        'Les statistiques vous permettent d\'analyser vos données en profondeur.',
      ],
    };

    const licenseName = computed(() => {
      if (!license.sharedState.license) {
        return 'Accès étudiant';
      }
      const type = license.sharedState.license.type;
      switch (type) {
        case LicenseTypeEnum.Ultimate:
          return 'Licence Ultimate';
        case LicenseTypeEnum.Support:
          return 'Licence Support';
        case LicenseTypeEnum.Student:
          return 'Accès étudiant';
        default:
          return 'Licence professionnelle';
      }
    });

    const computedState = {
      currentTip: computed(() => {
        // Afficher un tip contextuel si possible
        const hasChronicle = !!observation.sharedState.currentObservation;
        const hasReadings = observation.readings.sharedState.currentReadings.length > 0;

        if (!hasChronicle) {
          return 'Créez ou importez une chronique pour commencer vos observations.';
        }
        if (!hasReadings) {
          return 'Commencez par configurer votre protocole, puis enregistrez vos premiers relevés.';
        }

        // Sinon, tip aléatoire
        return stateless.tips[tipIndex.value % stateless.tips.length];
      }),
    };

    const methods = {
      openLink: (url: string) => {
        if (window.api && window.api.openExternal) {
          window.api.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      },
    };

    onMounted(() => {
      // Changer de tip toutes les 30 secondes
      tipIndex.value = Math.floor(Math.random() * stateless.tips.length);
      setInterval(() => {
        tipIndex.value = (tipIndex.value + 1) % stateless.tips.length;
      }, 30000);
    });

    return {
      stateless,
      licenseName,
      computedState,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.quick-help {
  background: var(--background);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(31, 41, 55, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.shortcuts-list {
  margin: 0 -0.5rem;
}

.shortcut-item {
  border-radius: 0.5rem;
  min-height: 40px;
  padding: 0.5rem;
  
  &:hover {
    background: rgba(31, 41, 55, 0.05);
  }
}

.shortcut-label {
  font-size: 0.85rem;
}

.tip-section {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(249, 115, 22, 0.1) 100%);
  border-radius: 0.5rem;
  padding: 0.75rem;
  border-left: 3px solid var(--accent);
}

.tip-content {
  line-height: 1.4;
}

.license-info {
  margin-top: auto;
  text-align: center;
  padding-top: 0.5rem;
}
</style>

