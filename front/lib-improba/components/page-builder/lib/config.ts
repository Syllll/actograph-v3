import configUsedInProject from './../config';
import mergeDeep from './utils/merge-deep';
import configDefault from './config-default';

// Loop on each default component (the ones within the lib)
for (const compo of Object.values(configDefault.components)) {
  compo.__isDefault = true;
}

const configMerged = mergeDeep(configDefault, configUsedInProject);

const config = {
  ...configMerged,
};

export default config;
