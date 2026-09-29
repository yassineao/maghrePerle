import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, inject, OnInit, PLATFORM_ID, signal, viewChild } from '@angular/core';
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
  private readonly document = inject(DOCUMENT);
  private readonly menuList = viewChild.required<ElementRef<HTMLElement>>('menuList');
  private readonly menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');
  private readonly productsService = inject(ProductsService);
  protected readonly productsLoaded = this.productsService.productsLoaded;
  protected readonly menuOpen = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Capture clicks even when another control stops event propagation.
    this.document.addEventListener('click', this.onOutsideClick, true);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('click', this.onOutsideClick, true);
    });

    this.productsService
      .getActiveProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  private readonly onOutsideClick = (event: MouseEvent): void => {
    if (!this.menuOpen()) return;

    const path = event.composedPath();
    if (!path.includes(this.menuList().nativeElement) && !path.includes(this.menuToggle().nativeElement)) {
      this.closeMenu();
    }
  };

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
