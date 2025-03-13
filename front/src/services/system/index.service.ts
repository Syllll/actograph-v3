const electronApi = window.api;

export default {
  exit: () => electronApi.invoke('exit'),
  maximize: () => electronApi.invoke('maximize'),
  minimize: () => electronApi.invoke('minimize'),
};
