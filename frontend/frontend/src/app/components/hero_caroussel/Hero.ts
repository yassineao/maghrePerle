import { isPlatformBrowser } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type HeroSlide = {
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  accent: string;
};

@Component({
  selector: 'hero-caroussel',
  imports: [RouterLink],
  templateUrl: './Hero.html',
})
export class HeroCarousselComponent implements OnInit, OnDestroy {
  protected readonly slides: HeroSlide[] = [
    {
      imageSrc: '/images/moroccan-fashion/green-caftan-alley.jpg',
      imageAlt: 'Femme portant un caftan vert brodé dans une ruelle marocaine',
      eyebrow: 'La nouvelle collection',
      title: 'L’élégance marocaine au féminin.',
      description: 'Découvrez l’univers MaghrePerle et nos modèles présentés sur Instagram.',
      ctaText: 'Découvrir la collection',
      ctaUrl: '/shop',
      accent: '01',
    },
    {
      imageSrc: '/images/moroccan-fashion/coastal-djellaba.jpg',
      imageAlt: 'Femme portant une djellaba fleurie sur une plage marocaine',
      eyebrow: 'La sélection MaghrePerle',
      title: 'Des couleurs qui racontent une histoire.',
      description: 'Des caftans et des djellabas pour célébrer la féminité et le style marocain.',
      ctaText: 'Voir les pièces limitées',
      ctaUrl: '/shop',
      accent: '02',
    },
    {
      imageSrc: '/images/moroccan-fashion/white-caftan.jpg',
      imageAlt: 'Femme vêtue d’un caftan blanc richement brodé',
      eyebrow: 'Commandes en message privé',
      title: 'Votre prochain coup de cœur.',
      description: 'Repérez votre modèle préféré puis écrivez-nous directement sur Instagram pour commander.',
      ctaText: 'Nous contacter',
      ctaUrl: '/contact',
      accent: '03',
    },
  ];

  protected readonly currentIndex = signal(0);
  protected readonly currentSlide = computed(() => this.slides[this.currentIndex()]);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private autoplayTimer?: ReturnType<typeof setInterval>;
  private pointerStartX?: number;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  protected previous(): void {
    this.currentIndex.update((index) => (index - 1 + this.slides.length) % this.slides.length);
    this.restartAutoplay();
  }

  protected next(): void {
    this.currentIndex.update((index) => (index + 1) % this.slides.length);
    this.restartAutoplay();
  }

  protected select(index: number): void {
    this.currentIndex.set(index);
    this.restartAutoplay();
  }

  protected pauseAutoplay(): void {
    this.stopAutoplay();
  }

  protected resumeAutoplay(): void {
    this.startAutoplay();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.previous();
    if (event.key === 'ArrowRight') this.next();
  }

  protected onPointerDown(event: PointerEvent): void {
    this.pointerStartX = event.clientX;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.pointerStartX === undefined) return;
    const distance = event.clientX - this.pointerStartX;
    this.pointerStartX = undefined;
    if (Math.abs(distance) < 50) return;
    distance < 0 ? this.next() : this.previous();
  }

  private restartAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  private startAutoplay(): void {
    if (!isPlatformBrowser(this.platformId) || this.autoplayTimer) return;
    this.ngZone.runOutsideAngular(() => {
      this.autoplayTimer = setInterval(() => {
        this.ngZone.run(() => this.next());
      }, 6000);
    });
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    this.autoplayTimer = undefined;
  }
}
