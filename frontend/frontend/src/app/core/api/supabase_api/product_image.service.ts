import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { ProductImage } from '../../interfaces/ProductImage';
import { Observable } from 'rxjs';
import { SupabaseCatalogService } from './supabase-catalog.service';

@Injectable({
  providedIn: 'root',
})
export class ProductImageService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.apiUrl;
  private supabaseCatalogService = inject(SupabaseCatalogService);

  uploadPicture(
    productId: string,
    file: File,
    altText: string,
    mainImage: boolean,
  ): Observable<ProductImage> {
    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('file', file, file.name);
    formData.append('altText', altText);
    formData.append('mainImage', String(mainImage));

    const accessToken =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');

    return this.http.post<ProductImage>(`${this.apiUrl}/product-image/upload`, formData, {
      withCredentials: true,
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    });
  }

  deletePicture(imageId: string): Observable<void> {
    const accessToken =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');

    return this.http.delete<void>(`${this.apiUrl}/product-image/${imageId}`, {
      withCredentials: true,
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    });
  }

  getProductImages(productId: string): Observable<ProductImage[]> {
    if (environment.productDataSource === 'supabase') {
      return this.supabaseCatalogService.getProductImages(productId);
    }

    return this.http.get<ProductImage[]>(`${this.apiUrl}/product-image/product/${productId}`);
  }
}
