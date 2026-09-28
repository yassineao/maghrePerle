import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Product } from '../../interfaces/Product';

export interface CartProduct extends Product {
  selectedColor?: string;
  selectedSize?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Cart_session {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cartState = signal<CartProduct[]>(this.readCart());
  private readonly addedProductState = signal<CartProduct | null>(null);
  private addedProductTimer: ReturnType<typeof setTimeout> | undefined;

  readonly products = this.cartState.asReadonly();
  readonly addedProduct = this.addedProductState.asReadonly();
  readonly itemCount = computed(() => this.cartState().length);
  readonly total = computed(() =>
    this.cartState().reduce((sum, product) => sum + product.price, 0),
  );

  add_to_cart(product: Product, selectedColor = '', selectedSize = ''): void {
    const cartProduct: CartProduct = {
      ...product,
      selectedColor: selectedColor || undefined,
      selectedSize: selectedSize || undefined,
    };

    this.updateCart([...this.cartState(), cartProduct]);
    this.addedProductState.set(cartProduct);

    if (isPlatformBrowser(this.platformId)) {
      clearTimeout(this.addedProductTimer);
      this.addedProductTimer = setTimeout(() => this.addedProductState.set(null), 2000);
    }
  }

  delete_from_cart(product: Product): void {
    const index = this.cartState().findIndex((item) => item.id === product.id);

    if (index === -1) {
      return;
    }

    const cart = [...this.cartState()];
    cart.splice(index, 1);
    this.updateCart(cart);
  }

  private readCart(): CartProduct[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      const cart = JSON.parse(localStorage.getItem('cart') ?? '[]');
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  private updateCart(cart: CartProduct[]): void {
    this.cartState.set(cart);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }
}
