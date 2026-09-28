import { Component, inject } from '@angular/core';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'app-contact-page',
  templateUrl: './Contact.html',
})
export class ContactPage {
  private readonly socialLinks = inject(SocialLinksService);
  protected readonly instagramUrl = this.socialLinks.instagramUrl;
  protected readonly whatsappUrl = this.socialLinks.whatsappUrl(
    'Bonjour Maghrebella, je souhaite vous contacter au sujet de vos produits.',
  );
}
