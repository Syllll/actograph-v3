import { useRouter } from 'vue-router';

export const menuItems = () => {
  const router = useRouter();

  return [
    {
      label: 'Users',
      action: () => {
        router.push({
          name: 'admin_users_list',
        });
      },
    },
  ];
};
