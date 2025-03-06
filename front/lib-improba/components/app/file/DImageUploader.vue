<style scoped>
.q-img__content > div {
  background: transparent;
}
</style>

<template>
  <div>
    <q-img
      :src="state.image"
      :ratio="props.ratio"
      :height="props.height"
      class="bg-grey"
    >
      <div class="absolute-center rounded-borders" v-if="!state.image">
        <!-- <q-icon name="photo" size="lg" /> -->
        Image
      </div>
      <!-- <div class="absolute-bottom">Modifier</div> -->
      <q-uploader
        color="transparent"
        bgColor="transparent"
        :factory="(files: any) => props.factory(files)"
        @uploaded="(response: any) => methods.handleXhrResponse(response)"
        flat
        auto-upload
        accept=".jpg, image/*"
        style="max-width: 100px"
      >
        <template v-slot:header="scope">
          <q-btn
            type="a"
            icon="add_box"
            size="lg"
            @click="scope.pickFiles"
            round
            dense
            flat
          >
            <q-uploader-add-trigger />
            <q-tooltip>Choisir un fichier</q-tooltip>
          </q-btn>
        </template>
        <template v-slot:list> </template>
      </q-uploader>
    </q-img>

    <div class="row items-center" v-if="state.image">
      <div class="col-10 ellipsis">
        <a :href="state.image" target="_blank" class="text-caption text-grey">{{
          state.image
        }}</a>
      </div>
      <div class="col-2 text-right">
        <q-btn icon="close" flat @click="state.image = ''" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';

export default defineComponent({
  name: 'DImageUploader',
  props: {
    modelValue: {
      type: String,
      required: false,
    },
    factory: {
      type: Function,
      required: true,
    },
    ratio: {
      type: String,
      default: '1.5',
    },
    height: {
      type: String,
      default: '200px',
    },
  },
  emits: ['update:modelValue', 'uploaded'],
  setup(props, { emit }) {
    const state = reactive({
      image: props.modelValue || '',
    });

    const methods = {
      // Parse the Response Text into JSON before handling it to the @uploaded handler
      handleXhrResponse(data: any) {
        console.log('uploaded', { data });
        const response = data.xhr?.response
          ? JSON.parse(data.xhr.response)
          : '';
        emit('uploaded', response);
      },
    };

    watch(
      () => props.modelValue,
      (value) => {
        state.image = value || '';
      }
    );

    watch(
      () => state.image,
      (value) => {
        emit('update:modelValue', value);
      }
    );

    return {
      state,
      methods,
      props,
    };
  },
});
</script>
