import * as generalComponents from 'src/../lib-improba/components';
import { App } from 'vue';

export const boot = (options: { app: App<any> }) => {
  // ***********
  // Improba components
  // ***********

  console.log('Registering Improba components...');
  // Loop on each "general" component to register it as global
  for (const compoName in generalComponents) {
    options.app.component(compoName, (<any>generalComponents)[compoName]);
  }
  console.log('Registering Improba components done.');

  // ***********
};
