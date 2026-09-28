import { Injectable } from '@angular/core';
import { socialLinksConfig } from './social-links.generated';

@Injectable({ providedIn: 'root' })
export class SocialLinksService {
  readonly instagramUrl = socialLinksConfig.instagramUrl;

  whatsappUrl(message: string): string {
    const phoneNumber = socialLinksConfig.whatsappNumber.replace(/\D/g, '');
    const contactUrl = phoneNumber ? `https://wa.me/${phoneNumber}` : 'https://wa.me/';
    return `${contactUrl}?text=${encodeURIComponent(message)}`;
  }
}
