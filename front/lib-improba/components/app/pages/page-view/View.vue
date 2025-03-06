<template>
  <div class="fit col column">
    <template v-if="!props.extendedHeader">
      <slot name="title">
        <DPageTitle :name="props.title" />
      </slot>
    </template>
    <template v-else>
      <div class="col-auto row q-pt-none q-mb-md full-width justify-start">
        <div :class="`col-12 col-sm-4 col-md-3 text-h6 row items-start`">
          <template v-if="props.backBtnPrefix.length">
            <q-btn
              :icon="props.backBtnRoute ? 'keyboard_arrow_left' : undefined"
              size="0.9em"
              flat
              dense
              no-caps
              @click="methods.navigate(props.backBtnRoute)"
            >
              <q-icon v-if="icon" :name="icon" />
              {{ props.backBtnName }}
            </q-btn>
          </template>
          <template v-else>
            <div v-for="s in props.backBtnPrefix" :key="s.name">
              <q-btn
                icon="keyboard_arrow_left"
                size="0.9em"
                flat
                dense
                no-caps
                @click="methods.navigate(s.route)"
              >
                <q-icon v-if="s.icon" :name="s.icon" />
                {{ s.name }}
              </q-btn>
            </div>
            <q-btn
              icon="keyboard_arrow_left"
              size="0.9em"
              flat
              dense
              no-caps
              @click="methods.navigate(props.backBtnRoute)"
            >
              <q-icon v-if="icon" :name="icon" />
              {{ props.backBtnName }}
            </q-btn>
          </template>
        </div>

        <div
          v-if="title"
          :class="'col-12 col-sm-4 col-md-6 text-bold text-body1 row items-center justify-center'"
        >
          <slot name="title">
            <span class="ellipsis">{{ props.title }}</span>
          </slot>
        </div>

        <div :class="'col-12 col-sm-4 col-md-3 row items-center justify-end'">
          <slot name="actions"> </slot>
        </div>
      </div>
    </template>
    <div :class="'col column items-start ' + (props.padding ? 'q-pa-sm' : '')">
      <div
        :class="
          'col-grow relative-position fit column ' +
          (props.padding ? 'q-pa-sm' : '')
        "
      >
        <!-- rounded-borders shadow-4  -->
        <DScrollArea class="col column fit">
          <div class="fit column" style="flex: 1">
            <slot> </slot>
          </div>
        </DScrollArea>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive } from 'vue';

import { DPageTitle } from 'src/../lib-improba/components/app/pages';
// import CompaniesTable from 'pages/companies/subpages/CompaniesTable';
import { useRouter } from 'vue-router';

export default defineComponent({
  components: {
    DPageTitle,
  },
  props: {
    title: { type: String, default: () => null },
    titleIcon: { type: String, default: null },
    backBtnName: { type: String, default: '' },
    backBtnPrefix: {
      type: Array as PropType<{ name: string; route: string; icon: string }[]>,
      default: () => [],
    }, // [{route, icon, name}]
    icon: { type: String, default: null },
    backBtnRoute: {
      type: [Object, String] as PropType<string | { name: string }>,
      default: '',
    },
    extendedHeader: {
      type: Boolean,
      default: false,
      description:
        'This will enable a header with a back button and an "actions" slot.',
    },
    padding: { type: Boolean, default: false },
    beforeNavigate: {
      type: Function,
      default: () => true,
    },
  },
  setup(props) {
    const router = useRouter();

    const state = reactive({});

    const methods = {
      async navigate(route: string | { name: string }) {
        const r = await props.beforeNavigate(route);
        if (!r) {
          return;
        }

        router.push(route);
      },
    };

    return {
      props,
      state,
      methods,
    };
  },
});
</script>
