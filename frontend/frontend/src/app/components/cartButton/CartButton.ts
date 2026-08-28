import { Component, inject, Input } from '@angular/core';
import { Product } from '../../core/interfaces/Product';
import { Cart_session } from '../../core/api/cart_api/Cart_session';

@Component({
  selector: 'cart-button',
  templateUrl: './CartButton.html',
})
export class CartButtonComponent {
  @Input({ required: true }) product!: Product;
  @Input() quantity = 1;
  @Input() color = '';
  @Input() size = '';

  private readonly cartSession = inject(Cart_session);

  protected addToCart(): void {
    if (this.product.quantity <= 0) {
      return;
    }

    this.cartSession.add_to_cart(this.product, this.color, this.size);
  }
}
