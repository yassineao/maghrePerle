import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductsService } from '../../core/api/products_api/product.service';
import { CategoryService } from '../../core/api/category_api/category.service';
import { Category } from '../../core/interfaces/Category';
import { map } from 'rxjs';
import { PopupShopPage } from '../../components/popup/Popup';
import { CataloguePage } from '../../components/catalogue/Catalogue';

const ALL_CATEGORY: Category = {
  id: '0',
  name: 'All',
  description: 'All',
  active: true,
};

@Component({
  selector: 'app-shop-page',
  templateUrl: './Shop.html',
  styleUrl: './Shop.css',
  imports: [CataloguePage],
})
export class ShopPage {}
