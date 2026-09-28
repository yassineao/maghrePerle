import { Component, inject } from '@angular/core';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'craftsmanship',
  templateUrl: './Craftsmanship.html',
})
export class CraftsmanshipComponent {
  protected readonly instagramUrl = inject(SocialLinksService).instagramUrl;
}
