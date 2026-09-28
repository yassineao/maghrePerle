import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, switchMap, tap } from 'rxjs';
import { CategoryService } from '../../core/api/category_api/category.service';
import {
  ProductCreateRequest,
  ProductsService,
} from '../../core/api/products_api/product.service';
import { UserService } from '../../core/api/user_api/user.service';
import { ProductImageService } from '../../core/api/supabase_api/product_image.service';
import { Category } from '../../core/interfaces/Category';
import { UserResponse } from '../../core/interfaces/User';

interface SelectedImage {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './Admin.html',
})
export class AdminPage implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly userService = inject(UserService);
  private readonly productsService = inject(ProductsService);
  private readonly productImageService = inject(ProductImageService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly authenticatedUser = signal<UserResponse | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesLoading = signal(false);
  protected readonly categorySubmitting = signal(false);
  protected readonly categoryErrorMessage = signal<string | null>(null);
  protected readonly categorySuccessMessage = signal<string | null>(null);
  protected readonly productSubmitting = signal(false);
  protected readonly productErrorMessage = signal<string | null>(null);
  protected readonly productSuccessMessage = signal<string | null>(null);
  protected readonly selectedColors = signal<string[]>([]);
  protected readonly colorsTouched = signal(false);
  protected readonly selectedImages = signal<SelectedImage[]>([]);
  protected readonly imageSelectionError = signal<string | null>(null);
  protected readonly commonColors = [
    '#1F2937',
    '#FFFFFF',
    '#A52A2A',
    '#7F1D1D',
    '#C2410C',
    '#D4AF37',
    '#166534',
    '#1D4ED8',
    '#6D28D9',
    '#DB2777',
  ];

  protected readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly productForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    tags: [''],
    sizes: ['', Validators.required],
    colorPicker: ['#A52A2A'],
    categoryId: ['', Validators.required],
    active: [true],
  });

  protected readonly categoryForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.userService
      .getMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user?.role.toUpperCase().replace(/^ROLE_/, '') === 'ADMIN') {
          this.authenticatedUser.set(user);
          this.loadCategories();
        }
      });
  }

  protected submit(): void {
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.userService
      .login(this.loginForm.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: ({ id, name, email, role }) => {
          this.authenticatedUser.set({ id, name, email, role });
          this.loginForm.reset();
          this.loadCategories();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected signOut(): void {
    this.userService.logout();
    this.authenticatedUser.set(null);
    this.categories.set([]);
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      quantity: 0,
      tags: '',
      sizes: '',
      colorPicker: '#A52A2A',
      categoryId: '',
      active: true,
    });
    this.productErrorMessage.set(null);
    this.productSuccessMessage.set(null);
    this.clearVariantSelections();
  }

  protected addProduct(): void {
    this.productErrorMessage.set(null);
    this.productSuccessMessage.set(null);

    this.colorsTouched.set(true);
    this.imageSelectionError.set(
      this.selectedImages().length === 0 ? 'Choose at least one product image.' : null,
    );

    if (
      this.productForm.invalid ||
      this.selectedColors().length === 0 ||
      this.selectedImages().length === 0
    ) {
      this.productForm.markAllAsTouched();
      return;
    }

    const value = this.productForm.getRawValue();
    const sizes = this.parseList(value.sizes);
    const colors = this.selectedColors();
    const tags = this.parseList(value.tags);
    const images = this.selectedImages();
    const products: ProductCreateRequest[] = sizes.flatMap((size) =>
      colors.map((color) => ({
        name: `${value.name.trim()} [${size}]${color}@`,
        description: value.description,
        price: value.price,
        quantity: value.quantity,
        tags,
        active: value.active,
        categoryId: value.categoryId,
      })),
    );

    this.productSubmitting.set(true);
    let productsCreated = false;
    this.productsService
      .addProductsAndReturnCreated(products)
      .pipe(
        tap((createdProducts) => {
          productsCreated = true;
          if (createdProducts.length !== products.length) {
            throw new Error('The created product IDs could not be resolved for image upload.');
          }
        }),
        switchMap((createdProducts) =>
          forkJoin(
            createdProducts.flatMap((product) =>
              images.map(({ file }, imageIndex) =>
                this.productImageService.uploadPicture(
                  product.id,
                  file,
                  `${value.name.trim()} product image`,
                  imageIndex === 0,
                ),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.productSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          const variantLabel = products.length === 1 ? 'variant' : 'variants';
          this.productSuccessMessage.set(
            `“${value.name.trim()}” was added with ${products.length} ${variantLabel}.`,
          );
          this.productForm.reset({
            name: '',
            description: '',
            price: 0,
            quantity: 0,
            tags: '',
            sizes: '',
            colorPicker: '#A52A2A',
            categoryId: '',
            active: true,
          });
          this.clearVariantSelections();
        },
        error: (error: HttpErrorResponse) => {
          this.productErrorMessage.set(
            productsCreated
              ? 'The product variants were created, but one or more images could not be uploaded. Do not submit the form again.'
              : this.getProductErrorMessage(error),
          );
        },
      });
  }

  protected addCategory(): void {
    this.categoryErrorMessage.set(null);
    this.categorySuccessMessage.set(null);

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const value = this.categoryForm.getRawValue();
    this.categorySubmitting.set(true);
    this.categoryService
      .addCategory({
        name: value.name.trim(),
        description: value.description.trim(),
        active: true,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.categorySubmitting.set(false)),
      )
      .subscribe({
        next: (category) => {
          this.categories.update((categories) =>
            [...categories.filter((item) => item.id !== category.id), category].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          this.productForm.controls.categoryId.setValue(category.id);
          this.categoryForm.reset({ name: '', description: '' });
          this.categorySuccessMessage.set(`Category “${category.name}” was added.`);
        },
        error: (error: HttpErrorResponse) => {
          this.categoryErrorMessage.set(this.getCategoryErrorMessage(error));
        },
      });
  }

  protected addColor(color = this.productForm.controls.colorPicker.value): void {
    const normalizedColor = color.toUpperCase();
    this.colorsTouched.set(true);
    this.selectedColors.update((colors) =>
      colors.includes(normalizedColor) ? colors : [...colors, normalizedColor],
    );
  }

  protected removeColor(color: string): void {
    this.colorsTouched.set(true);
    this.selectedColors.update((colors) => colors.filter((item) => item !== color));
  }

  protected selectImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/gif']);
    const validFiles = files.filter(
      (file) => supportedTypes.has(file.type) && file.size <= 10 * 1024 * 1024,
    );

    this.imageSelectionError.set(
      validFiles.length !== files.length
        ? 'Only JPG, PNG, or GIF images up to 10 MB can be uploaded.'
        : null,
    );

    this.selectedImages.update((selectedImages) => {
      const existingFiles = new Set(
        selectedImages.map(({ file }) => `${file.name}:${file.size}:${file.lastModified}`),
      );
      const newImages = validFiles
        .filter((file) => !existingFiles.has(`${file.name}:${file.size}:${file.lastModified}`))
        .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
      return [...selectedImages, ...newImages];
    });
    input.value = '';
  }

  protected removeImage(image: SelectedImage): void {
    URL.revokeObjectURL(image.previewUrl);
    this.selectedImages.update((images) => images.filter((item) => item !== image));
  }

  private parseList(value: string): string[] {
    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    ];
  }

  private clearVariantSelections(): void {
    this.selectedColors.set([]);
    this.colorsTouched.set(false);
    this.selectedImages().forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    this.selectedImages.set([]);
    this.imageSelectionError.set(null);
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoryService
      .getCategories()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.categoriesLoading.set(false)),
      )
      .subscribe({
        next: (categories) => this.categories.set(categories.filter((category) => category.active)),
        error: () => {
          this.categories.set([]);
          this.productErrorMessage.set('Categories could not be loaded. Refresh the page and try again.');
        },
      });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'We could not reach the server. Check your connection and try again.';
    }

    if (error.status === 401 || error.status === 403) {
      return 'The email or password is incorrect.';
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return 'Sign in failed. Please try again in a moment.';
  }

  private getProductErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'The product service could not be reached. Check your connection and try again.';
    }

    if (error.status === 401 || error.status === 403) {
      return 'Your admin session is not authorised to add products. Sign in again and retry.';
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return 'The product could not be added. Please try again.';
  }

  private getCategoryErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'The category service could not be reached. Check your connection and try again.';
    }

    if (error.status === 401 || error.status === 403) {
      return 'Your admin session is not authorised to add categories. Sign in again and retry.';
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return 'The category could not be added. Please try again.';
  }
}
