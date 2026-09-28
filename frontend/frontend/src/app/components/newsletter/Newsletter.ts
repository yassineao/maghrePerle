import { Component, inject } from '@angular/core';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'newsletter-signup',
  templateUrl: './Newsletter.html',
})
export class NewsletterComponent {
  protected readonly instagramUrl = inject(SocialLinksService).instagramUrl;
}
