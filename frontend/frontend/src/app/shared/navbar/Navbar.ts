import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProductsService } from '../../core/api/products_api/product.service';
import { CartDropComponent } from '../../components/cartDrop/CartDrop';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CartDropComponent],
  templateUrl: './Navbar.html',
})
export class Navbar implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productsService = inject(ProductsService);
  protected readonly productsLoaded = this.productsService.productsLoaded;
  protected readonly menuOpen = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.productsService
      .getActiveProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

  @HostListener('window:resize', ['$event'])
  protected onResize(event: Event): void {
    if ((event.target as Window).innerWidth >= 768) this.closeMenu();
  }
}
