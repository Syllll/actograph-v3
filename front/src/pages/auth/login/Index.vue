<template>
  <DPage>
    <Login />
  </DPage>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref, watch } from 'vue';
import Login from 'src/../lib-improba/components/auth/Login.vue';

export default defineComponent({
  name: 'AuthLogin',
  components: { Login },
  setup(props, { emit }) {
    return {};
  },
});
</script>
