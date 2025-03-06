export const extractAvailComponents = (options: {
  components: { [key: string]: any };
  filterAvailableComponents?: (components: string[]) => string[] | null;
}): { [key: string]: any }[] => {
  const registeredComponents = Object.keys(options.components);
  let availComponentsKeys = registeredComponents;
  if (options.filterAvailableComponents) {
    const filteredComponents =
      options.filterAvailableComponents(registeredComponents);
    if (filteredComponents) {
      availComponentsKeys = filteredComponents;
    }
  }

  const availComponents = Object.entries(options.components).filter(
    (compo: any) => {
      const compoName = compo[0];
      return availComponentsKeys.includes(compoName);
    }
  );

  return availComponents;
};
