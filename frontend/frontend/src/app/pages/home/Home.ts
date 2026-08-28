import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeroCarousselComponent } from '../../components/hero_caroussel/Hero';
import { NewArrivalsSection } from '../../components/newArrivalsSection/newArrivalsSection';
import { FaqComponent } from '../../shared/faq/Faq';
import { AboutComponent } from '../../components/about/About';
import { CollectionGridComponent } from '../../components/collectionGrid/CollectionGrid';
import { CraftsmanshipComponent } from '../../components/craftsmanship/Craftsmanship';
import { TestimonialsComponent } from '../../components/testimonials/Testimonials';
import { NewsletterComponent } from '../../components/newsletter/Newsletter';
import { ProductsService } from '../../core/api/products_api/product.service';
import { CataloguePage } from '../../components/catalogue/Catalogue';
import { Product } from '../../core/interfaces/Product';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroCarousselComponent,
    // NewArrivalsSection,
    FaqComponent,
    AboutComponent,
    CollectionGridComponent,
    CraftsmanshipComponent,
    TestimonialsComponent,
    NewsletterComponent,
    CataloguePage,
  ],
  templateUrl: './Home.html',
})
export class HomePage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productService = inject(ProductsService);
  protected readonly products = signal<Product[] | null>(null);
  protected readonly loadFailed = signal(false);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadProducts();
    }
  }

  protected loadProducts(): void {
    this.products.set(null);
    this.loadFailed.set(false);

    this.productService.getActiveProducts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (products) => {
        this.products.set(products);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('products', JSON.stringify(products));
        }
      },
      error: () => this.loadFailed.set(true),
    });
  }
}
