import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/Navbar';
import { Footer } from './shared/footer/Footer';
import { Cart_session } from './core/api/cart_api/Cart_session';
import { Product } from './core/interfaces/Product';
import { ProductImage } from './core/interfaces/ProductImage';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly cartSession = inject(Cart_session);
  protected readonly addedProduct = this.cartSession.addedProduct;

  protected mainImage(product: Product): ProductImage | undefined {
    return product.productImage?.find((image) => image.mainImage) ?? product.productImage?.[0];
  }
}
