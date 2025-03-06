<template>
  <PageBuilderEditor
    v-if="state.json"
    :builderVars="state.builderVars"
    :builderStyle="{ colors: {} }"
    v-model="state.json"
    :blocId="state.blocId"
  />
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PageBuilderEditor } from '@lib-improba/components/page-builder';
import { adminPageService } from '@lib-improba/services/cms/admin/pages/index.service';
import { blocService } from '@lib-improba/services/cms/blocs/index.service';

export default defineComponent({
  components: {
    PageBuilderEditor,
  },
  props: {
    blocId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const router = useRouter();
    const stateless = {
      menuItems: [],
    };
    const state = reactive({
      hasLayout: false as boolean,
      blocId: undefined as undefined | number,
      builderVars: {} as any,
      json: null as null | any,
    });

    onMounted(async () => {
      const editableBlocIdStr = props.blocId;
      let editableBlocId = undefined as undefined | number;
      if (editableBlocIdStr) {
        editableBlocId = parseInt(editableBlocIdStr);
      }
      if (!editableBlocId) {
        throw new Error('editableBlocId is required');
      }

      const bloc = await blocService.findOneWithContent({
        id: editableBlocId,
      });

      state.builderVars = {
        _EDITABLE_BLOC_ID: editableBlocId,
      };

      state.blocId = bloc.id;
      state.json = bloc.content;
    });

    return { stateless, state };
  },
});
</script>
