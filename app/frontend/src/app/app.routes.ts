import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
    },
    {
        path: 'modules/:moduleId',
        loadComponent: () => import('./pages/module/module.page').then(m => m.ModulePage)
    },
    {
        path: 'modules/:moduleId/entities/:entityId',
        loadComponent: () => import('./pages/entity-mapping/entity-mapping.page').then(m => m.EntityMappingPage)
    },
];
