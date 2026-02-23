---
description: Conventions frontend Vue.js 3 + Quasar pour le frontend ActoGraph v3
globs: front/**
---

# Frontend - Vue.js 3 + Quasar

**Reference Knowledge Base** : Voir `.knowledge-base/recipes/glutamat/creer-module-quasar.md` et `.knowledge-base/best-practices/code-quality/conventions-vue-quasar.md` pour les conventions generales, mais **adapter pour `defineComponent`** (ce projet n'utilise pas `<script setup>`).

## Structure des fichiers

- **Pages** : `front/src/pages/` - Pages de l'application
- **Composants** : `front/src/components/` et `front/lib-improba/components/`
- **Composables** : `front/src/composables/` et `front/lib-improba/composables/`
- **Services** : `front/src/services/` et `front/lib-improba/services/`
- **Router** : `front/src/router/`
- **Styles** : `front/src/css/` et `front/lib-improba/css/`

## Composants Vue.js

- **IMPORTANT** : Utiliser `defineComponent` avec la fonction `setup()`, **PAS** `<script setup>`
- Tous les composants doivent utiliser TypeScript (`<script lang="ts">`)
- Les composants doivent exporter `defineComponent` avec un nom explicite
- Utiliser la Composition API avec `setup()`
- Retourner un objet depuis `setup()` avec toutes les proprietes/methodes exposees au template

Exemple :
```vue
<template>
  <div>
    <p>{{ title }}</p>
    <button @click="methods.increment">Count: {{ state.count }}</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';

export default defineComponent({
  name: 'MyComponent',
  props: {
    title: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    // If required, one can add:
    // const stateless = {
    //   myVar: myValue,
    // }
    // And return it
    
    const state = reactive({
      count: 0,
    })

    const methods = {
      increment: () => {
        state.count++;
      }
    }
    
    return {
      state,
      methods,
    };
  },
});
</script>
```

## Composables

- Creer des composables reutilisables dans `front/src/composables/` ou `front/lib-improba/composables/`
- Les composables doivent etre des fonctions qui retournent un objet
- Utiliser le prefixe `use` pour les noms de composables (ex: `useAuth`, `useGraph`)
- Pour un etat partage entre plusieurs composants, utiliser `reactive()` en dehors de la fonction composable
- Structurer les composables avec :
  - `sharedState` : Etat reactif partage (utiliser `reactive()` ou `ref()`)
  - `methods` : Methodes exposees pour manipuler l'etat
  - Retourner `{ sharedState, methods }` ou `{ sharedState, methods, ... }`

Exemple avec etat partage :
```typescript
import { reactive, ref, computed } from 'vue';

const sharedState = reactive({
  items: [] as Item[],
  loading: false,
});

export function useItems() {
  const methods = {
    async loadItems() {
      sharedState.loading = true;
      // ... chargement des donnees
      sharedState.loading = false;
    },
    addItem(item: Item) {
      sharedState.items.push(item);
    },
  };
  
  return {
    sharedState,
    methods,
  };
}
```

## Services Frontend

- Les services sont des objets qui encapsulent les appels API
- Utiliser `api()` depuis `lib-improba/boot/axios` pour les requetes HTTP
- Utiliser `httpUtils.apiUrl()` pour obtenir l'URL de l'API
- Les services doivent etre dans `front/src/services/` ou `front/lib-improba/services/`
- Structurer les services comme des objets avec des methodes async
- Gerer les erreurs HTTP au niveau du composant/composable, pas dans le service

Exemple :
```typescript
import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import { IMyEntity } from './interface';

const apiUrl = httpUtils.apiUrl();

export const myService = {
  async findAll(): Promise<IMyEntity[]> {
    const response = await api().get(`${apiUrl}/my-resource`);
    return response.data;
  },
  
  async findOne(id: number): Promise<IMyEntity> {
    const response = await api().get(`${apiUrl}/my-resource/${id}`);
    return response.data;
  },
  
  async create(data: CreateMyDto): Promise<IMyEntity> {
    const response = await api().post(`${apiUrl}/my-resource`, data);
    return response.data;
  },
};
```

## Interfaces TypeScript Frontend

- Creer des interfaces pour les entites dans `front/src/services/**/interface.ts`
- Utiliser le prefixe `I` pour les interfaces (ex: `IObservation`, `IReading`, `IUser`)
- Les interfaces doivent correspondre aux entites backend mais peuvent etre simplifiees
- Utiliser `interface` plutot que `type` pour les entites principales

Exemple :
```typescript
export interface IMyEntity {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Quasar Framework

- Utiliser les composants Quasar avec le prefixe `q-` (ex: `q-btn`, `q-input`)
- Utiliser les composants de la lib-improba quand disponibles (ex: `DPage`, `StandardLayout`)
- Respecter les conventions de nommage Quasar

## Classes utilitaires Quasar

- **IMPORTANT** : Toujours utiliser les classes utilitaires Quasar quand c'est possible, plutot que du CSS custom
- Utiliser les classes Quasar pour le layout : `row`, `column`, `col`, `col-auto`, `col-shrink`, `fit`, `full-width`
- Utiliser les classes Quasar pour l'espacement : `q-pa-md`, `q-px-sm`, `q-py-md`, `q-mb-md`, `q-gutter-md`, `q-col-gutter-md`
- Utiliser les classes Quasar pour l'alignement : `items-center`, `justify-center`, `justify-end`
- Utiliser les classes Quasar pour le texte : `text-text`, `text-body1`, `text-body2`, `text-negative`
- Utiliser les classes Quasar pour les backgrounds : `bg-primary-lowest`, `bg-secondary-medium`
- Eviter de creer du CSS custom pour des styles qui peuvent etre geres par les classes utilitaires Quasar
- Consulter la documentation Quasar pour les classes disponibles : https://quasar.dev/style/utility-classes

## Couleurs CSS

- **IMPORTANT** : Utiliser les couleurs definies dans le CSS de l'application, pas les couleurs Quasar par defaut
- Utiliser `primary`, `accent`, `secondary` directement (pas `q-primary`, `q-accent`, `q-secondary`)
- Dans les templates : utiliser `text-primary`, `color="primary"`, `bg-primary`
- Dans les styles SCSS : utiliser `var(--primary)`, `var(--accent)`, `var(--secondary)` (pas `var(--q-primary)`)
- Les couleurs sont definies dans `front/src/css/_colors.scss` et `front/lib-improba/css/_colors.scss`

## Design des Dialogs

**IMPORTANT** : Tous les dialogs doivent suivre ce pattern de design pour la coherence.

- **Structure** :
  - Utiliser `DCard` avec `class="q-dialog-plugin"`, `bgColor="background"`, `innerHeader` et un `title`
  - Utiliser `DCardSection` pour separer les sections (contenu et actions)
- **Champs de formulaire** :
  - Utiliser directement `q-input` (pas `DFormInput`) pour eviter les labels a gauche
  - Utiliser `outlined` et `dense` pour un style epure
  - Les labels sont remplaces par des `placeholder` dans les champs
  - Pour les textarea : utiliser `type="textarea"` avec `:rows="4"` et ajouter `class="q-mb-md"` pour l'espacement
  - Utiliser `q-gutter-md` entre les champs dans un conteneur `column`
- **Boutons d'action** :
  - Placer les boutons dans une `DCardSection` separee
  - Utiliser `row items-center justify-end full-width q-gutter-md` pour aligner a droite
  - Utiliser `DCancelBtn` et `DSubmitBtn` de `@lib-improba/components`

Exemple de structure :
```vue
<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <DCard
      class="q-dialog-plugin"
      style="min-width: 400px"
      bgColor="background"
      innerHeader
      title="Titre du dialog"
    >
      <DCardSection>
        <div class="column q-gutter-md">
          <q-input
            v-model="state.field1"
            placeholder="Placeholder du champ 1"
            outlined
            dense
            :rules="[(val) => (val && val.length > 0) || 'Message de validation']"
          />
          <q-input
            v-model="state.field2"
            placeholder="Placeholder du champ 2 (optionnel)"
            outlined
            dense
            type="textarea"
            :rows="4"
            class="q-mb-md"
          />
        </div>
      </DCardSection>

      <DCardSection>
        <div class="row items-center justify-end full-width q-gutter-md">
          <DCancelBtn @click="onCancelClick" />
          <DSubmitBtn
            label="Action"
            @click="onOKClick"
            :disable="!isValid"
          />
        </div>
      </DCardSection>
    </DCard>
  </q-dialog>
</template>
```

## Gestion des dependances Frontend

- Utiliser **yarn** (pas npm)
- Toujours executer `yarn install` dans le conteneur Docker Frontend
- Le fichier `package.json` est dans `front/package.json`
