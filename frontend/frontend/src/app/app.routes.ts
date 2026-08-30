import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'MaghrePerle | L’élégance marocaine au féminin',
    loadComponent: () => import('./pages/home/Home').then((module) => module.HomePage),
  },
  {
    path: 'shop',
    title: 'Boutique | MaghrePerle',
    loadComponent: () => import('./pages/shop/Shop').then((module) => module.ShopPage),
  },
  {
    path: 'about',
    title: 'À propos | MaghrePerle',
    loadComponent: () => import('./pages/about/AboutPage').then((module) => module.AboutPage),
  },
  {
    path: 'contact',
    title: 'Contact | MaghrePerle',
    loadComponent: () => import('./pages/contact/Contact').then((module) => module.ContactPage),
  },
  {
    path: 'admin',
    title: 'Connexion administrateur | MaghrePerle',
    loadComponent: () => import('./pages/admin/Admin').then((module) => module.AdminPage),
  },
  {
    path: 'admin/products',
    title: 'Gestion des produits | MaghrePerle',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-products/AdminProducts').then((module) => module.AdminProductsPage),
  },
  { path: '**', redirectTo: '' },
];
