import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Cart_session } from '../../core/api/cart_api/Cart_session';
import { Product } from '../../core/interfaces/Product';
import { ProductImage } from '../../core/interfaces/ProductImage';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'app-cart-drop',
  templateUrl: './CartDrop.html',
  styleUrl: './CartDrop.css',
})
export class CartDropComponent {
  private readonly cartSession = inject(Cart_session);
  private readonly socialLinks = inject(SocialLinksService);

  protected readonly open = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('cartDialog');
  protected readonly products = this.cartSession.products;
  protected readonly itemCount = this.cartSession.itemCount;
  protected readonly total = this.cartSession.total;

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.dialog().nativeElement.showModal();
    this.open.set(true);
  }

  protected remove(product: Product): void {
    this.cartSession.delete_from_cart(product);
  }

  protected mainImage(product: Product): ProductImage | undefined {
    return product.productImage?.find((image) => image.mainImage) ?? product.productImage?.[0];
  }

  private readonly colorNames = [
    { name: 'noir', hex: '#000000' },
    { name: 'blanc', hex: '#ffffff' },
    { name: 'gris', hex: '#808080' },
    { name: 'rouge', hex: '#ff0000' },
    { name: 'bordeaux', hex: '#800020' },
    { name: 'brun', hex: '#8b4513' },
    { name: 'orange', hex: '#ffa500' },
    { name: 'jaune', hex: '#ffff00' },
    { name: 'vert', hex: '#008000' },
    { name: 'olive', hex: '#808000' },
    { name: 'turquoise', hex: '#40e0d0' },
    { name: 'bleu', hex: '#0000ff' },
    { name: 'bleu marine', hex: '#000080' },
    { name: 'violet', hex: '#800080' },
    { name: 'rose', hex: '#ffc0cb' },
  ];

  private formatColor(color: string): string {
    const match = /^#?([\da-f]{6})$/i.exec(color.trim());
    if (!match) {
      return color;
    }

    const hex = `#${match[1].toLowerCase()}`;
    const rgb = [1, 3, 5].map((offset) => Number.parseInt(match[1].slice(offset - 1, offset + 1), 16));
    const closest = this.colorNames.reduce((best, candidate) => {
      const candidateRgb = [1, 3, 5].map((offset) =>
        Number.parseInt(candidate.hex.slice(offset, offset + 2), 16),
      );
      const distance = rgb.reduce((sum, value, index) => sum + (value - candidateRgb[index]) ** 2, 0);
      return distance < best.distance ? { name: candidate.name, distance } : best;
    }, { name: '', distance: Number.POSITIVE_INFINITY });

    return `${closest.name} (${hex.toUpperCase()})`;
  }

  protected sendOrder(): void {
    const lines = this.products().map((product, index) => {
      const options = [
        product.selectedColor ? `Couleur : ${this.formatColor(product.selectedColor)}` : '',
        product.selectedSize ? `Taille : ${product.selectedSize}` : '',
      ].filter(Boolean);

      return `${index + 1}. ${product.name}${options.length ? ` (${options.join(', ')})` : ''} — ${product.price.toFixed(2)} €`;
    });
    const message = [
      'Bonjour MaghrePerle, je souhaite passer la commande suivante :',
      ...lines,
      `Total : ${this.total().toFixed(2)} €`,
      'Merci !',
    ].join('\n');

    window.open(this.socialLinks.whatsappUrl(message), '_blank', 'noopener,noreferrer');
  }

  protected close(): void {
    this.dialog().nativeElement.close();
    this.open.set(false);
  }

  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
