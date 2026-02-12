# Plan d'implémentation - Application Mobile ActoGraph

> **Date** : 28 décembre 2025  
> **Objectif** : Refonte complète de l'application mobile avec graph d'activité complet  
> **Stratégie** : Partage du code graph via `packages/graph/`

---

## ⚠️ ARCHITECTURE - IMPORTANT

### Structure des dossiers (INCHANGÉE)

```
actograph-v3/
├── api/                    # Backend NestJS (INCHANGÉ)
├── front/                  # Application desktop/web Quasar (INCHANGÉ sauf graph)
│   ├── src/
│   │   ├── pages/          # Pages desktop (INCHANGÉES)
│   │   ├── components/     # Composants desktop (INCHANGÉS)
│   │   ├── services/       # Services API REST (INCHANGÉS)
│   │   └── composables/    # Composables desktop (INCHANGÉS)
│   └── ...
├── mobile/                 # 📱 Application mobile Capacitor (À MODIFIER)
│   ├── src/
│   │   ├── pages/          # Pages mobile (à refaire)
│   │   ├── layouts/        # Layout mobile (à modifier)
│   │   ├── services/       # Services SQLite (existants)
│   │   ├── database/       # Repositories SQLite (existants)
│   │   └── composables/    # Composables mobile (à créer)
│   └── ...
└── packages/
    ├── core/               # Types, enums, validation (EXISTANT)
    └── graph/              # 🆕 Composant Graph Pixi.js PARTAGÉ
```

### Ce qu'on fait / Ce qu'on NE fait PAS

| ✅ ON FAIT | ❌ ON NE FAIT PAS |
|-----------|-------------------|
| Garder `mobile/` comme dossier séparé | ~~Créer `front/src/mobile/`~~ |
| Modifier les fichiers dans `mobile/src/` | ~~Déplacer le code mobile dans front/~~ |
| Créer `packages/graph/` pour partager le graph | ~~Dupliquer le code du graph~~ |
| Utiliser `packages/graph/` depuis front/ ET mobile/ | ~~Avoir deux implémentations différentes du graph~~ |

### Pourquoi cette architecture ?

1. **`mobile/`** reste une **application Quasar/Capacitor indépendante**
2. **`front/`** reste une **application Quasar desktop/web indépendante**
3. **`packages/graph/`** permet de **partager le graph Pixi.js** entre les deux
4. **Zéro régression** sur front/ car on ne touche pas à sa structure

---

## 📋 Résumé exécutif

### Objectifs
1. **Menu du bas** : Accueil, Protocol, Observation, Graph
2. **Header** : Accès aux paramètres/profil à droite
3. **Gestion des accès** : Protocol, Observation et Graph désactivés sans chronique chargée
4. **Page d'accueil** : Créer ou charger une chronique depuis la DB SQLite
5. **Couleurs** : Alignées sur `front/src/css/_colors.scss`
6. **Protocol** : Vue/édition simplifiée du protocole
7. **Observation** : Mode calendrier uniquement (pas vidéo/audio)
8. **Graph** : **Graph d'activité COMPLET** (même rendu que front)

### Architecture retenue
- **`packages/core/`** : Types, enums, validation (existant)
- **`packages/graph/`** : 🆕 Composant Graph Pixi.js partagé
- **`mobile/`** : Application Capacitor avec SQLite local (dossier existant, à modifier)

---

## 🏗️ Phase 0 - Préparation de packages/core ✅

### 0.1 Vérifier les interfaces existantes

**Fichier** : `packages/core/src/types/`

- [x] Vérifier que `IObservation` contient tous les champs nécessaires
- [x] Vérifier que `IProtocol` contient `_items` et les préférences graphiques
- [x] Vérifier que `IReading` est complet
- [x] Vérifier/ajouter `IGraphPreferences`

### 0.2 Ajouter les interfaces manquantes

Si `IGraphPreferences` n'existe pas dans `packages/core/` :

- [ ] **Créer** `packages/core/src/types/graph-preferences.types.ts`
```typescript
export interface IGraphPreferences {
  color?: string;
  backgroundColor?: string;
  backgroundPattern?: string;
  strokeWidth?: number;
  visible?: boolean;
}
```

- [ ] **Exporter** depuis `packages/core/src/types/index.ts`
- [ ] **Exporter** depuis `packages/core/src/index.ts`

### 0.3 Build et test

- [ ] `cd packages/core && yarn build`
- [ ] Vérifier que front/ compile toujours

---

## 📊 Phase 1 - Création de packages/graph ✅

### 1.1 Structure du package

```
packages/graph/
├── src/
│   ├── components/
│   │   └── ActivityGraph.vue          # Composant Vue wrapper
│   ├── pixi-app/
│   │   ├── index.ts                   # Classe PixiApp principale
│   │   ├── axis/
│   │   │   ├── x-axis.ts              # Axe horizontal (temps)
│   │   │   └── y-axis.ts              # Axe vertical (observables)
│   │   ├── data-area/
│   │   │   └── index.ts               # Zone de données
│   │   └── lib/
│   │       ├── base-graphic.ts        # Classe de base pour les graphiques
│   │       ├── base-group.ts          # Classe de base pour les groupes
│   │       └── pattern-textures.ts    # Textures pour les patterns
│   ├── composables/
│   │   └── use-graph.ts               # Composable Vue (sans dépendance useObservation)
│   ├── utils/
│   │   └── graph-preferences.utils.ts # Utilitaires préférences graphiques
│   └── index.ts                       # Exports publics
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### 1.2 Créer le package.json

- [ ] **Créer** `packages/graph/package.json`

```json
{
  "name": "@actograph/graph",
  "version": "0.0.1",
  "description": "Activity graph component using PixiJS",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch"
  },
  "dependencies": {
    "pixi.js": "^8.x"
  },
  "peerDependencies": {
    "vue": "^3.4.0",
    "@actograph/core": "workspace:*"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vite-plugin-dts": "^3.0.0",
    "vue-tsc": "^2.0.0"
  }
}
```

### 1.3 Créer la configuration TypeScript

- [ ] **Créer** `packages/graph/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@actograph/core": ["../core/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 Créer la configuration Vite

- [ ] **Créer** `packages/graph/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ActographGraph',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
    },
    rollupOptions: {
      external: ['vue', 'pixi.js', '@actograph/core'],
      output: {
        globals: {
          vue: 'Vue',
          'pixi.js': 'PIXI',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@actograph/core': resolve(__dirname, '../core/src'),
    },
  },
});
```

### 1.5 Copier et adapter le code Pixi

#### 1.5.1 Copier les fichiers

- [ ] **Copier** `front/src/pages/userspace/analyse/_components/graph/pixi-app/` → `packages/graph/src/pixi-app/`
- [ ] **Copier** `front/src/services/observations/protocol-graph-preferences.utils.ts` → `packages/graph/src/utils/graph-preferences.utils.ts`

#### 1.5.2 Adapter les imports dans pixi-app/index.ts

- [ ] **Modifier** `packages/graph/src/pixi-app/index.ts`

```typescript
// Avant
import { IObservation, IProtocol, IGraphPreferences } from '@services/observations/interface';
import { getObservableGraphPreferences } from '@services/observations/protocol-graph-preferences.utils';

// Après
import { IObservation, IProtocol, IGraphPreferences } from '@actograph/core';
import { getObservableGraphPreferences } from '../utils/graph-preferences.utils';
```

#### 1.5.3 Adapter les autres fichiers

- [ ] **Modifier** tous les fichiers dans `pixi-app/` pour utiliser `@actograph/core`
- [ ] **Modifier** `packages/graph/src/utils/graph-preferences.utils.ts` pour utiliser `@actograph/core`

### 1.6 Créer le composant ActivityGraph.vue

- [ ] **Créer** `packages/graph/src/components/ActivityGraph.vue`

```vue
<template>
  <div class="activity-graph fit column">
    <!-- Header avec contrôles de zoom -->
    <div v-if="showControls" class="graph-header row items-center justify-end q-pa-sm">
      <div class="zoom-controls row items-center q-gutter-sm">
        <slot name="controls-prepend" />
        <button @click="methods.zoomIn" :disabled="state.zoomLevel >= 5">+</button>
        <button @click="methods.zoomOut" :disabled="state.zoomLevel <= 0.1">-</button>
        <button @click="methods.resetView">Reset</button>
        <slot name="controls-append" />
      </div>
    </div>

    <!-- Canvas pour PixiJS -->
    <div class="canvas-container fit">
      <canvas ref="canvasRef" class="fit" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, onMounted, onUnmounted, PropType } from 'vue';
import { PixiApp } from '../pixi-app';
import type { IObservation, IProtocol, IReading } from '@actograph/core';

export default defineComponent({
  name: 'ActivityGraph',
  
  props: {
    /** Observation avec ses données */
    observation: {
      type: Object as PropType<IObservation>,
      required: true,
    },
    /** Protocole avec les items */
    protocol: {
      type: Object as PropType<IProtocol>,
      required: true,
    },
    /** Readings à afficher */
    readings: {
      type: Array as PropType<IReading[]>,
      required: true,
    },
    /** Afficher les contrôles de zoom */
    showControls: {
      type: Boolean,
      default: true,
    },
  },
  
  emits: ['zoom-change', 'ready'],
  
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const pixiApp = ref<PixiApp | null>(null);
    
    const state = reactive({
      zoomLevel: 1,
      ready: false,
    });

    const methods = {
      zoomIn: () => {
        pixiApp.value?.zoomIn();
        state.zoomLevel = pixiApp.value?.getZoomLevel() ?? 1;
        emit('zoom-change', state.zoomLevel);
      },
      zoomOut: () => {
        pixiApp.value?.zoomOut();
        state.zoomLevel = pixiApp.value?.getZoomLevel() ?? 1;
        emit('zoom-change', state.zoomLevel);
      },
      resetView: () => {
        pixiApp.value?.resetView();
        state.zoomLevel = pixiApp.value?.getZoomLevel() ?? 1;
        emit('zoom-change', state.zoomLevel);
      },
      redraw: () => {
        if (pixiApp.value && props.observation && props.protocol && props.readings) {
          const obs = {
            ...props.observation,
            protocol: props.protocol,
            readings: props.readings,
          };
          pixiApp.value.setData(obs as IObservation);
          pixiApp.value.draw();
        }
      },
    };

    onMounted(async () => {
      if (!canvasRef.value) return;
      
      pixiApp.value = new PixiApp();
      await pixiApp.value.init({ view: canvasRef.value });
      
      methods.redraw();
      state.ready = true;
      emit('ready');
    });

    onUnmounted(() => {
      pixiApp.value?.destroy();
      pixiApp.value = null;
    });

    // Redessiner quand les données changent
    watch(
      () => [props.observation, props.protocol, props.readings],
      () => {
        if (state.ready) {
          methods.redraw();
        }
      },
      { deep: true }
    );

    return {
      canvasRef,
      state,
      methods,
    };
  },
});
</script>

<style scoped>
.activity-graph {
  width: 100%;
  height: 100%;
}

.graph-header {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.canvas-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.zoom-controls button {
  padding: 4px 8px;
  margin: 0 2px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.zoom-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

### 1.7 Créer l'index d'export

- [ ] **Créer** `packages/graph/src/index.ts`

```typescript
// Composant principal
export { default as ActivityGraph } from './components/ActivityGraph.vue';

// Classe PixiApp pour usage avancé
export { PixiApp } from './pixi-app';

// Utilitaires
export { getObservableGraphPreferences } from './utils/graph-preferences.utils';

// Types re-exportés pour commodité
export type { IGraphPreferences } from '@actograph/core';
```

### 1.8 Build et test du package

- [ ] `cd packages/graph && yarn install`
- [ ] `cd packages/graph && yarn build`
- [ ] Vérifier que le build produit les fichiers dans `dist/`

---

## 🔄 Phase 2 - Intégration dans front/ ✅

### 2.1 Ajouter la dépendance

- [ ] **Modifier** `front/package.json`

```json
{
  "dependencies": {
    "@actograph/core": "workspace:*",
    "@actograph/graph": "workspace:*"
  }
}
```

- [ ] `cd front && yarn install`

### 2.2 Configurer les aliases

- [ ] **Modifier** `front/quasar.config.js` - ajouter l'alias

```javascript
extendViteConf(viteConf) {
  Object.assign(viteConf.resolve.alias, {
    // ... aliases existants
    '@actograph/graph': path.resolve(__dirname, '../packages/graph/src'),
  });
}
```

### 2.3 Adapter le composant Graph existant

- [ ] **Modifier** `front/src/pages/userspace/analyse/_components/graph/Index.vue`

```vue
<template>
  <div class="fit column">
    <!-- Header avec contrôles Quasar -->
    <div class="graph-header row items-center justify-end q-pa-sm">
      <div class="zoom-controls row items-center q-gutter-sm">
        <q-btn flat round dense icon="add" color="grey-8" @click="methods.zoomIn" :disable="state.zoomLevel >= 5">
          <q-tooltip>Zoom avant</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="remove" color="grey-8" @click="methods.zoomOut" :disable="state.zoomLevel <= 0.1">
          <q-tooltip>Zoom arrière</q-tooltip>
        </q-btn>
        <q-separator vertical />
        <q-btn flat round dense icon="restart_alt" color="grey-8" @click="methods.resetView">
          <q-tooltip>Réinitialiser la vue</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Graph avec données du composable -->
    <ActivityGraph
      ref="graphRef"
      class="fit"
      :observation="observation.sharedState.currentObservation"
      :protocol="observation.protocol.sharedState.currentProtocol"
      :readings="observation.readings.sharedState.currentReadings"
      :show-controls="false"
      @zoom-change="state.zoomLevel = $event"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { ActivityGraph } from '@actograph/graph';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  components: { ActivityGraph },
  
  setup() {
    const observation = useObservation();
    const graphRef = ref<InstanceType<typeof ActivityGraph> | null>(null);
    
    const state = reactive({
      zoomLevel: 1,
    });

    const methods = {
      zoomIn: () => graphRef.value?.methods.zoomIn(),
      zoomOut: () => graphRef.value?.methods.zoomOut(),
      resetView: () => graphRef.value?.methods.resetView(),
    };

    return {
      observation,
      graphRef,
      state,
      methods,
    };
  },
});
</script>
```

### 2.4 Test de non-régression

- [ ] Démarrer front en mode dev : `cd front && yarn dev`
- [ ] Vérifier que le graph s'affiche correctement
- [ ] Vérifier le zoom in/out
- [ ] Vérifier la personnalisation (couleurs, patterns)

---

## 📱 Phase 3 - Configuration mobile ✅

### 3.1 Couleurs Quasar

- [ ] **Modifier** `mobile/quasar.config.js`

```javascript
framework: {
  config: {
    dark: 'auto',
    brand: {
      primary: '#1f2937',   // modernDarkGrey
      secondary: '#64748b', // slate
      accent: '#f97316',    // orange
      positive: '#10b981',  // green
      negative: '#ef4444',  // red
      warning: '#f59e0b',   // amber
      info: '#3b82f6',      // blue
    },
  },
  plugins: ['Notify', 'Dialog', 'Screen', 'Loading', 'LocalStorage'],
},
```

### 3.2 Styles CSS

- [ ] **Modifier** `mobile/src/css/app.scss`
  - Aligner les couleurs avec front/
  - Ajouter les styles pour les composants mobile

### 3.3 Ajouter les dépendances packages

- [ ] **Modifier** `mobile/package.json`

```json
{
  "dependencies": {
    "@actograph/core": "workspace:*",
    "@actograph/graph": "workspace:*"
  }
}
```

### 3.4 Configurer les aliases

- [ ] **Modifier** `mobile/quasar.config.js`

```javascript
extendViteConf(viteConf) {
  Object.assign(viteConf.resolve.alias, {
    // ... aliases existants
    '@actograph/core': path.resolve(__dirname, '../packages/core/src'),
    '@actograph/graph': path.resolve(__dirname, '../packages/graph/src'),
  });
}
```

---

## 🧭 Phase 4 - Navigation mobile ✅

### 4.1 Routes

- [ ] **Modifier** `mobile/src/router/routes.ts`

```typescript
import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@pages/Index.vue') },
      { path: 'protocol', name: 'protocol', component: () => import('@pages/protocol/Index.vue') },
      { path: 'observation', name: 'observation', component: () => import('@pages/observation/Index.vue') },
      { path: 'graph', name: 'graph', component: () => import('@pages/graph/Index.vue') },
      { path: 'settings', name: 'settings', component: () => import('@pages/settings/Index.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@pages/ErrorNotFound.vue'),
  },
];

export default routes;
```

### 4.2 Layout principal

- [ ] **Modifier** `mobile/src/layouts/MainLayout.vue`

```vue
<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn v-if="showBackButton" flat dense round icon="mdi-arrow-left" @click="$router.back()" />
        <q-toolbar-title>{{ pageTitle }}</q-toolbar-title>
        <q-btn flat dense round icon="mdi-cog" @click="$router.push({ name: 'settings' })" />
      </q-toolbar>
    </q-header>

    <!-- Page content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Footer avec tabs -->
    <q-footer elevated class="bg-primary">
      <q-tabs v-model="currentTab" class="text-white" active-color="accent" indicator-color="accent" align="justify">
        <q-route-tab name="home" icon="mdi-home" label="Accueil" :to="{ name: 'home' }" />
        <q-route-tab name="protocol" icon="mdi-flask-outline" label="Protocol" :to="{ name: 'protocol' }" :disable="!hasChronicle" />
        <q-route-tab name="observation" icon="mdi-binoculars" label="Observation" :to="{ name: 'observation' }" :disable="!hasChronicle" />
        <q-route-tab name="graph" icon="mdi-chart-line" label="Graph" :to="{ name: 'graph' }" :disable="!hasChronicle || !hasReadings" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useChronicle } from '@composables/use-chronicle';

export default defineComponent({
  name: 'MainLayout',
  setup() {
    const route = useRoute();
    const chronicle = useChronicle();
    const currentTab = ref('home');

    const pageTitle = computed(() => {
      const titles: Record<string, string> = {
        home: 'ActoGraph',
        protocol: 'Protocole',
        observation: 'Observation',
        graph: 'Graphe d\'activité',
        settings: 'Paramètres',
      };
      return titles[route.name as string] || 'ActoGraph';
    });

    const showBackButton = computed(() => {
      return route.name === 'settings';
    });

    const hasChronicle = computed(() => !!chronicle.sharedState.currentChronicle);
    const hasReadings = computed(() => chronicle.sharedState.currentReadings.length > 0);

    return {
      currentTab,
      pageTitle,
      showBackButton,
      hasChronicle,
      hasReadings,
    };
  },
});
</script>
```

---

## 💾 Phase 5 - Composable use-chronicle ✅

### 5.1 Créer le composable

- [ ] **Créer** `mobile/src/composables/use-chronicle/index.ts`

```typescript
import { reactive, computed } from 'vue';
import { observationService } from '@services/observation.service';
import type { IObservation, IProtocol, IReading } from '@actograph/core';

interface ChronicleState {
  currentChronicle: IObservation | null;
  currentProtocol: IProtocol | null;
  currentReadings: IReading[];
  isPlaying: boolean;
  elapsedTime: number;
  currentDate: Date | null;
  loading: boolean;
}

const sharedState = reactive<ChronicleState>({
  currentChronicle: null,
  currentProtocol: null,
  currentReadings: [],
  isPlaying: false,
  elapsedTime: 0,
  currentDate: null,
  loading: false,
});

let timerInterval: number | null = null;

export const useChronicle = () => {
  const hasChronicle = computed(() => !!sharedState.currentChronicle);
  const hasReadings = computed(() => sharedState.currentReadings.length > 0);

  const methods = {
    loadChronicle: async (id: number) => {
      sharedState.loading = true;
      try {
        const data = await observationService.getById(id);
        if (data) {
          sharedState.currentChronicle = data.observation as unknown as IObservation;
          sharedState.currentProtocol = { _items: data.protocol } as unknown as IProtocol;
          sharedState.currentReadings = data.readings as unknown as IReading[];
        }
      } finally {
        sharedState.loading = false;
      }
    },

    createChronicle: async (options: { name: string; description?: string }) => {
      const created = await observationService.create(options);
      await methods.loadChronicle(created.id);
      return created;
    },

    unloadChronicle: () => {
      sharedState.currentChronicle = null;
      sharedState.currentProtocol = null;
      sharedState.currentReadings = [];
      methods.stopTimer();
    },

    // Timer methods
    startTimer: () => {
      if (timerInterval) return;
      
      const startTime = Date.now() - sharedState.elapsedTime * 1000;
      sharedState.isPlaying = true;
      sharedState.currentDate = new Date();

      timerInterval = window.setInterval(() => {
        sharedState.elapsedTime = (Date.now() - startTime) / 1000;
        sharedState.currentDate = new Date();
      }, 10);
    },

    pauseTimer: () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      sharedState.isPlaying = false;
    },

    stopTimer: () => {
      methods.pauseTimer();
      sharedState.elapsedTime = 0;
      sharedState.currentDate = null;
    },

    togglePlayPause: () => {
      if (sharedState.isPlaying) {
        methods.pauseTimer();
      } else {
        methods.startTimer();
      }
    },

    addReading: async (reading: Partial<IReading>) => {
      if (!sharedState.currentChronicle) return;
      // Implémenter l'ajout via le service
    },

    formatDuration: (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    },
  };

  return {
    sharedState,
    hasChronicle,
    hasReadings,
    methods,
  };
};
```

---

## 🏠 Phase 6 - Page Accueil mobile ✅

### 6.1 Page principale

- [ ] **Modifier** `mobile/src/pages/Index.vue`

```vue
<template>
  <q-page class="q-pa-md">
    <!-- Si chronique chargée -->
    <template v-if="chronicle.hasChronicle.value">
      <q-card class="chronicle-card q-mb-md">
        <q-card-section>
          <div class="text-h6">{{ chronicle.sharedState.currentChronicle?.name }}</div>
          <div class="text-caption text-grey">
            {{ chronicle.sharedState.currentChronicle?.description || 'Aucune description' }}
          </div>
        </q-card-section>
        
        <q-card-section>
          <div class="row q-gutter-sm">
            <div class="col">
              <q-icon name="mdi-database" size="sm" class="q-mr-xs" />
              {{ chronicle.sharedState.currentReadings.length }} relevés
            </div>
          </div>
        </q-card-section>

        <q-card-actions vertical>
          <q-btn color="primary" label="Éditer le protocole" @click="$router.push({ name: 'protocol' })" class="full-width q-mb-sm" />
          <q-btn color="primary" label="Faire une observation" @click="$router.push({ name: 'observation' })" class="full-width q-mb-sm" />
          <q-btn color="primary" label="Voir le graphe" @click="$router.push({ name: 'graph' })" :disable="!chronicle.hasReadings.value" class="full-width q-mb-sm" />
          <q-btn flat color="accent" label="Charger une autre chronique" @click="state.showSelectDialog = true" class="full-width" />
        </q-card-actions>
      </q-card>
    </template>

    <!-- Si pas de chronique -->
    <template v-else>
      <div class="empty-state q-pa-lg text-center">
        <q-icon name="mdi-folder-open-outline" size="64px" color="grey-5" />
        <div class="text-h6 q-mt-md">Aucune chronique chargée</div>
        <div class="text-body2 text-grey q-mb-lg">Créez-en une nouvelle ou chargez une existante</div>
        
        <q-btn color="accent" label="Nouvelle chronique" icon="mdi-plus" @click="state.showCreateDialog = true" class="q-mb-md" />
      </div>

      <!-- Liste des chroniques existantes -->
      <q-card v-if="state.chronicles.length > 0">
        <q-card-section>
          <div class="text-subtitle1">Chroniques sur l'appareil</div>
        </q-card-section>
        
        <q-list separator>
          <q-item v-for="chr in state.chronicles" :key="chr.id" clickable @click="methods.loadChronicle(chr.id)">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" icon="mdi-clipboard-text" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ chr.name }}</q-item-label>
              <q-item-label caption>{{ chr.readings_count }} relevés</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="mdi-chevron-right" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </template>

    <!-- Dialog création -->
    <CreateChronicleDialog v-model="state.showCreateDialog" @created="methods.onChronicleCreated" />
  </q-page>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useChronicle } from '@composables/use-chronicle';
import { observationService } from '@services/observation.service';
import CreateChronicleDialog from './_components/CreateChronicleDialog.vue';

export default defineComponent({
  components: { CreateChronicleDialog },
  
  setup() {
    const chronicle = useChronicle();
    
    const state = reactive({
      chronicles: [] as any[],
      loading: false,
      showCreateDialog: false,
      showSelectDialog: false,
    });

    const methods = {
      loadChronicles: async () => {
        state.loading = true;
        try {
          state.chronicles = await observationService.getAll();
        } finally {
          state.loading = false;
        }
      },
      
      loadChronicle: async (id: number) => {
        await chronicle.methods.loadChronicle(id);
      },
      
      onChronicleCreated: async (chr: any) => {
        state.showCreateDialog = false;
        await chronicle.methods.loadChronicle(chr.id);
      },
    };

    onMounted(() => {
      methods.loadChronicles();
    });

    return {
      chronicle,
      state,
      methods,
    };
  },
});
</script>
```

### 6.2 Dialog de création

- [ ] **Créer** `mobile/src/pages/_components/CreateChronicleDialog.vue`

---

## 🧪 Phase 7 - Page Protocol mobile ✅

### 7.1 Page Protocol

- [ ] **Créer** `mobile/src/pages/protocol/Index.vue`

Structure similaire à front mais avec UI mobile (q-tree, actions simplifiées).

---

## 📝 Phase 8 - Page Observation mobile ✅

### 8.1 Page Observation

- [ ] **Créer** `mobile/src/pages/observation/Index.vue`

- Toolbar : Play/Pause, Stop, Timer
- Catégories avec boutons observables
- Liste readings récents (collapsible)

### 8.2 Composants

- [ ] **Créer** `mobile/src/pages/observation/_components/CategoryCard.vue`
- [ ] **Créer** `mobile/src/pages/observation/_components/ReadingsList.vue`

---

## 📊 Phase 9 - Page Graph mobile ✅

### 9.1 Page Graph avec ActivityGraph partagé

- [ ] **Créer** `mobile/src/pages/graph/Index.vue`

```vue
<template>
  <q-page class="fit">
    <ActivityGraph
      v-if="chronicle.hasChronicle.value && chronicle.hasReadings.value"
      :observation="chronicle.sharedState.currentChronicle"
      :protocol="chronicle.sharedState.currentProtocol"
      :readings="chronicle.sharedState.currentReadings"
      :show-controls="true"
    />
    
    <div v-else class="fit column items-center justify-center">
      <q-icon name="mdi-chart-line" size="64px" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey">Aucune donnée à afficher</div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ActivityGraph } from '@actograph/graph';
import { useChronicle } from '@composables/use-chronicle';

export default defineComponent({
  components: { ActivityGraph },
  
  setup() {
    const chronicle = useChronicle();
    return { chronicle };
  },
});
</script>
```

---

## ⚙️ Phase 10 - Page Settings ✅

- [ ] **Créer** `mobile/src/pages/settings/Index.vue`

- Version de l'app
- Bouton "Vider les données" avec confirmation

---

## 🗑️ Phase 11 - Nettoyage ✅

### 11.1 Supprimer les anciens fichiers

- [x] **Supprimer** `mobile/src/pages/observations/` (tout le dossier)
- [x] **Supprimer** `mobile/src/pages/import/` (tout le dossier)

### 11.2 Vérifier les imports

- [x] Vérifier que tous les imports sont corrects
- [x] Supprimer les imports non utilisés

---

## 📁 Résumé des fichiers

> ⚠️ **Rappel** : `mobile/` est un dossier à la racine du projet, **PAS** dans `front/`

### packages/graph/ (🆕 à créer - nouveau package partagé)

| Fichier | Description |
|---------|-------------|
| `packages/graph/package.json` | Configuration npm |
| `packages/graph/tsconfig.json` | Configuration TypeScript |
| `packages/graph/vite.config.ts` | Configuration Vite |
| `packages/graph/src/index.ts` | Exports publics |
| `packages/graph/src/components/ActivityGraph.vue` | Composant principal |
| `packages/graph/src/pixi-app/index.ts` | Classe PixiApp |
| `packages/graph/src/pixi-app/axis/x-axis.ts` | Axe X |
| `packages/graph/src/pixi-app/axis/y-axis.ts` | Axe Y |
| `packages/graph/src/pixi-app/data-area/index.ts` | Zone données |
| `packages/graph/src/pixi-app/lib/*.ts` | Utilitaires Pixi |
| `packages/graph/src/utils/graph-preferences.utils.ts` | Utilitaires préférences |

### mobile/ (📱 à modifier/créer - dossier existant à la racine)

| Action | Fichier (chemin complet) |
|--------|--------------------------|
| Modifier | `mobile/quasar.config.js` |
| Modifier | `mobile/package.json` |
| Modifier | `mobile/src/css/app.scss` |
| Modifier | `mobile/src/router/routes.ts` |
| Modifier | `mobile/src/layouts/MainLayout.vue` |
| Modifier | `mobile/src/pages/Index.vue` |
| Créer | `mobile/src/composables/use-chronicle/index.ts` |
| Créer | `mobile/src/pages/_components/CreateChronicleDialog.vue` |
| Créer | `mobile/src/pages/protocol/Index.vue` |
| Créer | `mobile/src/pages/observation/Index.vue` |
| Créer | `mobile/src/pages/observation/_components/CategoryCard.vue` |
| Créer | `mobile/src/pages/observation/_components/ReadingsList.vue` |
| Créer | `mobile/src/pages/graph/Index.vue` |
| Créer | `mobile/src/pages/settings/Index.vue` |
| Supprimer | `mobile/src/pages/observations/` |
| Supprimer | `mobile/src/pages/import/` |

### front/ (🖥️ modifications minimales uniquement)

| Fichier (chemin complet) | Modification |
|--------------------------|--------------|
| `front/package.json` | Ajouter dépendance @actograph/graph |
| `front/quasar.config.js` | Ajouter alias @actograph/graph |
| `front/src/pages/userspace/analyse/_components/graph/Index.vue` | Utiliser ActivityGraph du package partagé |

> **Note** : front/ n'est modifié que pour utiliser le nouveau package `@actograph/graph`. Toute la structure existante reste intacte.

---

## ✅ Checklist de validation

### Après Phase 1 (packages/graph)
- [ ] `yarn build` réussit dans packages/graph
- [ ] Les types sont générés dans dist/

### Après Phase 2 (front)
- [ ] Front démarre sans erreur
- [ ] Le graph s'affiche correctement
- [ ] Zoom in/out fonctionne
- [ ] Personnalisation fonctionne

### Après Phase 9 (mobile graph)
- [ ] Mobile démarre sans erreur
- [ ] Le même graph s'affiche sur mobile
- [ ] Les données SQLite sont correctement passées

### Test final
- [ ] Navigation mobile complète
- [ ] Création de chronique
- [ ] Édition du protocole
- [ ] Enregistrement d'observations
- [ ] Visualisation du graph identique à front

---

## 📝 Notes importantes

### Architecture
1. ⚠️ **`mobile/` est à la RACINE** du projet, à côté de `front/`, PAS dans `front/src/mobile/`
2. **On ne crée PAS** de dossier `front/src/mobile/`
3. **front/ et mobile/** sont deux applications Quasar **séparées et indépendantes**

### Développement
4. **Ne pas modifier** les services front existants (sauf pour utiliser @actograph/graph)
5. **Tester front/** après chaque modification pour éviter les régressions
6. **Le graph utilise WebGL** - devrait fonctionner sur mobile moderne
7. **SQLite mobile** est local, pas de sync avec le backend API

### Commandes de développement
```bash
# Front (desktop/web) - INCHANGÉ
cd front && yarn dev

# Mobile (Capacitor Android)
cd mobile && yarn dev  # ou quasar dev -m capacitor -T android

# Package graph (si modification)
cd packages/graph && yarn build
```

