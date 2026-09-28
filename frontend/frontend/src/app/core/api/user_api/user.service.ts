import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { LoginResponse, UserRequest, UserResponse } from '../../interfaces/User';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http: HttpClient = inject(HttpClient);
  private apiUrlAuth: string = environment.apiUrlAuth;

  login(user: UserRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrlAuth}/user/login`, user, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => this.storeSession(response)),
      );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getStoredUser(): UserResponse | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as UserResponse;
    } catch {
      this.logout();
      return null;
    }
  }

  getMe(): Observable<UserResponse | null> {
    return this.requestMe().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) {
          return of(null);
        }

        return this.refreshSession().pipe(
          switchMap((user) => (user ? this.requestMe() : of(null))),
          catchError(() => of(null)),
        );
      }),
    );
  }

  private requestMe(): Observable<UserResponse> {
    const accessToken =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');

    return this.http
      .get<UserResponse>(`${this.apiUrlAuth}/user/me`, {
        withCredentials: true,
        ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
      })
      .pipe(
        tap((user) => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(user));
          }
        }),
      );
  }

  me(): Observable<boolean> {
    return this.getMe().pipe(map((user) => user !== null));
  }

  sessionUser(): Observable<UserResponse | null> {
    const user = this.getStoredUser();
    const accessToken =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');

    if (user && accessToken && !this.isTokenExpired(accessToken)) {
      return of(user);
    }

    return this.refreshSession();
  }

  private refreshSession(): Observable<UserResponse | null> {
    const refreshToken =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return of(null);
    }

    return this.http
      .post<LoginResponse>(
        `${this.apiUrlAuth}/user/refresh`,
        { refreshToken },
        { withCredentials: true },
      )
      .pipe(
        tap((response) => this.storeSession(response, refreshToken)),
        map(({ id, name, email, role }) => ({ id, name, email, role })),
        catchError(() => {
          this.logout();
          return of(null);
        }),
      );
  }

  private storeSession(response: LoginResponse, fallbackRefreshToken?: string): void {
    const { accessToken, refreshToken, id, name, email, role } = response;
    const authenticatedUser: UserResponse = { id, name, email, role };

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    if (refreshToken || fallbackRefreshToken) {
      localStorage.setItem('refreshToken', refreshToken || fallbackRefreshToken!);
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) {
        return true;
      }
      const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const normalizedPayload = base64Payload.padEnd(
        Math.ceil(base64Payload.length / 4) * 4,
        '=',
      );
      const payload = JSON.parse(atob(normalizedPayload)) as { exp?: number };
      return !payload.exp || payload.exp * 1000 <= Date.now() + 30_000;
    } catch {
      return true;
    }
  }

  refresh(): void {
    this.refreshSession().subscribe();
  }

  health(): void {
    this.http.get(`${this.apiUrlAuth}/health`, {});
  }
}
