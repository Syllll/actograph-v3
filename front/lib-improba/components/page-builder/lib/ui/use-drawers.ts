import { onMounted, reactive, watch } from 'vue'
import { useTree } from '../tree';
import { IDrawer, IDrawerState, ITab, TDrawerTypes } from './interfaces/drawers.interface';

const defaultDrawer = {
  width: '25rem',
  active: false,
  show: true,
  sticky: false
} as IDrawer

const sharedState = reactive({
  left: { ...defaultDrawer } as IDrawer,
  right: { ...defaultDrawer } as IDrawer,

  tabs: null as ITab[]|null,

  showOnHover: false,

  frame: {
    minWidth: 100,
    minHeight: 300,

    width: window.innerWidth - 100 + 'px',
    height: window.innerHeight - 100 + 'px'
  },
})

export const useDrawers = (
  myTreeId: string,
  params?: {
    tabs?: ITab[]
  }) => {

  const tree = useTree(myTreeId);
  const treeState = tree.sharedState;

  const stateless = {
    toolbar: {
      sizes: {
        mobile: {
          icon: 'mdi-cellphone',
          width: 420,
          height: 900,
        },
        tablet: {
          icon: 'mdi-tablet',
          width: 1000,
          height: 640,
        },
        desktop: {
          icon: 'mdi-laptop',
          width: 1500,
          height: 1000,
        },
        screen: {
          icon: 'mdi-fit-to-screen-outline',
          width: () => window.innerWidth - 100 + 'px',
          height: () => window.innerHeight - 100 + 'px',
        }
      }
    }
  }
  const state = reactive({
    altMode: false,
  })

  const methods = {
    toggleDrawerState (field: keyof IDrawerState, type?: TDrawerTypes|null, state?: boolean) {
      if (!type) {
        const newState = state ?? !(sharedState.left[field] && sharedState.right[field])

        sharedState.left[field] = newState
        sharedState.right[field] = newState

        switch (field) {
          case 'show':
            !newState && methods.toggleDrawerState('active', type, false)
        }

        return
      }

      sharedState[type][field] = state ?? !sharedState[type][field]
    },
    openTab(tab: string) {
      sharedState.left.currentTab = tab
      sharedState.left.show = true
    },
  }

  watch(
    () => treeState.selected,
    (selected: any) => {
      if (selected) {
        sharedState.left.show = true
        sharedState.left.currentTab = 'selectedComponent'
      }
    }
  )

  onMounted(() => {
    if (params?.tabs?.length) {
      sharedState.tabs = params.tabs
    }
    if (!sharedState.left.currentTab && params?.tabs?.length) {
      sharedState.left.currentTab = params.tabs[0].name
    }
  })

  return {
    stateless,
    state,
    sharedState,
    methods,
  }
}
