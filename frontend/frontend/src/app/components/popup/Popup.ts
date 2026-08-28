import { Component, computed, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { Product } from '../../core/interfaces/Product';
import { ProductImage } from '../../core/interfaces/ProductImage';
import { CartButtonComponent } from '../cartButton/CartButton';

@Component({
  selector: 'popup-shop-page',
  templateUrl: './Popup.html',
  imports: [CartButtonComponent],
})
export class PopupShopPage implements OnChanges {
  @Input({ required: true }) products: Product[] = [];

  protected readonly currentColor = signal('');
  protected readonly currentSize = signal('');
  protected readonly selectedImage = signal<ProductImage | null>(null);


  protected readonly colors = computed(() =>
    [...new Set(this.products.map((product) => product.color).filter(Boolean) as string[])],
  );


  protected readonly sizes = computed(() => {
    const products = this.currentColor()
      ? this.products.filter((product) => product.color === this.currentColor())
      : this.products;

    return [...new Set(products.map((product) => product.size).filter(Boolean) as string[])];
  });


  protected readonly selectedProduct = computed(() =>
    this.products.find(
      (product) =>
        (!this.currentColor() || product.color === this.currentColor()) &&
        (!this.currentSize() || product.size === this.currentSize()),
    ) ?? this.products[0],
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products']) {
      const product = this.products[0];
      this.currentColor.set(product?.color ?? '');
      this.currentSize.set(product?.size ?? '');
      this.selectedImage.set(product?.productImage[0] ?? null);
    }

  }



  protected selectImage(image: ProductImage): void {
    this.selectedImage.set(image);
  }

  protected select_color(color: string): void {
    this.currentColor.set(color);
    if (!this.sizes().includes(this.currentSize())) {
      this.currentSize.set(this.sizes()[0] ?? '');
    }
  }

  protected select_size(size: string): void {
    this.currentSize.set(size);
  }

  protected isColorOutOfStock(color: string): boolean {
    return !this.products.some((product) => product.color === color && product.quantity > 0);
  }

  protected isSizeOutOfStock(size: string): boolean {
    return !this.products.some(
      (product) =>
        product.size === size &&
        (!this.currentColor() || product.color === this.currentColor()) &&
        product.quantity > 0,
    );
  }
}
