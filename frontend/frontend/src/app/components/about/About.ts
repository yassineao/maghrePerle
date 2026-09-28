import { Component, inject } from '@angular/core';
import { SocialLinksService } from '../../core/config/social-links.service';

@Component({
  selector: 'about',
  templateUrl: './About.html',
})
export class AboutComponent{
  protected readonly instagramUrl = inject(SocialLinksService).instagramUrl;
}
