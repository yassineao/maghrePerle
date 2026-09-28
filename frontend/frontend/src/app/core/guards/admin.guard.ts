import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserService } from '../api/user_api/user.service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const userService = inject(UserService);

  if (!isPlatformBrowser(platformId)) {
    return router.createUrlTree(['/admin']);
  }

  return userService.getMe().pipe(
    map((user) => {
      const role = user?.role?.toUpperCase().replace(/^ROLE_/, '');
      return role === 'ADMIN' ? true : router.createUrlTree(['/admin']);
    }),
  );
};
