import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewsletterComponent } from './Newsletter';

describe('NewsletterComponent', () => {
  let fixture: ComponentFixture<NewsletterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NewsletterComponent] }).compileComponents();
    fixture = TestBed.createComponent(NewsletterComponent);
    fixture.detectChanges();
  });

  it('links to the MaghrePerle Instagram profile', () => {
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(link.href).toBe('https://www.instagram.com/maghrebella.boutique/');
    expect(link.textContent).toContain('Instagram');
  });
});
