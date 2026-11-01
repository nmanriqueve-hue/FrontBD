import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService, RolAcceso } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RolGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(ruta: ActivatedRouteSnapshot, estado: RouterStateSnapshot): boolean | UrlTree {
    const sesion = this.auth.sesion;
    if (!sesion) { return this.router.createUrlTree(['/acceso'], { queryParams: { volver: estado.url } }); }
    // Con clave temporal el backend solo deja cambiar la clave: se lleva al perfil hasta que la cambie.
    if (sesion.debeCambiarClave && estado.url.split('?')[0] !== '/perfil') { return this.router.createUrlTree(['/perfil']); }
    const roles = ruta.data['roles'] as RolAcceso[] | undefined;
    if (roles?.length && !this.auth.tieneRol(roles)) { return this.router.createUrlTree(['/sin-permiso']); }
    return true;
  }
}
