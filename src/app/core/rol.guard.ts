import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService, RolAcceso } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RolGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(ruta: ActivatedRouteSnapshot, estado: RouterStateSnapshot): boolean | UrlTree {
    const roles = ruta.data['roles'] as RolAcceso[] | undefined;
    if (!this.auth.sesion) { return this.router.createUrlTree(['/acceso'], { queryParams: { volver: estado.url } }); }
    if (roles?.length && !this.auth.tieneRol(roles)) { return this.router.createUrlTree(['/sin-permiso']); }
    return true;
  }
}
