import { useRouter } from 'vue-router';

export const menuItems = () => {
  const router = useRouter();

  return [
    {
      label: 'Pages',
      name: 'cms_admin_pages',
      action: () => {
        router.push({
          name: 'cms_admin_pages',
        });
      },
    },
    {
      label: 'Blocs',
      name: 'cms_admin_blocs',
      action: () => {
        router.push({
          name: 'cms_admin_blocs',
        });
      },
    },
  ];
};
