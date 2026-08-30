import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeroCarousselComponent } from './Hero';

describe('HeroCarousselComponent', () => {
  let fixture: ComponentFixture<HeroCarousselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroCarousselComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HeroCarousselComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('moves to the next slide with the carousel control', () => {
    const nextButton = fixture.nativeElement.querySelector('[aria-label="Diapositive suivante"]') as HTMLButtonElement;

    expect(fixture.nativeElement.querySelector('[aria-current="true"]').getAttribute('aria-label')).toContain('diapositive 1');
    nextButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-current="true"]').getAttribute('aria-label')).toContain('diapositive 2');
  });

  it('supports keyboard navigation', () => {
    const carousel = fixture.nativeElement.querySelector('[aria-roledescription="carousel"]') as HTMLElement;
    carousel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-current="true"]').getAttribute('aria-label')).toContain('diapositive 3');
  });
});
