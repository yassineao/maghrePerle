import { Component, inject } from '@angular/core';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'app-footer',
  templateUrl: './Footer.html',
  host: {
    class: 'block w-full',
  },
})
export class Footer {
  protected readonly instagramUrl = inject(SocialLinksService).instagramUrl;
}
