import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../../environment';
import { Category } from '../../interfaces/Category';
import { Product } from '../../interfaces/Product';
import { ProductImage } from '../../interfaces/ProductImage';

interface SupabaseCategoryRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface SupabaseImageRow {
  id: string;
  bucket_name: string;
  object_path: string;
  alt_text: string | null;
  width: number;
  height: number;
  main_image: boolean | null;
  product_image_product?: Array<{ product_id: string }>;
}

interface SupabaseProductImageJoinRow {
  product_id: string;
  product_image: SupabaseImageRow | null;
}

interface SupabaseProductRow {
  id: string;
  name: string | null;
  description: string | null;
  price: number | string | null;
  quantity: number | null;
  tags: string[] | null;
  active: boolean | null;
  category: SupabaseCategoryRow;
  product_image_product: SupabaseProductImageJoinRow[];
}

interface SignedUrlResponse {
  signedURL?: string;
  signedUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseCatalogService {
  private readonly http = inject(HttpClient);
  private readonly supabaseUrl = environment.supabaseUrl.replace(/\/+$/, '');
  private readonly publishableKey = environment.supabasePublishableKey;
  private readonly storageBucketPublic = environment.supabaseStorageBucketPublic;

  getProducts(activeOnly = false): Observable<Product[]> {
    let params = new HttpParams().set(
      'select',
      [
        'id',
        'name',
        'description',
        'price',
        'quantity',
        'tags',
        'active',
        'category:category_id(id:category_id,name,description,active)',
        'product_image_product(product_id,product_image(id,bucket_name,object_path,alt_text,width,height,main_image))',
      ].join(','),
    );

    if (activeOnly) {
      params = params.set('active', 'eq.true');
    }

    return this.requireConfiguration().pipe(
      switchMap(() =>
        this.http.get<SupabaseProductRow[]>(`${this.supabaseUrl}/rest/v1/products`, {
          headers: this.headers(),
          params,
        }),
      ),
      switchMap((rows) => this.attachSignedImages(rows)),
    );
  }

  getCategories(): Observable<Category[]> {
    const params = new HttpParams()
      .set('select', 'id:category_id,name,description,active')
      .set('order', 'name.asc');

    return this.requireConfiguration().pipe(
      switchMap(() =>
        this.http.get<SupabaseCategoryRow[]>(`${this.supabaseUrl}/rest/v1/category`, {
          headers: this.headers(),
          params,
        }),
      ),
      map((rows) => rows.map((row) => this.toCategory(row))),
    );
  }

  getProductImages(productId: string): Observable<ProductImage[]> {
    const params = new HttpParams()
      .set(
        'select',
        'id,bucket_name,object_path,alt_text,width,height,main_image,product_image_product!inner(product_id)',
      )
      .set('product_image_product.product_id', `eq.${productId}`)
      .set('order', 'main_image.desc');

    return this.requireConfiguration().pipe(
      switchMap(() =>
        this.http.get<SupabaseImageRow[]>(`${this.supabaseUrl}/rest/v1/product_image`, {
          headers: this.headers(),
          params,
        }),
      ),
      switchMap((rows) => this.signImages(rows)),
    );
  }

  private attachSignedImages(rows: SupabaseProductRow[]): Observable<Product[]> {
    const uniqueImages = new Map<string, SupabaseImageRow>();

    for (const row of rows) {
      for (const join of row.product_image_product ?? []) {
        if (join.product_image) {
          uniqueImages.set(join.product_image.id, join.product_image);
        }
      }
    }

    return this.signImages([...uniqueImages.values()]).pipe(
      map((signedImages) => {
        const imagesById = new Map(signedImages.map((image) => [image.id, image]));

        return rows.map((row) => ({
          id: row.id,
          name: row.name ?? '',
          description: row.description ?? '',
          price: Number(row.price ?? 0),
          quantity: row.quantity ?? 0,
          tags: row.tags ?? [],
          active: row.active ?? false,
          category: this.toCategory(row.category),
          productImage: (row.product_image_product ?? [])
            .map((join) => (join.product_image ? imagesById.get(join.product_image.id) : undefined))
            .filter((image): image is ProductImage => image !== undefined)
            .sort((left, right) => Number(right.mainImage) - Number(left.mainImage)),
        }));
      }),
    );
  }

  private signImages(rows: SupabaseImageRow[]): Observable<ProductImage[]> {
    if (rows.length === 0) {
      return of([]);
    }

    return forkJoin(
      rows.map((row) =>
        this.createImageUrl(row).pipe(
          map((imageUrl) => this.toProductImage(row, imageUrl)),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(map((images) => images.filter((image): image is ProductImage => image !== null)));
  }

  private createImageUrl(image: SupabaseImageRow): Observable<string> {
    const objectLocation = [image.bucket_name, ...image.object_path.split('/')]
      .map(encodeURIComponent)
      .join('/');

    if (this.storageBucketPublic) {
      return of(`${this.supabaseUrl}/storage/v1/object/public/${objectLocation}`);
    }

    return this.http
      .post<SignedUrlResponse>(
        `${this.supabaseUrl}/storage/v1/object/sign/${objectLocation}`,
        { expiresIn: 3600 },
        { headers: this.headers() },
      )
      .pipe(
        map((response) => response.signedURL ?? response.signedUrl ?? ''),
        map((signedUrl) => {
          if (!signedUrl) {
            throw new Error(`Supabase did not return a signed URL for image ${image.id}.`);
          }

          if (/^https?:\/\//.test(signedUrl)) {
            return signedUrl;
          }

          if (signedUrl.startsWith('/storage/v1/')) {
            return `${this.supabaseUrl}${signedUrl}`;
          }

          return `${this.supabaseUrl}/storage/v1${signedUrl.startsWith('/') ? '' : '/'}${signedUrl}`;
        }),
      );
  }

  private toProductImage(row: SupabaseImageRow, imageUrl: string): ProductImage {
    return {
      id: row.id,
      bucketName: row.bucket_name,
      objectPath: row.object_path,
      altText: row.alt_text ?? '',
      width: row.width,
      height: row.height,
      signedUrl: imageUrl,
      mainImage: row.main_image ?? false,
      productIds: row.product_image_product?.map((join) => join.product_id) ?? [],
    };
  }

  private toCategory(row: SupabaseCategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      active: row.active,
    };
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      apikey: this.publishableKey,
    });
  }

  private requireConfiguration(): Observable<void> {
    if (!this.supabaseUrl || !this.publishableKey) {
      return throwError(
        () =>
          new Error(
            'Supabase direct mode requires environment.supabaseUrl and environment.supabasePublishableKey.',
          ),
      );
    }

    return of(undefined);
  }
}
