import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../../interfaces/Product';
import {
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../../../environment';
import { ProductImageService } from '../supabase_api/product_image.service';
import { SupabaseCatalogService } from '../supabase_api/supabase-catalog.service';

export interface ProductCreateRequest {
  name: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  active: boolean;
  categoryId: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private httpClient = inject(HttpClient);
  private apiUrl: string = environment.apiUrl;
  private productImageService = inject(ProductImageService);
  private supabaseCatalogService = inject(SupabaseCatalogService);
  private productsRequest?: Observable<Product[]>;
  private activeProductsRequest?: Observable<Product[]>;
  readonly productsLoaded = signal(false);

  getProducts(): Observable<Product[]> {
    if (this.productsRequest) {
      return this.productsRequest;
    }

    const productsSource =
      environment.productDataSource === 'supabase'
        ? this.supabaseCatalogService.getProducts()
        : this.getProductsFromSpring();

    this.productsRequest = productsSource.pipe(
      map((products) =>
        this.shareVariantImages(products.map((product) => this.parseProductOptions(product))),
      ),
      tap(() => this.productsLoaded.set(true)),
      catchError((error) => {
        this.productsRequest = undefined;
        this.productsLoaded.set(false);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.productsRequest;
  }

  private getProductsFromSpring(): Observable<Product[]> {
    return this.httpClient.get<Product[]>(`${this.apiUrl}/product`).pipe(
      switchMap((products) => {
        if (products.length === 0) {
          return of<Product[]>([]);
        }

        return forkJoin(
          products.map((product) => {
            return this.productImageService.getProductImages(product.id).pipe(
              map((images) => ({
                ...product,
                productImage: images,
              })),
              catchError(() =>
                of({
                  ...product,
                  productImage: [],
                }),
              ),
            );
          }),
        );
      }),

    );
  }

  getActiveProducts(): Observable<Product[]> {
    if (this.activeProductsRequest) {
      return this.activeProductsRequest;
    }

    const productsSource =
      environment.productDataSource === 'supabase'
        ? this.supabaseCatalogService.getProducts(true)
        : this.httpClient.get<Product[]>(`${this.apiUrl}/product/active`).pipe(
            switchMap((products) =>
              products.length === 0
                ? of([])
                : forkJoin(
                    products.map((product) =>
                      this.productImageService.getProductImages(product.id).pipe(
                        map((images) => ({
                          ...product,
                          productImage: images,
                        })),
                      ),
                    ),
                  ),
            ),
          );

    this.activeProductsRequest = productsSource.pipe(
      map((products) =>
        this.shareVariantImages(products.map((product) => this.parseProductOptions(product))),
      ),
      tap(() => this.productsLoaded.set(true)),
      catchError((error) => {
        this.activeProductsRequest = undefined;
        this.productsLoaded.set(false);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.activeProductsRequest;
  }

  private parseProductOptions(product: Product): Product {
    if (!product.name.includes('[')) {
      return {
        ...product,
      };
    }
    const name = product.name.slice(0, product.name.indexOf('[')).trim();
    const size = product.name
      .slice(product.name.indexOf('[') + 1, product.name.indexOf(']'))
      .trim();
    const color = product.name
      .slice(product.name.indexOf(']') + 1, product.name.endsWith('@') ? product.name.indexOf('@') : undefined )
      .trim();

    return {
      ...product,
      name: name || product.name,
      size,
      color,
    };
  }

  private shareVariantImages(products: Product[]): Product[] {
    const imagesByProduct = new Map<string, Map<string, Product['productImage'][number]>>();

    for (const product of products) {
      const groupKey = `${product.category.id}:${product.name}`;
      const images = imagesByProduct.get(groupKey) ?? new Map();
      for (const image of product.productImage ?? []) {
        images.set(image.id, image);
      }
      imagesByProduct.set(groupKey, images);
    }

    return products.map((product) => {
      const groupKey = `${product.category.id}:${product.name}`;
      const productImage = [...(imagesByProduct.get(groupKey)?.values() ?? [])].sort(
        (left, right) => Number(right.mainImage) - Number(left.mainImage),
      );

      return { ...product, productImage };
    });
  }

  private toProductRequest(product: Product): ProductCreateRequest {
    return {
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      tags: product.tags,
      active: product.active,
      categoryId: product.category.id,
    };
  }

  private invalidateProductsCache(): void {
    this.productsRequest = undefined;
    this.activeProductsRequest = undefined;
    this.productsLoaded.set(false);
  }

  refreshProducts(): Observable<Product[]> {
    this.invalidateProductsCache();
    return this.getProducts();
  }

  private authenticatedRequestOptions(): {
    withCredentials: true;
    headers?: Record<string, string>;
  } {
    const accessToken =
      typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');

    return {
      withCredentials: true,
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    };
  }

  addProduct(product: ProductCreateRequest): Observable<void> {
    return this.addProducts([product]);
  }

  addProducts(products: ProductCreateRequest[]): Observable<void> {
    return this.httpClient
      .post<void>(`${this.apiUrl}/product`, products, this.authenticatedRequestOptions())
      .pipe(tap(() => this.invalidateProductsCache()));
  }

  addProductsAndReturnCreated(products: ProductCreateRequest[]): Observable<Product[]> {
    const requestedNames = new Set(products.map((product) => product.name));

    return this.httpClient.get<Product[]>(`${this.apiUrl}/product`).pipe(
      map((existingProducts) => new Set(existingProducts.map((product) => product.id))),
      switchMap((existingIds) =>
        this.httpClient
          .post<void>(`${this.apiUrl}/product`, products, this.authenticatedRequestOptions())
          .pipe(
            tap(() => this.invalidateProductsCache()),
            switchMap(() => this.httpClient.get<Product[]>(`${this.apiUrl}/product`)),
            map((allProducts) =>
              allProducts.filter(
                (product) => !existingIds.has(product.id) && requestedNames.has(product.name),
              ),
            ),
          ),
      ),
    );
  }

  updateProduct(product: Product): Observable<void> {
    return this.httpClient
      .patch<void>(
        `${this.apiUrl}/product/${product.id}`,
        this.toProductRequest(product),
        this.authenticatedRequestOptions(),
      )
      .pipe(tap(() => this.invalidateProductsCache()));
  }

  deleteProduct(productId: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.apiUrl}/product/${productId}`, this.authenticatedRequestOptions())
      .pipe(tap(() => this.invalidateProductsCache()));
  }
}
