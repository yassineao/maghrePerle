import { isPlatformBrowser } from '@angular/common';
import { Component, computed, DestroyRef, inject, Input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ProductsService } from '../../core/api/products_api/product.service';
import { CategoryService } from '../../core/api/category_api/category.service';
import { Category } from '../../core/interfaces/Category';
import { map, of } from 'rxjs';
import { PopupShopPage } from '../popup/Popup';
import { Product } from '../../core/interfaces/Product';
import { FavoritesSession } from '../../core/api/favorites_api/FavoritesSession';

const ALL_CATEGORY: Category = {
  id: '0',
  name: 'Tous',
  description: 'Toutes les catégories',
  active: true,
};

@Component({
  selector: 'Catalogue',
  templateUrl: './Catalogue.html',
  styleUrl: './Catalogue.css',
  imports: [PopupShopPage],
})
export class CataloguePage implements OnInit {
  @Input()
  CompoOrPage: boolean = false;

  @Input()
  productItems: Product[] | null = null;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly categoriesService = inject(CategoryService);
  protected readonly categories = toSignal(
    (isPlatformBrowser(this.platformId)
      ? this.categoriesService.getCategories().pipe(map((categories) => [ALL_CATEGORY, ...categories]))
      : of([ALL_CATEGORY])),
    { initialValue: [ALL_CATEGORY] },
  );
  protected readonly selectedCategory = signal('Tous');
  private readonly destroyRef = inject(DestroyRef);
  private readonly productsService = inject(ProductsService);
  private readonly favorites = inject(FavoritesSession);
  protected readonly products = signal<Product[]>([]);
  protected readonly isFavorite = (productId: string): boolean => this.favorites.isFavorite(productId);

  protected toggleFavorite(event: Event, product: Product): void {
    event.stopPropagation();
    this.favorites.toggle(product.id);
  }

  ngOnInit(): void {
    if (this.productItems !== null) {
      this.products.set(this.productItems);
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.productsService.getActiveProducts().pipe(
      takeUntilDestroyed(this.destroyRef)

    ).subscribe({
      next: (products) => this.products.set(products),
      error: () => this.products.set([]),
    });
  }

  protected readonly visibleProducts = computed(() => {
    const category = this.selectedCategory();
    const productsByName = new Map<string, Product>();

    for (const product of this.products().filter((item) => item.active)) {
      const selectedProduct = productsByName.get(product.name);
      const selectedScore = selectedProduct
        ? Number(selectedProduct.quantity > 0) * 2 + Number(selectedProduct.productImage.length > 0)
        : -1;
      const productScore =
        Number(product.quantity > 0) * 2 + Number(product.productImage.length > 0);

      if (!selectedProduct || productScore > selectedScore) {
        productsByName.set(product.name, product);
      }
    }

    const products = [...productsByName.values()];
    const newProducts =
      category === 'Tous'
        ? products
        : products.filter((product) => product.category.name === category);

    return this.CompoOrPage ? newProducts : newProducts.slice(0, 4);
  });


  protected readonly selectedProducts = signal<Product[] | null>(null);

  protected openPopup(product: Product): void {
    const matchingProducts = this.products().filter(
      (candidate) => candidate.name === product.name,
    );
    const productImages = [
      ...new Map(
        matchingProducts
          .flatMap((candidate) => candidate.productImage)
          .map((image) => [image.id, image]),
      ).values(),
    ];
    const clickedProductFirst = [
      product,
      ...matchingProducts.filter((candidate) => candidate.id !== product.id),
    ];

    this.selectedProducts.set(
      clickedProductFirst.map((candidate) => ({
        ...candidate,
        productImage: productImages,
      })),
    );
  }

  protected closePopup(): void {
    this.selectedProducts.set(null);
  }
}
