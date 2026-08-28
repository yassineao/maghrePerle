import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { concatMap, finalize, forkJoin, from, of, switchMap, toArray } from 'rxjs';
import { CategoryService } from '../../core/api/category_api/category.service';
import {
  ProductCreateRequest,
  ProductsService,
} from '../../core/api/products_api/product.service';
import { ProductImageService } from '../../core/api/supabase_api/product_image.service';
import { Category } from '../../core/interfaces/Category';
import { Product } from '../../core/interfaces/Product';
import { ProductImage } from '../../core/interfaces/ProductImage';
import { UserService } from '../../core/api/user_api/user.service';

interface SelectedImage {
  file: File;
  previewUrl: string;
}

interface ProductGroup {
  name: string;
  variants: Product[];
  images: Product['productImage'];
  colors: string[];
  sizes: string[];
  minimumPrice: number;
  maximumPrice: number;
}

@Component({
  selector: 'app-admin-products-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './AdminProducts.html',
})
export class AdminProductsPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly userService = inject(UserService);
  private readonly productsService = inject(ProductsService);
  private readonly categoryService = inject(CategoryService);
  private readonly productImageService = inject(ProductImageService);

  protected readonly loading = signal(true);
  protected readonly accessDenied = signal(false);
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly selectedGroupName = signal<string | null>(null);
  protected readonly expandedGroupNames = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly selectedImages = signal<SelectedImage[]>([]);
  protected readonly imageSelectionError = signal<string | null>(null);
  protected readonly addingVariant = signal(false);
  protected readonly deletingVariants = signal(false);
  protected readonly deletingImageId = signal<string | null>(null);
  protected readonly variantMessage = signal<string | null>(null);
  protected readonly variantError = signal<string | null>(null);
  protected readonly productGroups = computed<ProductGroup[]>(() => {
    const groups = new Map<string, Product[]>();

    for (const product of this.products()) {
      groups.set(product.name, [...(groups.get(product.name) ?? []), product]);
    }

    return [...groups.entries()]
      .map(([name, variants]) => {
        const prices = variants.map((variant) => variant.price);
        return {
          name,
          variants,
          images: [
            ...new Map(
              variants
                .flatMap((variant) => variant.productImage)
                .map((image) => [image.id, image]),
            ).values(),
          ],
          colors: [
            ...new Set(variants.map((variant) => variant.color).filter(Boolean) as string[]),
          ],
          sizes: [
            ...new Set(variants.map((variant) => variant.size).filter(Boolean) as string[]),
          ],
          minimumPrice: Math.min(...prices),
          maximumPrice: Math.max(...prices),
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name));
  });
  protected readonly selectedGroup = computed(() => {
    const selectedProduct = this.selectedProduct();
    const groupName = selectedProduct?.name ?? this.selectedGroupName();
    return groupName
      ? (this.productGroups().find((group) => group.name === groupName) ?? null)
      : null;
  });

  protected readonly editForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    tags: [''],
    size: [''],
    color: ['', Validators.pattern(/^$|^#[0-9A-Fa-f]{6}$/)],
    categoryId: ['', Validators.required],
    active: [true],
    newSize: [''],
    newColor: ['#A52A2A'],
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const user = this.userService.getStoredUser();
    if (!user || user.role.toUpperCase().replace(/^ROLE_/, '') !== 'ADMIN') {
      this.loading.set(false);
      this.accessDenied.set(true);
      return;
    }

    this.loadData();
  }

  protected editProduct(product: Product): void {
    this.clearSelectedImages();
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.variantMessage.set(null);
    this.variantError.set(null);
    this.selectedGroupName.set(product.name);
    this.selectedProduct.set(product);
    this.editForm.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      tags: product.tags.join(', '),
      size: product.size ?? '',
      color: this.validHexColor(product.color) ? product.color!.toUpperCase() : '',
      categoryId: product.category.id,
      active: product.active,
      newSize: '',
      newColor: '#A52A2A',
    });
  }

  protected manageProductGroup(group: ProductGroup): void {
    this.clearSelectedImages();
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.variantMessage.set(null);
    this.variantError.set(null);
    this.selectedProduct.set(null);
    this.selectedGroupName.set(group.name);
    this.editForm.controls.newSize.setValue('');
    this.editForm.controls.newColor.setValue('#A52A2A');
  }

  protected toggleGroupVariants(groupName: string): void {
    this.expandedGroupNames.update((groupNames) =>
      groupNames.includes(groupName)
        ? groupNames.filter((name) => name !== groupName)
        : [...groupNames, groupName],
    );
  }

  protected addSize(): void {
    const group = this.selectedGroup();
    const selectedProduct = this.selectedProduct() ?? group?.variants[0] ?? null;
    const size = this.editForm.controls.newSize.value.trim();
    this.variantMessage.set(null);
    this.variantError.set(null);

    if (!group || !selectedProduct || !size) {
      this.variantError.set('Enter a size to add.');
      return;
    }

    const colors = group.colors.length > 0
      ? group.colors
      : [selectedProduct.color ?? this.editForm.controls.color.value];
    const missingColors = colors.filter(
      (color) =>
        !group.variants.some(
          (variant) => variant.size === size && variant.color?.toUpperCase() === color.toUpperCase(),
        ),
    );

    if (missingColors.length === 0) {
      this.variantError.set(`Size ${size} already exists for every color.`);
      return;
    }

    const requests = missingColors.map((color) => {
      const source =
        group.variants.find((variant) => variant.color?.toUpperCase() === color.toUpperCase()) ??
        selectedProduct;
      return this.toVariantRequest(source, size, color);
    });
    this.addVariants(requests, `Size ${size} was added for ${requests.length} colors.`);
  }

  protected addColor(): void {
    const group = this.selectedGroup();
    const selectedProduct = this.selectedProduct() ?? group?.variants[0] ?? null;
    const color = this.editForm.controls.newColor.value.toUpperCase();
    this.variantMessage.set(null);
    this.variantError.set(null);

    if (!group || !selectedProduct) {
      this.variantError.set('Select a product before adding a color.');
      return;
    }

    const sizes = group.sizes.length > 0
      ? group.sizes
      : [selectedProduct.size ?? this.editForm.controls.size.value];
    const missingSizes = sizes.filter(
      (size) =>
        !group.variants.some(
          (variant) => variant.size === size && variant.color?.toUpperCase() === color,
        ),
    );

    if (missingSizes.length === 0) {
      this.variantError.set(`Color ${color} already exists for every size.`);
      return;
    }

    const requests = missingSizes.map((size) => {
      const source = group.variants.find((variant) => variant.size === size) ?? selectedProduct;
      return this.toVariantRequest(source, size, color);
    });
    this.addVariants(requests, `Color ${color} was added for ${requests.length} sizes.`);
  }

  protected deleteSize(group: ProductGroup, size: string): void {
    const variants = group.variants.filter((variant) => variant.size === size);
    this.deleteVariants(
      group,
      variants,
      `Delete size ${size} from “${group.name}”? This will permanently delete ${variants.length} variant${variants.length === 1 ? '' : 's'}.`,
      `Size ${size} and ${variants.length} variant${variants.length === 1 ? '' : 's'} were deleted.`,
    );
  }

  protected deleteColor(group: ProductGroup, color: string): void {
    const normalizedColor = color.toUpperCase();
    const variants = group.variants.filter(
      (variant) => variant.color?.toUpperCase() === normalizedColor,
    );
    this.deleteVariants(
      group,
      variants,
      `Delete color ${normalizedColor} from “${group.name}”? This will permanently delete ${variants.length} variant${variants.length === 1 ? '' : 's'}.`,
      `Color ${normalizedColor} and ${variants.length} variant${variants.length === 1 ? '' : 's'} were deleted.`,
    );
  }

  protected deleteWholeProduct(group: ProductGroup): void {
    this.deleteVariants(
      group,
      group.variants,
      `Delete “${group.name}” completely? All ${group.variants.length} variants and their unshared images will be permanently deleted.`,
      `“${group.name}” and all ${group.variants.length} variants were deleted.`,
    );
  }

  protected deleteImage(product: Product, image: ProductImage): void {
    if (
      this.deletingImageId() ||
      !window.confirm(
        `Delete this image from “${product.name}”? If it is shared, it will also be removed from the other variants.`,
      )
    ) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.deletingImageId.set(image.id);

    this.productImageService
      .deletePicture(image.id)
      .pipe(
        switchMap(() => this.productsService.refreshProducts()),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingImageId.set(null)),
      )
      .subscribe({
        next: (products) => {
          this.products.set(products);
          const refreshedProduct = products.find((item) => item.id === product.id);
          if (refreshedProduct) {
            this.editProduct(refreshedProduct);
          }
          this.successMessage.set('The product image was deleted.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getImageDeleteErrorMessage(error));
        },
      });
  }

  protected saveProduct(): void {
    const currentProduct = this.selectedProduct();
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!currentProduct || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    const category = this.categories().find((item) => item.id === value.categoryId);
    if (!category) {
      this.errorMessage.set('Choose a valid category.');
      return;
    }

    const images = this.selectedImages();
    const size = value.size.trim();
    const color = value.color.toUpperCase();
    const encodedOptions = size || color ? ` [${size}]${color}@` : '';
    const updatedProduct: Product = {
      ...currentProduct,
      name: `${value.name.trim()}${encodedOptions}`,
      description: value.description,
      price: value.price,
      quantity: value.quantity,
      tags: this.parseList(value.tags),
      active: value.active,
      category,
      size: size || undefined,
      color: color || undefined,
    };

    this.saving.set(true);
    this.productsService
      .updateProduct(updatedProduct)
      .pipe(
        switchMap(() => {
          if (images.length === 0) {
            return of([]);
          }

          const hasMainImage = currentProduct.productImage.some((image) => image.mainImage);
          return forkJoin(
            images.map(({ file }, index) =>
              this.productImageService.uploadPicture(
                currentProduct.id,
                file,
                `${value.name.trim()} product image`,
                !hasMainImage && index === 0,
              ),
            ),
          );
        }),
        switchMap(() => this.productsService.getProducts()),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (products) => {
          this.products.set(products);
          const refreshedProduct = products.find((product) => product.id === currentProduct.id);
          if (refreshedProduct) {
            this.editProduct(refreshedProduct);
          }
          this.successMessage.set(
            images.length > 0
              ? 'Product changes and new images were saved.'
              : 'Product changes were saved.',
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
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
      return [
        ...selectedImages,
        ...validFiles
          .filter((file) => !existingFiles.has(`${file.name}:${file.size}:${file.lastModified}`))
          .map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
      ];
    });
    input.value = '';
  }

  protected removeSelectedImage(image: SelectedImage): void {
    URL.revokeObjectURL(image.previewUrl);
    this.selectedImages.update((images) => images.filter((item) => item !== image));
  }

  protected priceLabel(group: ProductGroup): string {
    const minimum = `€${group.minimumPrice.toFixed(2)}`;
    return group.minimumPrice === group.maximumPrice
      ? minimum
      : `${minimum} – €${group.maximumPrice.toFixed(2)}`;
  }

  private addVariants(requests: ProductCreateRequest[], successMessage: string): void {
    const selectedProductId = this.selectedProduct()?.id;
    this.addingVariant.set(true);
    this.productsService
      .addProducts(requests)
      .pipe(
        switchMap(() => this.productsService.getProducts()),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.addingVariant.set(false)),
      )
      .subscribe({
        next: (products) => {
          this.products.set(products);
          const selectedProduct = products.find((product) => product.id === selectedProductId);
          if (selectedProduct) {
            this.editProduct(selectedProduct);
          }
          this.editForm.controls.newSize.setValue('');
          this.variantMessage.set(successMessage);
        },
        error: (error: HttpErrorResponse) => {
          this.variantError.set(this.getErrorMessage(error));
        },
      });
  }

  private deleteVariants(
    group: ProductGroup,
    variants: Product[],
    confirmationMessage: string,
    successMessage: string,
  ): void {
    if (this.deletingVariants() || variants.length === 0 || !window.confirm(confirmationMessage)) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.variantError.set(null);
    this.variantMessage.set(null);
    this.deletingVariants.set(true);

    from(variants)
      .pipe(
        concatMap((variant) => this.productsService.deleteProduct(variant.id)),
        toArray(),
        switchMap(() => this.productsService.getProducts()),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingVariants.set(false)),
      )
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.selectedProduct.set(null);

          const groupStillExists = products.some((product) => product.name === group.name);
          if (groupStillExists) {
            this.selectedGroupName.set(group.name);
            this.variantMessage.set(successMessage);
          } else {
            this.selectedGroupName.set(null);
            this.expandedGroupNames.update((names) =>
              names.filter((name) => name !== group.name),
            );
            this.successMessage.set(successMessage);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.variantError.set(this.getDeleteErrorMessage(error));
        },
      });
  }

  private toVariantRequest(source: Product, size: string, color: string): ProductCreateRequest {
    return {
      name: `${source.name} [${size}]${color.toUpperCase()}@`,
      description: source.description,
      price: source.price,
      quantity: source.quantity,
      tags: source.tags,
      active: source.active,
      categoryId: source.category.id,
    };
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      products: this.productsService.getProducts(),
      categories: this.categoryService.getCategories(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ products, categories }) => {
          this.products.set(products);
          this.categories.set(categories.filter((category) => category.active));
        },
        error: (error: HttpErrorResponse) => this.errorMessage.set(this.getErrorMessage(error)),
      });
  }

  private parseList(value: string): string[] {
    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  private validHexColor(color: string | undefined): boolean {
    return !!color && /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  private clearSelectedImages(): void {
    this.selectedImages().forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    this.selectedImages.set([]);
    this.imageSelectionError.set(null);
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'Your admin session is no longer authorised. Sign in again.';
    }
    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'The product could not be saved. Please try again.';
  }

  private getDeleteErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'Your admin session is no longer authorised. Sign in again.';
    }
    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'The selected variants could not be deleted. Refresh the page and try again.';
  }

  private getImageDeleteErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'Your admin session is no longer authorised. Sign in again.';
    }
    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'The image could not be deleted. Refresh the page and try again.';
  }
}
