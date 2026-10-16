import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { CategoryService } from '../../core/api/category_api/category.service';
import { ProductsService } from '../../core/api/products_api/product.service';
import { ProductImageService } from '../../core/api/supabase_api/product_image.service';
import { UserService } from '../../core/api/user_api/user.service';
import { LoginResponse, UserResponse } from '../../core/interfaces/User';
import { AdminProductsPage } from '../admin-products/AdminProducts';
import { AdminPage } from './Admin';

describe('Admin access', () => {
  let fixture: ComponentFixture<AdminPage>;
  const admin: UserResponse = {
    id: 'admin-1',
    name: 'John Doe',
    email: 'admin@example.com',
    role: 'ADMIN',
  };
  const loginResponse: LoginResponse = {
    ...admin,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenType: 'Bearer',
  };
  const userService = { login: vi.fn(), getMe: vi.fn(), getStoredUser: vi.fn(), logout: vi.fn() };
  const productsService = { getProducts: vi.fn(), addProductsAndReturnCreated: vi.fn() };
  const categoryService = { getCategories: vi.fn(), addCategory: vi.fn() };
  const productImageService = { uploadPicture: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    userService.getMe.mockReturnValue(of(null));
    userService.getStoredUser.mockReturnValue(null);
    userService.login.mockReturnValue(of(loginResponse));
    productsService.getProducts.mockReturnValue(of([]));
    categoryService.getCategories.mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [
        provideRouter(routes),
        { provide: UserService, useValue: userService },
        { provide: ProductsService, useValue: productsService },
        { provide: CategoryService, useValue: categoryService },
        { provide: ProductImageService, useValue: productImageService },
      ],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function fill(element: HTMLElement, selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function submitLogin(element: HTMLElement): Promise<void> {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  it('hides product management and does not load admin data when logged out', async () => {
    const element = await render();
    expect(element.querySelector('#admin-email')).not.toBeNull();
    expect(element.querySelector('#product-name')).toBeNull();
    expect(element.querySelector('#category-name')).toBeNull();
    expect(element.querySelector('a[href="/admin/products"]')).toBeNull();
    expect(categoryService.getCategories).not.toHaveBeenCalled();
    expect(productsService.getProducts).not.toHaveBeenCalled();
    expect(productsService.addProductsAndReturnCreated).not.toHaveBeenCalled();
  });

  it('submits the entered credentials and shows product management on success', async () => {
    const element = await render();
    fill(element, '#admin-email', admin.email);
    fill(element, '#admin-password', 'password123');
    await submitLogin(element);
    expect(userService.login).toHaveBeenCalledExactlyOnceWith({
      email: admin.email,
      password: 'password123',
    });
    expect(element.querySelector('#admin-email')).toBeNull();
    expect(element.querySelector('#product-name')).not.toBeNull();
    expect(element.querySelector('a[href="/admin/products"]')).not.toBeNull();
    expect(element.textContent).toContain('Signed in as John Doe');
    expect(categoryService.getCategories).toHaveBeenCalledOnce();
  });

  it('rejects empty credentials and displays required-field messages', async () => {
    const element = await render();
    await submitLogin(element);
    expect(userService.login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Enter your email address.');
    expect(element.textContent).toContain('Enter your password.');
  });

  it('rejects an invalid email and a short password without calling login', async () => {
    const element = await render();
    fill(element, '#admin-email', 'invalid-email');
    fill(element, '#admin-password', '123');
    await submitLogin(element);
    expect(userService.login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Enter a valid email address.');
    expect(element.textContent).toContain('Password must be at least 6 characters.');
  });

  it.each([401, 403])('keeps products hidden when login returns %s', async (status) => {
    userService.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    const element = await render();
    fill(element, '#admin-email', admin.email);
    fill(element, '#admin-password', 'wrong-password');
    await submitLogin(element);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'The email or password is incorrect.',
    );
    expect(element.querySelector('#product-name')).toBeNull();
    expect(categoryService.getCategories).not.toHaveBeenCalled();
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('disables the login button while authentication is pending', async () => {
    const response = new Subject<LoginResponse>();
    userService.login.mockReturnValue(response);
    const element = await render();
    fill(element, '#admin-email', admin.email);
    fill(element, '#admin-password', 'password123');
    await submitLogin(element);
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    expect(element.querySelector('#product-name')).toBeNull();
    response.error(new HttpErrorResponse({ status: 401 }));
    await fixture.whenStable();
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('restores an existing admin session', async () => {
    userService.getMe.mockReturnValue(of({ ...admin, role: 'ROLE_ADMIN' }));
    const element = await render();
    expect(element.querySelector('#product-name')).not.toBeNull();
    expect(element.querySelector('#admin-email')).toBeNull();
    expect(userService.login).not.toHaveBeenCalled();
    expect(categoryService.getCategories).toHaveBeenCalledOnce();
  });

  it('keeps management hidden for an existing non-admin session', async () => {
    userService.getMe.mockReturnValue(of({ ...admin, role: 'USER' }));
    const element = await render();
    expect(element.querySelector('#admin-email')).not.toBeNull();
    expect(element.querySelector('#product-name')).toBeNull();
    expect(categoryService.getCategories).not.toHaveBeenCalled();
  });

  it('returns to login and hides management after signing out', async () => {
    userService.getMe.mockReturnValue(of(admin));
    const element = await render();
    const signOut = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Sign out',
    )!;
    signOut.click();
    await fixture.whenStable();
    expect(userService.logout).toHaveBeenCalledOnce();
    expect(element.querySelector('#admin-email')).not.toBeNull();
    expect(element.querySelector('#product-name')).toBeNull();
    expect(element.querySelector('a[href="/admin/products"]')).toBeNull();
  });

  it.each([null, { ...admin, role: 'USER' }])(
    'redirects unauthorized direct products access to login: %j',
    async (user) => {
      userService.getMe.mockReturnValue(of(user));
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/admin/products', AdminPage);
      expect(TestBed.inject(Router).url).toBe('/admin');
      expect(harness.routeNativeElement?.querySelector('#admin-email')).not.toBeNull();
      expect(productsService.getProducts).not.toHaveBeenCalled();
      expect(categoryService.getCategories).not.toHaveBeenCalled();
    },
  );

  it.each(['ADMIN', 'ROLE_ADMIN'])(
    'allows direct products access for an authenticated %s',
    async (role) => {
      userService.getMe.mockReturnValue(of({ ...admin, role }));
      userService.getStoredUser.mockReturnValue({ ...admin, role });
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/admin/products', AdminProductsPage);
      expect(TestBed.inject(Router).url).toBe('/admin/products');
      expect(harness.routeNativeElement?.textContent).toContain('Product catalogue');
      expect(productsService.getProducts).toHaveBeenCalledOnce();
    },
  );
});
