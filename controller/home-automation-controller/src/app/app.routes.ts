import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'ui/home',
        pathMatch: 'full',
    },
    {
        title: 'Home',
        path: 'ui/home',
        pathMatch: 'full',
        loadComponent: () => import('./home-page/home-page').then(m => m.HomePage),
    },
    {
        title: 'Login',
        path: 'ui/login',
        pathMatch: 'full',
        loadComponent: () => import('./login-page/login-page').then(m => m.LoginPage),
    },
    {
        title: 'Logout',
        path: 'ui/logout',
        pathMatch: 'full',
        loadComponent: () => import('./logout-page/logout-page').then(m => m.LogoutPage),
    },
    {
        title: 'Not Found',
        path: 'ui/not-found',
        pathMatch: 'full',
        loadComponent: () => import('./not-found-page/not-found-page').then(m => m.NotFoundPage),
    },
    {
        title: 'Unexpected Error',
        path: 'ui/unexpected-error',
        pathMatch: 'full',
        loadComponent: () => import('./unexpected-error-page/unexpected-error-page').then(m => m.UnexpectedErrorPage),
    },
    {
        path: '**',
        redirectTo: 'ui/home',
        pathMatch: 'full',

        // canActivate?: Array<CanActivateFn | DeprecatedGuard>;
        // canMatch?: Array<CanMatchFn | DeprecatedGuard>;
        // canActivateChild?: Array<CanActivateChildFn | DeprecatedGuard>;
        // canDeactivate?: Array<CanDeactivateFn<any> | DeprecatedGuard>;
        // canLoad?: Array<CanLoadFn | DeprecatedGuard>;
        // runGuardsAndResolvers?: RunGuardsAndResolvers;

        // /**
        //  * Additional developer-defined data provided to the component via
        //  * `ActivatedRoute`. By default, no additional data is passed.
        //  */
        // data?: Data;

        // children?: Routes;
        // loadChildren?: LoadChildren;
    }
];
