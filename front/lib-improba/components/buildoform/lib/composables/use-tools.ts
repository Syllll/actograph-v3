export const useTools = () => {
  const methods = {
    exists(val: any) {
      const target = typeof val === 'string' ? val?.trim() : val;

      return !['', null, undefined].includes(target);
    },

    mapIntoKebab(str: string): string {
      if (!str) {
        return '';
      }

      return str.replace(/([A-Z])/g, (e) => '-' + e.toLowerCase());
    },
  };

  return {
    methods,
  };
};
