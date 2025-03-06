<template>
  <div class="row q-gutter-md">
    <q-chip color="blue" text-color="white" icon="font_download">
      Couleur unie
    </q-chip>
    <q-chip>
      <q-avatar icon="warning" color="yellow" text-color="white" />
      Fond coloré pour l'icone uniquement
    </q-chip>
    <q-chip>
      <q-avatar color="red" text-color="white">42</q-avatar>
      Texte à la place de l'icone
    </q-chip>
    <q-chip>
      <q-avatar>
        <img src="/images/logo.png" />
      </q-avatar>
      Image à la place de l'icone
    </q-chip>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  setup() {},
});
</script>
