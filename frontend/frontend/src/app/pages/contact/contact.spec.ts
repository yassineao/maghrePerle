import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { SocialLinksService } from '../../core/config/social-links.service';
import { ContactPage } from './Contact';

describe('contact', () => {

  let service: SocialLinksService;
  let fixture: ComponentFixture<ContactPage>;
  let component: ContactPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [SocialLinksService],
    }).compileComponents();

    service = TestBed.inject(SocialLinksService);

    fixture = TestBed.createComponent(ContactPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders correctly', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element).toBeTruthy();
  });
})
