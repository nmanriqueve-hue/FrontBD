import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, RolAcceso } from './core/auth.service';

interface Navegacion { titulo: string; ruta: string; codigo: string; roles?: RolAcceso[]; }

@Component({ selector: 'app-root', standalone: false, templateUrl: './app.component.html', styleUrl: './app.component.css' })
export class AppComponent {
  menuAbierto = false;
  readonly enlaces: Navegacion[] = [
    { titulo: 'Panel principal', ruta: '/panel', codigo: '01' },
    { titulo: 'Explorar vehículos', ruta: '/catalogo', codigo: '02' },
    { titulo: 'Mis reservas', ruta: '/reservas', codigo: '03', roles: ['cliente'] },
    { titulo: 'Reservas', ruta: '/reservas', codigo: '03', roles: ['administrador', 'asesor'] },
    { titulo: 'Clientes', ruta: '/clientes', codigo: '04', roles: ['administrador', 'asesor'] },
    { titulo: 'Pagos', ruta: '/pagos', codigo: '05', roles: ['administrador', 'asesor'] },
    { titulo: 'Inspecciones', ruta: '/inspecciones', codigo: '06', roles: ['administrador', 'asesor', 'tecnico'] },
    { titulo: 'Vehículos / flota', ruta: '/flota', codigo: '07', roles: ['administrador'] },
    { titulo: 'Sedes y tarifas', ruta: '/catalogos', codigo: '08', roles: ['administrador'] },
    { titulo: 'Empleados', ruta: '/empleados', codigo: '09', roles: ['administrador'] },
    { titulo: 'Cuentas y permisos', ruta: '/cuentas', codigo: '10', roles: ['administrador'] },
    { titulo: 'Reportes', ruta: '/reportes', codigo: '11', roles: ['administrador', 'tecnico'] },
    { titulo: 'Mi perfil', ruta: '/perfil', codigo: '12' }
  ];
  constructor(public auth: AuthService, private router: Router) {}
  get iniciales(): string { return (this.auth.sesion?.nombre || 'RC').split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase(); }
  get visibles(): Navegacion[] { return this.enlaces.filter(e => !e.roles || this.auth.tieneRol(e.roles)); }
  salir(): void { this.auth.cerrarSesion(); this.menuAbierto = false; this.router.navigateByUrl('/'); }
  cerrarMenu(): void { this.menuAbierto = false; }
}
