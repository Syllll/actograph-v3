import { reactive } from 'vue';

const sharedState = reactive({
  showDrawer: true,
});

export const useDrawer = () => {
  return {
    sharedState,
  };
};
