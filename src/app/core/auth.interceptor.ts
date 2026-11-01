import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api-config';
import { AuthService } from './auth.service';

/**
 * Agrega el JWT a las peticiones al backend y, si este responde 401 con una sesión abierta
 * (token vencido o inválido), cierra la sesión y lleva al usuario a iniciar sesión de nuevo.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) { return next(req); }
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(peticion).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && token && !req.url.endsWith('/auth/login')) {
      auth.cerrarSesion();
      router.navigate(['/acceso'], { queryParams: { volver: router.url } });
    }
    return throwError(() => error);
  }));
};
