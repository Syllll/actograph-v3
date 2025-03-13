import { Router } from 'vue-router';

function haveCommonEntry(arr1: string[], arr2: string[]): boolean {
  const found = arr1.some((r) => arr2.includes(r));
  return found;
}

export const init = (
  router: Router,
  auth: {
    methods: any;
    sharedState: any;
  }
) => {
  // Function to check if the user is allowed to access the route
  const checkAuth = (to: any, from: any, next: any) => {
    const record = to.matched.find((record: any) => record.meta.auth);

    if (record) {
      const requireAuth = record.meta.auth as boolean;

      if (requireAuth) {
        const user = auth.sharedState?.user;
        const userExists = user ? true : false;
        const userLoggedIn: boolean = userExists && user.id;
        let allowAccessToRoute = userLoggedIn;
        //console.log({user, userExists, userLoggedIn, allowAccessToRoute})

        const accessRoles = record.meta.access as string[] | undefined;
        if (accessRoles) {
          const isAccessRolesFilled = accessRoles?.length > 0;
          const userHasRole =
            userLoggedIn && haveCommonEntry(accessRoles, user.roles);

          allowAccessToRoute =
            userLoggedIn && isAccessRolesFilled && userHasRole;
        }

        if (!allowAccessToRoute) {
          console.warn('not allowed');
          next({
            name: 'auth_login',
            query: {
              r: to.fullPath,
            },
          });
          return;
        }
      }
    }

    next();
  };

  // Register the check auth function to the router
  router.beforeEach(checkAuth);

  // If electron
  if (process.env.MODE === 'electron') {
    // Get the url param named targetRoute
    const url = new URL(window.location.href);
    const targetRoute = url.searchParams.get('targetRoute');
    if (targetRoute) {
      router.push(targetRoute);
    }
  }

  // We call the check auth function manually here so that it will trigger at startup
  // If not call, it does not fire because the route is already resolve when we init the app
  checkAuth(
    router.currentRoute.value,
    null,
    (options?: {
      name: string;
      query: {
        r: string;
      };
    }) => {
      if (options) {
        router.push({
          name: options.name,
          query: options.query,
        });
      }
    }
  );
};
