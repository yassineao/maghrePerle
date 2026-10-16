import { expect, test as base, type Page } from '@playwright/test';
import { environment } from '../environment';

const admin = { id: 'admin-1', name: 'Test Admin', email: 'admin@example.com', role: 'ADMIN' };
const accessToken = 'playwright-access-token';

interface MockApi {
  user: typeof admin | null;
  rejectLogin: boolean;
  loginRequests: unknown[];
  adminProductReads: number;
  categoryReads: number;
  refreshRequests: number;
}

// Exercise the real router, forms and HTTP services without contacting live APIs.
const test = base.extend<{ api: MockApi }>({
  api: async ({ page, baseURL }, use) => {
    const api: MockApi = {
      user: null,
      rejectLogin: false,
      loginRequests: [],
      adminProductReads: 0,
      categoryReads: 0,
      refreshRequests: 0,
    };
    const unexpectedRequests: string[] = [];
    const apiOrigins = new Set(
      [environment.apiUrlAuth, environment.apiUrl, environment.supabaseUrl].map(
        (url) => new URL(url).origin,
      ),
    );

    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === new URL(baseURL!).origin) {
        await route.continue();
        return;
      }
      if (!apiOrigins.has(url.origin)) {
        await route.abort();
        return;
      }
      if (url.pathname === '/user/me' && request.method() === 'GET') {
        const authorized =
          api.user && request.headers()['authorization'] === `Bearer ${accessToken}`;
        await route.fulfill({ status: authorized ? 200 : 401, json: authorized ? api.user : {} });
      } else if (url.pathname === '/user/login' && request.method() === 'POST') {
        api.loginRequests.push(request.postDataJSON());
        if (api.rejectLogin) {
          await route.fulfill({ status: 401, json: {} });
        } else {
          api.user = admin;
          await route.fulfill({
            json: {
              ...admin,
              accessToken,
              refreshToken: 'playwright-refresh-token',
              tokenType: 'Bearer',
            },
          });
        }
      } else if (url.pathname === '/user/refresh' && request.method() === 'POST') {
        api.refreshRequests++;
        await route.fulfill({ status: 401, json: {} });
      } else if (
        ['/rest/v1/products', '/product', '/product/active'].includes(url.pathname) &&
        request.method() === 'GET'
      ) {
        // The navbar loads public active products even while signed out.
        if (url.pathname !== '/product/active' && !url.searchParams.has('active')) {
          api.adminProductReads++;
        }
        await route.fulfill({ json: [] });
      } else if (
        ['/rest/v1/category', '/category'].includes(url.pathname) &&
        request.method() === 'GET'
      ) {
        api.categoryReads++;
        await route.fulfill({ json: [] });
      } else {
        unexpectedRequests.push(`${request.method()} ${url.pathname}`);
        await route.fulfill({ status: 501, json: { message: 'Unexpected API request in test' } });
      }
    });
    await use(api);
    expect(unexpectedRequests).toEqual([]);
  },
});

async function expectLogin(page: Page): Promise<void> {
  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('button', { name: 'Sign in securely' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Product name', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Product catalogue' })).toHaveCount(0);
}

async function fillLogin(page: Page, password = 'password123'): Promise<void> {
  await page.getByLabel('Email address').fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in securely' }).click();
}

test('redirects direct product management access without login', async ({ page, api }) => {
  await page.goto('/admin/products');
  await expectLogin(page);
  expect(api.adminProductReads).toBe(0);
  expect(api.categoryReads).toBe(0);
});

test('validates credentials without sending a login request', async ({ page, api }) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await expect(page.getByText('Enter your email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Enter your password.', { exact: true })).toBeVisible();
  await page.getByLabel('Email address').fill('invalid-email');
  await page.getByLabel('Password', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible();
  expect(api.loginRequests).toEqual([]);
  expect(api.categoryReads).toBe(0);
});

test('keeps products hidden when the credentials are rejected', async ({ page, api }) => {
  api.rejectLogin = true;
  await page.goto('/admin');
  await fillLogin(page, 'wrong-password');
  await expect(page.getByRole('alert')).toContainText('The email or password is incorrect.');
  await expectLogin(page);
  expect(api.loginRequests).toEqual([{ email: admin.email, password: 'wrong-password' }]);
  expect(api.categoryReads).toBe(0);
});

test('an admin can log in, open products, and reload the protected page', async ({ page, api }) => {
  await page.goto('/admin');
  await fillLogin(page);
  await expect(page.getByRole('heading', { name: 'Add a product', exact: true })).toBeVisible();
  expect(api.loginRequests).toEqual([{ email: admin.email, password: 'password123' }]);
  await page.getByRole('link', { name: 'Manage products', exact: true }).click();
  await expect(page).toHaveURL('/admin/products');
  await expect(page.getByRole('heading', { name: 'Product catalogue' })).toBeVisible();
  expect(api.adminProductReads).toBe(1);
  await page.reload();
  await expect(page).toHaveURL('/admin/products');
  await expect(page.getByRole('heading', { name: 'Product catalogue' })).toBeVisible();
  expect(api.adminProductReads).toBe(2);
});

test('signing out clears the session and blocks direct products access', async ({ page, api }) => {
  await page.goto('/admin');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expectLogin(page);
  expect(
    await page.evaluate(() =>
      ['user', 'accessToken', 'refreshToken'].map((key) => localStorage.getItem(key)),
    ),
  ).toEqual([null, null, null]);
  await page.goto('/admin/products');
  await expectLogin(page);
  expect(api.adminProductReads).toBe(0);
});

test('blocks a signed-in user without the admin role', async ({ page, api }) => {
  api.user = { ...admin, role: 'USER' };
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', token);
    },
    { user: api.user, token: accessToken },
  );
  await page.goto('/admin/products');
  await expectLogin(page);
  expect(api.adminProductReads).toBe(0);
  expect(api.categoryReads).toBe(0);
});

test('rejects a stale stored admin session when token refresh fails', async ({ page, api }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', 'expired-access-token');
    localStorage.setItem('refreshToken', 'expired-refresh-token');
  }, admin);
  await page.goto('/admin/products');
  await expectLogin(page);
  expect(api.refreshRequests).toBe(1);
  expect(api.adminProductReads).toBe(0);
  expect(api.categoryReads).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
});
