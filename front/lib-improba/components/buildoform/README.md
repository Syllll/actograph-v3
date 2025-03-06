# Build'o'Form (BoF)

<ul>
  <li><a href="#objectif">Objectif</a></li>
  <li><a href="#prérequis">Prérequis</a></li>
  <li><a href="#intégration">Intégration</a>
    <ul>
      <li><a href="#props">Props</a></li>
      <li><a href="#events">Events</a></li>
      <li><a href="#submit">Submit</a></li>
    </ul>
  </li>
  <li><a href="#mapping-des-fields">Mapping des fields</a>
    <ul>
      <li><a href="#exemple-de-fields">Exemple de fields</a></li>
      <li><a href="#cols">Cols</a></li>
      <li><a href="#steps">Steps</a></li>
      <li><a href="#champs-customs">Champs customs</a></li>
      <li><a href="#props-directives">Props, Directives</a></li>
      <li><a href="#interdépendance">Interdépendances</a></li>
    </ul>
  </li>
  <li><a href="#design">Design</a>
    <ul>
      <li><a href="#row">Row</a></li>
      <li><a href="#fields">Fields</a></li>
      <li><a href="#steps-1">Steps</a></li>
    </ul>
  </li>
  <li><a href="#champs-customs">Champs customs</a>
    <ul>
      <li><a href="#wip-doc-todo">[WIP] DOC TODO</a></li>
    </ul>
  </li>
  <li><a href="#form-layout">Form Layout</a></li>
  <li><a href="#skss">Skss</a>
    <ul>
      <li><a href="#colors">Colors</a></li>
      <li><a href="#sélecteurs">Sélecteurs</a></li>
    </ul>
  </li>
</ul>

## Objectif
L'objectif du BoF est de simplifier la création et intégration du formulaire au sein de différents projets, en se basant sur un object JSON.


## Prérequis
Pour pouvoir utiliser le BoF correctement, il suffit d'avoir un object `reactive` dans le `state` qui sera passé au composant en tant que `v-model`.
<br>
Il faut également importer le composant (_`~/lib-improba/components/buildoform/Index.vue`_)
<br>

Pour utiliser toutes les fonctionnalités disponibles, certains types sont également recommmandés:
<ul>
  <li><strong>IField</strong>: Définit les attributs requis ou non pour les différents <code>Fields</code>. Reproduit également les props des composants Quasar.</li>
  <li><strong>IFieldStyle</strong>: Définit les différents styles possibles pour chaque <code>Field</code> (cf. <a href="#fields">Design - Fields</a>).</li>
  <li><strong>IRowStyle</strong>: Définit les options de style pour la row englobant les <code>Fields</code> (cf. <a href="#row">Design - Row</a>).</li>
</ul>

```ts
import BuildOForm from './../../components/buildoform/Index.vue'

export default defineComponent({
  components: { BuildOForm },
  setup (props, ctx) {
    const state = reactive({
      user: {
        id: 1337,
        firstName: null,
        lastName: null,
        gender: null,
        footSize: null,
        lastFullyChargedPhone: '1969-04-20'
      }
    })
  }
});
```

## Intégration

<!-- ### Composant principal -->

### Props
Le composant `build-o-form` nécessite quelques informations requises à son bon fonctionnement:
# TODO REVOIR
<ul>
  <li><strong>v-model</strong>: Un v-model basique, contenant l'objet à mettre à jour.<br>
    <em>Note: pour mettre à jour plusieurs champs, le state global peut être envoyé. Les models de chaque champ devront s'y adapter.</em>
  </li>
  <li><strong>fields</strong> (<em>IField[]</em>): Un array contenant toutes les informations des <code>Fields</code> (cf. <a href="#mapping-des-fields">Mapping des Fields</a>).</li>
  <li><strong>styles</strong>: Un objet contenant 2 attributs définissant les styles du formulaire.
    <ul>
      <li><strong>steps</strong> (<em>IStepStyle</em>): un objet contenant les informations de style du container d'affichage des informations d'étapes (cf. <a href="#steps">Design - Steps</a>).</li>
      <li><strong>row</strong> (<em>IRowStyle</em>): un objet contenant les informations de style de la row et des cols (cf. <a href="#row">Design - Row</a>).</li>
      <li><strong>field</strong> (<em>IFieldStyle</em>): un objet contenant les informations de style de chaque champ (cf. <a href="#fields">Design - Fields</a>).</li>
    </ul>
  </li>
</ul>

```html
<build-o-form
  v-model="state.user"

  :fields="stateless.fields"
  :styles="{
    steps: stateless.stepStyle,
    row: stateless.rowStyle,
    field: stateless.fieldStyle,
  }"

  @submit="methods.submit"
/>
```

---
### Events
Certains évènements sont aussi trackés. Il est recommandé de les utiliser __seulement__ à des fins de tracking (gtm, matomo, etc..).
<ul>
  <li><strong>@event:field-touched</strong>: Retourne l'objet complet du champ visé.</li>
  <li><strong>@event:model-updated</strong>: Retourne le modèle (string) mis à jour.</li>
  <li><strong>@event:form-submitted</strong>: Déclenché lorsque l'utilisateur clique sur le bouton <code>Suivant</code>. Retourne un boolean précisant si les conditions (champs requis, etc.) sont toutes validées.</li>
  <li><strong>@event:step-change</strong>: Déclenché lors d'un changement d'étape. Retourne l'étape actuelle (number).</li>
</ul>

```html
<build-o-form
  v-model="state.user"

  [...]

  @event:field-touched="(e: IField) => methods.handleEvent('fieldTouched', e)"
  @event:model-updated="(e: any) => methods.handleEvent('modelUpdated', e)"
  @event:form-submitted="(e: boolean) => methods.handleEvent('formSubmitted', e)"
  @event:step-change="(e: IStep) => methods.handleEvent('stepChange', e)"

  @submit="methods.submit"
/>
```

---
### Submit
Lorsque toutes les étapes sont validées, que tous les `Fields` sont remplis et que l'utilisateur valide le formulaire __PAR LE CTA__, l'évènement `submit` est envoyé.

---
## Mapping des fields
Chaque `Field` possèdes certains attributs requis:
<ul>
  <li><strong>is</strong> (<em>string</em>): Correspond à la balise du champ (ex: QInput, ...)</li>
  <li><strong>ref</strong> (<em>string</em>): Permet d'identifier le champ, unique si possible</li>
  <li><strong>model</strong> (<em>string</em>): La valeur passée dans le <code>v-model</code></li>
</ul>

### Exemple de fields
#### QInput
```ts
{
  is: 'QInput',
  ref: 'firstName',
  model: 'firstName'
}
```
> Équivalent html
>```html
><q-input ref="firstName" v-model="context.firstName" />
>```
---

#### QSelect
```ts
{
  is: 'QSelect',
  ref: 'gender',

  model: 'gender',

  label: 'Genre',
  placeholder: 'Renseignez votre genre',

  emitValue: true,
  mapOptions: true,
  optionValue: 'value',
  optionLabel: 'label',

  options: [
    {
      label: 'Homme',
      value: 'male',
    },
    {
      label: 'Femme',
      value: 'female',
    },
    {
      label: 'Autre',
      value: 'other',
    },
  ],
},
```
> Équivalent html
>```html
><q-input
>  ref="firstName"
>  v-model="context.gender"
>  label="Genre"
>  placeholder="Renseignez votre genre"
>  emit-value
>  map-options
>  optionValue="value"
>  optionLabel="label"
>  [...]
>/>
>```

## Attributs Optionnels


### Required
L'attribut `required` permet de rendre un `Field` requis, bloquant le passage à la suite suite du formulaire.

La navigation entre les étapes est automatiquement calculée en fonction de l'état des `Fields` de cette même étape. <br>
Si tous les `Fields` requis sont valides, le passage se fera lors du clic sur "Suivant", sinon le bouton sera `disabled` et les `Fields` requis passeront en état d'erreur lors du clic.

#### Reprenons le QInput
```ts
{
  is: 'QInput',
  ref: 'firstName',
  model: 'firstName',
  // ↓
  required: true,
}
```
---

### Cols
L'attribut `cols` permet de définir le comportement de la col. Plusieurs valeurs peuvent y être assignées:
<ul>
  <li><em>string, number</em>: La taille brute</li>
  <li><em>{ base, xs, sm, md, lg, xl }</em>: Chaque breakpoint peut avoir son propre format. À remplir avec <em>string/number</em></li>
</ul>

#### Reprenons le QInput
```ts
{
  is: 'QInput',
  ref: 'firstName',
  model: 'firstName',
  // ↓
  cols: {
    xs: 12,
    sm: 6,
    md: 12
  },
}
```
---

### Steps
Les `Fields` peuvent être regroupés sous des `steps`.
Les `steps` sont calculées et définies en fonction de l'ordre de l'apparition dans les steps.

Les classes d'affichage peuvent être personnalisées [Cf. Design - Steps](#steps-1)

Lors de la dernière étape, le bouton `Suivant` devriendra `Terminer` et, si toutes les conditions sont remplies, enverra [l'évènement `submit`](#submit)

#### Reprenons le QInput
```ts
{
  is: 'Input',
  ref: 'firstName',
  model: 'firstName',
  // ↓
  step: 'firstbase' // Correspond au champs 'value' de l'exemple ci-dessous
}
```
Des slots sont générés automatiquement pour chaque step sous ce format: `${step}-title`, `${step}-desc`

Tous les champs possèdant la même `value` seront regroupés sous la même étape

> Ici, les 2 slots générés seraient:
>```html
><template v-slot:firstbase-title />
><template v-slot:firstbase-desc />
>```
> Le contexte des étapes est accessible dans le scope
>```html
><template v-slot:firstbase-title="{ step }">
>   Étape {{ step.index }}: {{ step.name }}
></template>
>```
>

Les valeurs des slots par défaut peuvent être précisées directement à travers un object.

```ts
{
  is: 'Input',
  ref: 'firstName',
  model: 'firstName',
  // ↓
  step: {
    name: 'First base',
    value: 'firstbase',
    desc: 'Some description',
    display: true // Affiche ou non les infos sur l'étape
  },
}
```

### Champs customs

Certains composants sont englobés dans un [FormLayout](#form-layout).
Dans ces cas là, un `title` sera utilisé plutôt qu'un `label` afin de bypass celui d'origine sur les composants customs.
Voir __*IField*__ pour les autres props.


#### Slider custom
```ts
{
  is: 'BSlider',
  ref: 'footsize',

  title: 'Pointure',
  label: true,

  model: 'footSize',

  min: 30,
  max: 50,
},
```

---
### Props, Directives
Tous les attributs de l'object seront attribués à l'enfant à travers un `v-bind`. <br>
Le `camelCase` se comporte comme le `kebab-case` pour les props et directives.


#### Reprenons le QSelect
```ts
{
  is: 'QSelect',
  ref: 'gender',

  model: 'gender',

  [...],

  // ↓
  emitValue: true,
  mapOptions: true,
  optionValue: 'value',
  optionLabel: 'label',
},
```
Équivaut à

```html
<q-select ref=gender emit-value map-options option-value="label" option-label="label" />
```

---
### Interdépendance
Les interdépendances permettent de conditionner l'affichage de certains fields et/ou options. <br>
Un array _`{ model: string, value: string }[]`_ permet de définir ces conditions. <br>
_Note_: Le comportement est identique pour les fields et les options

#### Reprenons le QSelect
```ts
{
  is: 'QSelect',
  ref: 'gender',

  model: 'gender',
  [...],

  // ↓
  conditions: [
    // Le champs s'affichera si le firstName est null
    { model: 'firstName', value: 'null' },
    // ET si le lastname n'est pas null
    { model: 'lastName', value: 'not:null' },
  ],

  options: [
    {
      label: 'Homme',
      value: 'male',
    },
    {
      label: 'Femme',
      value: 'female',
    },
    {
      label: 'Autre',
      value: 'other',
      // ↓
      conditions: [
        // Le champs s'affichera si le firstName n'est pas Maurice, désolé Maurice
        { model: 'firstName', value: 'not:Maurice' },
      ],
    },
  ],
},
```

## Design
### Row
Options:
<ul>
  <li><strong>orientation</strong> (<em>string enum</em>): row, column</li>
  <li><strong>items</strong> (<em>string enum</em>): start, center, end</li>
  <li><strong>justify</strong> (<em>string enum</em>): start, center, end, around, between, evenly</li>
  <li><strong>gutter</strong> (<em>string enum</em>): xs, sm, md, lg, xl</li>
  <li><strong>colGutter</strong> (<em>string enum</em>): xs, sm, md, lg, xl</li>
</ul>

#### Exemple de design
<sup><sub> _`IRowStyle: ~/lib-improba/components/buildoform/lib/interfaces/style.interface.ts`_ </sub></sup>

```ts
rowStyle: {
  orientation: 'row',

  items: 'center',
  justify: 'center',

  colGutter: 'sm',
} as IRowStyle,
```

### Fields
<sup><sub> _`~/lib-improba/components/buildoform/lib/interfaces/style.interface.ts`_ </sub></sup>

Options:
<ul>
<li> __static__ (_string_): Des classes attribuées par défaut à chaque col, statique (ne change sous aucune condition). </li>
<li> __directives__ (_object_): Le style des fields </li>
  <ul>
    <li> __color__ (_string_): La couleur </li>
    <li> __outlined__ (_boolean_): Option de base de quasar </li>
    <li> __filled__ (_boolean_): Option de base de quasar </li>
    <li> __flat__ (_boolean_): Option de base de quasar </li>
  </ul>
<li> __Selecteurs Skss__: cf. [Skss - Sélecteurs](#sélecteurs) </li>
</ul>

#### Exemple de design
<sup><sub> _`IFieldStyle: ~/lib-improba/components/buildoform/lib/interfaces/style.interface.ts`_ </sub></sup>

```ts
fieldStyle: {
  directives: {
    color: 'primary',
    outlined: true,
  },

  static: 'q-pa-sm q-ma-sm smooth-slow',

  bg: {
    focus: 'accent-70',
    hover: 'primary-50',

    errored: 'danger-50',
    erroredHover: 'danger-70'
  },
  shadow: {
    // base: 'secondary-dense',
    // hover: 'primary'
  },
  rounded: {
    base: 'default',
    hover: 'slighter'
  }
} as IFieldStyle,
```

### Steps
<sup><sub> _`IStepStyle: ~/lib-improba/components/buildoform/lib/interfaces/style.interface.ts`_ </sub></sup>

```ts
stepStyle: {
  container: 'q-ml-md',
  title: 'q-mb-none',
  desc: ''
} as IStepStyle,
```

## Champs customs
### [WIP] DOC TODO
À partir du dossier _`~/lib-improba/components/buildoform/`_ <br>
- Ajouter le composant dans le dossier _`custom-components/`_ <br>
- Importer le composant dans _`index.ts`_ <br>
- tmp: Ajouter les props si besoin dans _`~/lib-improba/components/buildoform/lib/interfaces/field.interface.ts`_


## Form Layout

## Skss

### Colors
<sup><sub> _`~/lib-improba/css/_colors.scss`_ </sub></sup>
<br>
<sup><sub> _`~/lib-improba/css/_presets.scss`_ </sub></sup>

Couleurs:
<ul>
  <li> <span style="color: #0f84cb">primary</span> </li>
  <li> <span style="color: #3b5161">secondary</span> </li>
  <li> <span style="color: #64748b">neutral</span> </li>
  <li> <span style="color: #0f84cb">accent</span> </li>
  <li> <span style="color: #00c99e">success</span> </li>
  <li> <span style="color: #e64d4b">danger</span> </li>
  <li> <span style="color: #e64d4b">warning</span> </li>
  <li> <span>none (_transparent_)</span> </li>
</ul>


Chaque couleur de base possède un set de variantes:
<ul>
<li> lowest </li>
<li> lower </li>
<li> low </li>
<li> medium </li>
<li> high </li>
<li> higher </li>
<li> highest </li>
</ul>

Une __string de couleur__ correspond à une couleur suivie ou non de sa variante.<br>
Exemples:
<ul>
  <li> `primary` </li>
  <li> `secondary-low` </li>
  <li> `neutral-higher` </li>
</ul>



### Sélecteurs
<sup><sub> _`~/lib-improba/css/_mixins.scss`_ </sub></sup>
<br>
<sup><sub> _`~/lib-improba/css/_presets.scss`_ </sub></sup>

String de couleur: [Skss - couleurs](#colors). <br>
Chaque sélecteur peut être soit un string de couleur soit un objet définissant les différents states suivants:
<ul>
  <li><strong>base</strong> (<em>string</em>)</li>
  <li><strong>hover</strong> (<em>string</em>)</li>
  <li><strong>focus</strong> (<em>string</em>)</li>
  <li><strong>errored</strong> (<em>string</em>)</li>
  <li><strong>erroredHover</strong> (<em>string</em>)</li>
  <li><strong>erroredFocus</strong> (<em>string</em>)</li>
</ul>

Sélecteurs:
<ul>
  <li><strong>text</strong> (<em>string, state{}</em>)</li>
  <li><strong>bg</strong> (<em>string, state{}</em>)</li>
  <li><strong>border</strong> (<em>string, state{}</em>)</li>
  <li><strong>innerBorder</strong> (<em>string, state{}</em>)</li>
  <li><strong>shadow</strong> (<em>string, state{}</em>)</li>
  <li><strong>rounded</strong> (<em>string, state{}</em>)</li>
  <li><strong>width</strong> (<em>string, state{}</em>)</li>
  <li><strong>height</strong> (<em>string, state{}</em>)</li>
</ul>

_Note_: Le background peut prendre une opacité, de 10 à 100 par interval de 10
_Note_: L'ensemble des variantes peuvent être personnalisées dans le fichier _presets

#### Quelques exemples de sélecteurs
```ts
bg: {
  focus: 'accent-70',
  hover: 'primary-50',

  errored: 'danger-50',
  erroredHover: 'danger-70'
},
shadow: {
  base: 'secondary-dense',
  hover: 'primary'
},
rounded: {
  base: 'default',
  hover: 'slighter'
}
```


## Exemple concret

### Template
```html
<div>
  <h1 class="bg-primary-hover text-italic-hover smooth width-fit">Build'O'Form</h1>

  <build-o-form
    v-model="state.user"

    :fields="stateless.fields"
    :styles="{
      steps: stateless.stepStyle,
      row: stateless.rowStyle,
      field: stateless.fieldStyle,
    }"

    @event:field-touched="(e: IField) => methods.handleEvent('fieldTouched', e)"
    @event:model-updated="(e: any) => methods.handleEvent('modelUpdated', e)"
    @event:form-submitted="(e: boolean) => methods.handleEvent('formSubmitted', e)"
    @event:step-change="(e: IStep) => methods.handleEvent('stepChange', e)"

    @submit="methods.submit"
  >
    <template v-slot:firstbase-title="{ step }">
      Slot: {{ step.name }}
    </template>
    <template v-slot:firstbase-desc>
      Now that's a firstbase
    </template>
  </build-o-form>
</div>
```

### Script
```ts
import { defineComponent, onMounted, reactive, watch } from 'vue';


import { IField, IStep } from './../../components/buildoform/lib/interfaces/field.interface';
import { IStepStyle, IFieldStyle, IRowStyle } from './../../components/buildoform/lib/interfaces/style.interface';

import BuildOForm from './../../components/buildoform/Index.vue'
import { useQuasar } from 'quasar';

export default defineComponent({
  props: {},
  emits: [],
  components: {
    BuildOForm
  },
  setup(props, ctx) {
    const $q = useQuasar()

    const state = reactive({
      user: {
        id: 1337,
        firstName: null,
        lastName: 'Conda',
        gender: null,
        condition: 'scared',
        likes: '',
        footSize: 42,
        lastFullyChargedPhone: '1969-04-20'
      }
    });

    const stateless = {
      stepStyle: {
        container: 'q-ml-md',
        title: 'q-mb-none',
        desc: ''
      } as IStepStyle,

      rowStyle: {
        orientation: 'row',

        items: 'center',
        justify: 'center',

        colGutter: 'sm',
      } as IRowStyle,

      fieldStyle: {
        directives: {
          color: 'primary',
          outlined: true,
        },

        static: 'q-pa-sm q-ma-sm smooth-slow',

        bg: {
          focus: 'accent-70',
          hover: 'primary-50',

          errored: 'danger-50',
          erroredHover: 'danger-70'
        },
        shadow: {
          // base: 'secondary-dense',
          // hover: 'primary'
        },
        rounded: {
          base: 'default',
          hover: 'slighter',
        },
      } as IFieldStyle,

      fields: [
        {
          is: 'QInput',
          ref: 'firstname',
          step: {
            name: 'First base',
            value: 'firstbase',
            desc: 'bip boup',
            display: true
          },
          cols: {
            base: 12,
            md: 4,
            sm: 6
          },
          conditions: [
            { model: 'firstName', value: 'aze' }
          ],

          model: 'firstName',
          required: true,

          label: 'Prénom',
          placeholder: 'Nom',
        },
        {
          is: 'QInput',
          ref: 'lastname',
          step: 'firstbase',
          cols: {
            base: 12,
            md: 4,
            sm: 6
          },
          conditions: [
            { model: 'firstName', value: 'aze' }
          ],

          model: 'lastName',
          required: true,

          label: 'Nom',
          placeholder: 'Prénom'
        },
        {
          is: 'QSelect',
          ref: 'gender',
          step: 'firstbase',
          cols: {
            base: 12,
            md: 4,
            sm: 6
          },

          model: 'gender',
          conditions: [
            { model: 'firstName', value: 'not:Morice' },
            { model: 'lastName', value: 'not:Denice' },
            { model: 'firstName', value: 'aze' }
          ],

          label: 'Genre',
          placeholder: 'Renseignez votre genre',

          emitValue: true,
          mapOptions: true,
          optionValue: 'value',
          optionLabel: 'label',

          options: [
            {
              label: 'Homme',
              value: 'male',
            },
            {
              label: 'Femme',
              value: 'female',
            },
            {
              label: 'Autre',
              value: 'other',
              conditions: [
                { model: 'firstName', value: 'Anna' },
                { model: 'lastName', value: 'Conda' },
              ]
            },
          ],
        },
        {
          is: 'BOptionGroup',
          ref: 'condition',
          step: {
            name: 'Lookin goood...',
            desc: 'keep going',
            value: 'lookingood',
            display: true
          },
          cols: 'grow',

          title: 'Je suis..',

          model: 'condition',
          options: [
            { label: 'Vivant', value: 'alive' },
            { label: 'Terrifié par les arachnides', value: 'scared', color: 'red' },
            { label: 'Allergique à la photosynthèse', value: 'allergic' },
            { label: 'Autre', value: 'other' },
          ],
        },
        {
          is: 'BOptionGroup',
          ref: 'condition',
          step: 'lookingood',
          cols: '6',

          title: 'J\'aime..',
          required: true,

          emitValue: true,
          mapOptions: true,
          optionValue: 'value',
          optionLabel: 'label',

          conditions: [
            { model: 'condition', value: 'not:other' }
          ],

          model: 'likes',
          options: [
            { label: 'Les CDs de Pascal Obispo', value: 'obispo' },
            { label: 'Les fermes d\'huitres', value: 'oster', conditions: [{ model: 'condition', value: 'allergic'}] },
            { label: 'Les réconstitutions du débarquement', value: 'debark', conditions: [{ model: 'condition', value: 'not:alive'}] },
            { label: 'La faune et flore de la Meurte et Moselle', value: 'fnf', conditions: [{ model: 'condition', value: 'not:allergic'}, { model: 'condition', value: 'not:scared'}] },
          ],
        },
        {
          is: 'BSlider',
          ref: 'footsize',
          step: 'dayum',
          cols: {
            xs: 12,
            sm: 6,
            md: 12
          },

          title: 'Pointure',
          label: true,

          model: 'footSize',
          min: 30,
          max: 50,
        },
        {
          is: 'BDatePicker',
          ref: 'lastFullyChargedPhone',
          step: 'dayum',
          cols: {
            xs: 12,
            sm: 6,
            md: 12
          },

          title: 'Dernière charge complète (téléphone)',
          infophrase: 'super important',
          infophraseIcon: 'mdi-cactus',

          model: 'lastFullyChargedPhone',
        }
      ] as IField[]
    };

    const methods = {
      submit () {
        console.log({ user: state.user })
        alert('oy')
      },
      handleEvent (type: string, event: any) {
        // console.log({ type, event })
      },
      log (args: any) {
        console.log({ args })
      }
    };

    const computedState = {
    };

    onMounted(() => {
      $q.dark.set(false)
    })


    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    return {
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
```