<template>
  <div class="full-width column q-gutter-y-md">
    <div class="row">
      <q-chip
        v-model:selected="state.case1"
        color="primary"
        text-color="white"
        icon="font_download"
      >
        Button 1 (toggleable)
      </q-chip>
      <q-chip v-model:selected="state.case2">
        <q-avatar icon="warning" color="yellow" text-color="white" />
        Button 2 (toggleable)
      </q-chip>
      <q-chip v-model:selected="state.case3">
        <q-avatar icon="warning" color="orange" text-color="white" />
        Button 3 (toggleable)
      </q-chip>
      <q-chip removable v-model="state.case4" @remove="methods.log('Button 4')">
        <q-avatar>
          <img src="/images/logo.png" />
        </q-avatar>
        Button 4 (removable)
      </q-chip>
      <q-chip
        clickable
        @click="methods.onBtntxtClick"
        color="white"
        text-color="black"
        icon="style"
      >
        {{ state.changeText }}
      </q-chip>
      <q-chip
        clickable
        @click="methods.onResetClick"
        color="cyan"
        text-color="black"
        icon="style"
      >
        Button 7 (reset)
      </q-chip>
    </div>
    <div>
      {{ state.changeText }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, ref } from 'vue';
export default defineComponent({
  setup() {
    const state = reactive({
      case1: false,
      case2: true,
      case3: false,
      case4: true,
      changeText: 'Button 4',
    });

    const methods = {
      onResetClick: () => {
        state.case1 = false;
        state.case2 = true;
        state.case3 = false;
        state.case4 = true;
        state.changeText = 'Hi there!';
      },
      onBtntxtClick: () => {
        state.changeText = 'Button 5';
      },
      log: (txt: string) => {
        console.log(txt);
      },
    };

    return {
      state,
      methods,
    };
  },
});
</script>
