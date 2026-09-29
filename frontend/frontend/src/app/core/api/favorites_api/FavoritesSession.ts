import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FavoritesSession {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly favoriteIdsState = signal<Set<string>>(this.readFavorites());
  readonly favoriteIds = this.favoriteIdsState.asReadonly();
  readonly count = computed(() => this.favoriteIdsState().size);

  isFavorite(productId: string): boolean {
    return this.favoriteIdsState().has(productId);
  }

  toggle(productId: string): void {
    const favorites = new Set(this.favoriteIdsState());
    if (favorites.has(productId)) {
      favorites.delete(productId);
    } else {
      favorites.add(productId);
    }
    this.favoriteIdsState.set(favorites);
    if (isPlatformBrowser(this.platformId)) {
      try {
        sessionStorage.setItem('favorites', JSON.stringify([...favorites]));
      } catch {
        // Keep the selection usable in memory when browser storage is unavailable.
      }
    }
  }

  private readFavorites(): Set<string> {
    if (!isPlatformBrowser(this.platformId)) return new Set();
    try {
      const favorites: unknown = JSON.parse(sessionStorage.getItem('favorites') ?? '[]');
      return Array.isArray(favorites) ? new Set(favorites.filter((id): id is string => typeof id === 'string')) : new Set();
    } catch {
      return new Set();
    }
  }
}
