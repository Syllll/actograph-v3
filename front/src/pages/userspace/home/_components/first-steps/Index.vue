<template>
  <div class="first-steps fit column">
    <q-scroll-area class="col">
      <div class="column">
        <!-- Section : Démarrage rapide -->
        <div class="quick-start-section q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-md">Démarrage rapide</div>
          <div class="row justify-center">
            <DSubmitBtn
              label="Charger l'exemple"
              @click="methods.cloneAndLoadExampleObservation()"
            />
          </div>
        </div>

        <!-- Section : Documentation et aide -->
        <div class="help-section q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-md">
            Documentation
          </div>
          <div class="column q-gutter-sm">
            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/software/description')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-book-open-variant" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Didacticiel "Premiers pas"</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/software/install')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-file-document-outline" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Documentation</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/software/tutorial')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-school-outline" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Tutoriels</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/faq')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-help-circle-outline" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>FAQ</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>
          </div>
        </div>

        <!-- Section : Liens externes -->
        <div class="help-section q-pa-md q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-md">
            En savoir plus
          </div>
          <div class="column q-gutter-sm">
            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-web" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Site ActoGraph.io</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>
          </div>
        </div>

        <!-- Section : Informations légales -->
        <div class="help-section q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-md">
            Informations
          </div>
          <div class="column q-gutter-sm">
            <q-item
              clickable
              v-ripple
              @click="methods.openExternalLink('https://www.actograph.io/fr/contact')"
              class="help-link"
            >
              <q-item-section avatar>
                <q-icon name="mdi-email-outline" size="sm" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-body2">Contact</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="open_in_new" size="xs" color="primary" />
              </q-item-section>
            </q-item>
          </div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { DSubmitBtn } from '@lib-improba/components';

export default defineComponent({
  name: 'FirstSteps',
  components: {
    DSubmitBtn,
  },
  setup() {
    const observation = useObservation();

    const methods = {
      cloneAndLoadExampleObservation: async () => {
        const exampleObservation =
          await observation.methods.cloneExampleObservation();
        await observation.methods.loadObservation(exampleObservation.id);
      },

      openExternalLink: (url: string) => {
        // Check if we're in Electron environment
        if (window.api && window.api.openExternal) {
          window.api.openExternal(url);
        } else {
          // Fallback for web environment
          window.open(url, '_blank');
        }
      },
    };

    return {
      observation,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.first-steps {
  .quick-start-section {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }

  .help-section {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }

  .help-link {
    border-radius: 0.25rem;
    padding: 0.5rem;
    min-height: auto;
    
    &:hover {
      background-color: rgba(31, 41, 55, 0.1); // primary color with 10% opacity
    }
  }
}
</style>
