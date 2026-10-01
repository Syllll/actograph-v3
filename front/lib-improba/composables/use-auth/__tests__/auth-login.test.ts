import type { Router } from 'vue-router';
import { useAuth } from '../index';
import authService from '@services/users/auth.service';
import { UserService } from '@services/users/user.service';

jest.mock('quasar', () => ({ Cookies: { remove: jest.fn() } }));
jest.mock(
  'src/../lib-improba/boot/axios',
  () => ({
    api: () => ({ defaults: { headers: { common: {} } } }),
  }),
  { virtual: true }
);
jest.mock('@services/users/auth.service', () => ({
  __esModule: true,
  default: { login: jest.fn() },
}));
jest.mock('@services/users/user.service', () => ({
  UserService: { getCurrentUser: jest.fn() },
}));
jest.mock('../axios', () => ({ init: jest.fn() }));
jest.mock('../router', () => ({ init: jest.fn() }));

describe('login navigation during desktop startup', () => {
  let auth: ReturnType<typeof useAuth>;
  let router: Router;
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );

  beforeEach(() => {
    jest.useFakeTimers();
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    (authService.login as jest.Mock).mockResolvedValue({ token: 'TOKEN' });
    (UserService.getCurrentUser as jest.Mock).mockResolvedValue({ id: 1 });
    router = { push: jest.fn() } as unknown as Router;
    auth = useAuth(router);
  });

  afterEach(() => {
    auth.methods.logout();
    jest.useRealTimers();
    if (previousStorage)
      Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  test('authenticates without leaving the loading page before access validation', async () => {
    await auth.methods.login('local-user', 'password', { redirect: false });
    expect(auth.sharedState.user).toEqual({ id: 1 });
    expect(localStorage.getItem('token')).toBe('TOKEN');
    expect(router.push).not.toHaveBeenCalled();
  });

  test('keeps the existing redirect for ordinary login', async () => {
    await auth.methods.login('user', 'password');
    expect(router.push).toHaveBeenCalledWith('/');
  });
});
