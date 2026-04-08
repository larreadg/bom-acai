import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'categorias',
    loadComponent: () => import('./features/categories/category-list/category-list.component').then(m => m.CategoryListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'categorias/nueva',
    loadComponent: () => import('./features/categories/category-form/category-form.component').then(m => m.CategoryFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'categorias/:id/editar',
    loadComponent: () => import('./features/categories/category-form/category-form.component').then(m => m.CategoryFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'productos',
    loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'productos/nuevo',
    loadComponent: () => import('./features/products/product-form/product-form.component').then(m => m.ProductFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'productos/:id/editar',
    loadComponent: () => import('./features/products/product-form/product-form.component').then(m => m.ProductFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'presentaciones',
    loadComponent: () => import('./features/presentations/presentation-list/presentation-list.component').then(m => m.PresentationListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'presentaciones/nueva',
    loadComponent: () => import('./features/presentations/presentation-form/presentation-form.component').then(m => m.PresentationFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'presentaciones/:id/editar',
    loadComponent: () => import('./features/presentations/presentation-form/presentation-form.component').then(m => m.PresentationFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pedidos',
    loadComponent: () => import('./features/orders/order-create/order-create.component').then(m => m.OrderCreateComponent),
    canActivate: [authGuard]
  },
  {
    path: 'historial',
    loadComponent: () => import('./features/orders/order-list/order-list.component').then(m => m.OrderListComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'extras',
    loadComponent: () => import('./features/extras/extra-list/extra-list.component').then(m => m.ExtraListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'extras/nuevo',
    loadComponent: () => import('./features/extras/extra-form/extra-form.component').then(m => m.ExtraFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'extras/:id/editar',
    loadComponent: () => import('./features/extras/extra-form/extra-form.component').then(m => m.ExtraFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
