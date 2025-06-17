import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';

export const routes: Routes = [
//   {
//     path: '',
//     loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
//   }
    {
        path: '',
        component: HomePage
    }
];
