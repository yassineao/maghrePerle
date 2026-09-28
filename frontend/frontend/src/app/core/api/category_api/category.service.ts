import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { Observable } from 'rxjs';
import { Category } from '../../interfaces/Category';
import { SupabaseCatalogService } from '../supabase_api/supabase-catalog.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;
  private supabaseCatalogService = inject(SupabaseCatalogService);

  getCategories = (): Observable<Category[]> => {
    if (environment.productDataSource === 'supabase') {
      return this.supabaseCatalogService.getCategories();
    }

    return this.http.get<Category[]>(`${this.apiUrl}/category`);
  };

  addCategory = (category: Omit<Category, 'id'>): Observable<Category> => {
    if (environment.productDataSource === 'supabase') {
      return this.supabaseCatalogService.addCategory(category);
    }

    const accessToken =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');
    return this.http.post<Category>(`${this.apiUrl}/category`, category, {
      withCredentials: true,
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    });
  };

  deleteCategory = (id: number) => {
    this.http.delete(`${this.apiUrl}/category/${id}`,
      {
        withCredentials: true
      }
      );
  }

}
