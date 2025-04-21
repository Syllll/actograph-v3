<template>
  <q-drawer
    v-model="drawer.sharedState.showDrawer"
    show-if-above
    :width="250"
    :breakpoint="500"
    elevated
    bordered
    behavior="desktop"
    :class="$q.dark.isActive ? 'bg-secondary' : 'bg-secondary'"
  >
    <div class="fit">
      <div class="fit column q-col-gutter-md">
        <div class="q-mt-md"><q-separator /></div>

        <!-- tools in a row -->
        <div class="column q-mx-md">
          <div class="text-h4 text-weight-bold text-center q-mb-md">Outils</div>
          <div class="row justify-center q-gutter-sm">
            <d-action-btn
              icon="mdi-new-box"
              tooltip="Créer une observation"
              label="Débuter une observation"
            />
            <d-action-btn
              icon="mdi-import"
              tooltip="Charger une observation"
              label="Charger"
            />
            <d-action-btn
              icon="mdi-export"
              tooltip="Exporter une observation"
              label="Exporter"
            />
          </div>
        </div>

        <div class="q-mt-sm"><q-separator /></div>

        <!-- Menu -->
        <q-list>
          <template
            v-for="(menuItem, index) in computedState.menuList"
            :key="index"
          >
            <q-item
              clickable
              :active="menuItem.isActive()"
              v-ripple
              @click="menuItem.action()"
              active-class="active"
              :disable="
                menuItem.disabled ? menuItem.disabled(observation) : false
              "
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

          
        </q-list>

        <q-space />
        
          <div><q-separator /></div>

          <!-- tools in a row -->
        <div class="column q-mx-md">
          <div class="text-h4 text-weight-bold text-center q-mb-md">
            Votre observation
          </div>
          <div class="text-center">
            {{
              observation.sharedState.currentObservation?.name ??
              "Aucune observation n'est chargée"
            }}
          </div>

          <div
            v-if="observation.readings.sharedState.currentReadings"
            class="row q-mt-sm"
          >
            Relevés : {{ observation.readings.sharedState.currentReadings.length }}
          </div>
        </div>
      </div>
    </div>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { menu } from './menu';
import { useDrawer } from './use-drawer';
import { useRouter } from 'vue-router';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  props: {
    showDrawer: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:showDrawer'],
  setup(props) {
    const drawer = useDrawer();
    const router = useRouter();
    const state = reactive({});
    const observation = useObservation();

    const computedState = computed(() => {
      return {
        menuList: menu(router),
      };
    });

    return {
      state,
      computedState,
      drawer,
      observation,
    };
  },
});
</script>

<style scoped lang="scss">
.active {
  color: var(--accent);
}
</style>
