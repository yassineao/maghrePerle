import { Injectable } from '@angular/core';
import { environment } from '../../../../environment';

@Injectable({ providedIn: 'root' })
export class SocialLinksService {
  readonly instagramUrl = environment.instagramUrl;

  whatsappUrl(message: string): string {
    const phoneNumber = environment.whatsappNumber.replace(/\D/g, '');
    const contactUrl = phoneNumber ? `https://wa.me/${phoneNumber}` : 'https://wa.me/';
    return `${contactUrl}?text=${encodeURIComponent(message)}`;
  }
}
