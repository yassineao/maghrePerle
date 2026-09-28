import { Component, inject } from '@angular/core';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'customer-stories',
  templateUrl: './Testimonials.html',
})
export class TestimonialsComponent {
  protected readonly instagramUrl = inject(SocialLinksService).instagramUrl;
}
