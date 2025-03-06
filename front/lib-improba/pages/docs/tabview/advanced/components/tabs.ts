import Tab1 from './Tab1/Index.vue';
import Tab2 from './Tab2/Index.vue';

export const tabsComponents = {
  Tab1,
  Tab2,
};

export const tabs = [
  {
    name: 'Tab1',
    component: 'Tab1',
    label: 'Tab1',
    visible: () => {
      return true;
    },
  },
  {
    name: 'Tab2',
    component: 'Tab2',
    label: 'Tab2',
    visible: () => {
      return true;
    },
  },
];
