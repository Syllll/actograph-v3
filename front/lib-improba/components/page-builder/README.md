# Table of content

<!-- prettier-ignore -->
- [Table of content](#markdown-header-table-of-content)
- [Introduction](#markdown-header-introduction)
- [How to setup and use](#markdown-header-how-to-setup-and-use)
    - [Simple setup and use](#markdown-header-simple-setup-and-use)
    - [Add a custom component to the page builder](#markdown-header-add-a-custom-component-to-the-page-builder)

# Introduction

The page builder is a VueJS component developed to help a user to build a page with a simple interface. The main idea is to provide a user with a simple interface to build a page with a point and click system. The user can sekect components from a list of available components and "paste" them in its page. The page builder will then render the component in the page in real time.

For a developer, the main advantage is the integration with VueJS. It is easy to create a new component and add it to the list of available components. The component will then be available in the page builder, its props will be available in the properties panel of the interface and its referenced slots will be considered as free spaces for other components to be put in. The whole page is represented as a JSON object, which can be saved in a database, sent to a server or simply downloaded for later use.

The code within `lib` is "internal stuff" of the lib that should not lightly be tempered with. A confirmed developer should be able to understand it, but it is not meant to be used by a developer that is not familiar with the code.

# How to setup and use

## Simple setup and use

The page builder is a VueJS component. It is available in the `@components/page-builder` folder. It is used in the `@views/admin/pages/page-builder` page folder, as an [editor](/src//pages/page-builder/editor/Index.vue) and as a [viewer](/src//pages/page-builder/viewer/Index.vue).

To use the page-builder as a simple viewer, one just need to do as follow:

```vue
<template>
  <PageBuilderViewer />
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import { PageBuilderViewer } from '@components/page-builder';

export default defineComponent({
  components: {
    PageBuilderViewer,
  },
  setup() {},
});
</script>
```

To use it as an editor, one just need to do as below. Note we added a `v-model` to the component. This is the way to pass the JSON object representing the page to the component. The component will then render the page in real time. If the JSON object is null (as here) then it will be replaced by a default version. Each time the user changes the page, the JSON object will be updated and the reactive variable (`state.pageBuilderJson`) will follow.

```vue
<template>
  <DPage>
    <div class="fit">
      <PageBuilderEditor v-model="state.pageBuilderJson" />
    </div>
  </DPage>
</template>
<script lang="ts">
import { defineComponent, watch, reactive } from 'vue';
import { PageBuilderEditor } from '@components/page-builder';

export default defineComponent({
  components: {
    PageBuilderEditor,
  },
  setup() {
    const state = reactive({
      pageBuilderJson: null,
    });
    const methods = {};

    watch(
      () => state.pageBuilderJson,
      (newVal) => {
        // console.log('newVal', newVal);
      },
      { deep: true }
    );

    return {
      methods,
      state,
    };
  },
});
</script>
```

## Add a custom component to the page builder

To add a custom component to the page builder, a developer just has to:

1. Create a component somewhere in its project
2. Register the component in the `@components/page-builder/config.ts` [file](/src/components/page-builder/config.ts).
3. Ensure the component has a builderOptions entry (below the "props" entry) and, eventually, customize a bit its props to adjust the UI rendering.

For example, a given "A component" located in @components/A.vue should be registered as follow:

```ts
import A from '@components/A.vue';

export default {
  defaultJson: {}, // A default JSON object to be used when the user does not pass a json props, if you want to change the built-in default.
  components: { A }, // The components that will be available in the editor, aside the ones that are built-in.
};
```

And the component in itself should be something like:

```vue
<template>
  <div class="fit column">
    <div class="col-auto">
      <p>Text: {{ props.text }}</p>
    </div>
    <div class="col-auto">
      <!-- This slot will be considered as a free space for other components to be put in. It is LISTED in the builderOptions. -->
      <slot name="default"></slot>
    </div>
    <div class="col-auto">
      <!-- This slot will NOT be considered as a free space since it is NOT LISTED in the builderOptions. -->
      <slot name="addition"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    // Here, style cannot be used as it is reserverved by vue. Instead, use somethint like:
    // customStyle: {type: String, label: 'Style', default: '', description: 'A custom style to be applied to the component.'},
    text: {
      type: String,
      required: false,
      default: 'toto',
      // label: 'Text', // The label to be used in the properties panel of the editor ui, if undefined then the prop name will be used.
      // description: 'A text to be displayed.', // A description of the prop, used in the editor ui.
      // editor: true, // If the type=String then the addition of the editor entry will allow to use a rich text editor for this prop.
      // hide: true, // The prop will not be displayed in the properties panel of the editor ui.
      // rules: [v => !!v || 'Text is required'], // The rules to be used to validate the prop, used in the editor ui.
      // hide: true, // If true, the prop will not be displayed in the properties panel of the editor ui.
    },
  },
  // builderOptions is REQUIRED
  builderOptions: {
    slots: ['default'], // The slots listed here will be considered as free spaces for other components to be put in.
    category: 'Example', // A category to group components together in the editor.
    description: 'A simple component, version A.', // A description of the component.
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
```
