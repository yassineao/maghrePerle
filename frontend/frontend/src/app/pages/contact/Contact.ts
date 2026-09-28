import { Component, inject } from '@angular/core';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'app-contact-page',
  templateUrl: './Contact.html',
})
export class ContactPage {
  protected readonly instagramUrl = inject(SocialLinksService).instagramUrl;
}
