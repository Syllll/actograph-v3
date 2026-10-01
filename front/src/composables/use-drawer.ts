import { reactive } from 'vue';

const sharedState = reactive({
  showDrawer: true,
  // Icon rail: drawer stays open, labels hide. Toggle lives on the drawer.
  mini: false,
});

export const useDrawer = () => {
  return {
    sharedState,
  };
};
