import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { ClientesComponent } from './components/clientes/clientes.component';
import { InventarioComponent } from './components/inventario/inventario.component';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { EmpleadosComponent } from './components/empleados/empleados.component';
import { ReservasComponent } from './components/reservas/reservas.component';
import { PagosComponent } from './components/pagos/pagos.component';
import { InspeccionesComponent } from './components/inspecciones/inspecciones.component';
import { ReportesComponent } from './components/reportes/reportes.component';
import { AccesoComponent } from './components/acceso/acceso.component';
import { RegistroComponent } from './components/registro/registro.component';
import { RecuperacionComponent } from './components/recuperacion/recuperacion.component';
import { CuentasComponent } from './components/cuentas/cuentas.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { SinPermisoComponent } from './components/sin-permiso/sin-permiso.component';
import { RolGuard } from './core/rol.guard';

const rutas: Routes = [
  { path: '', component: InicioComponent, title: 'Alquila un vehículo | RutaCar' },
  { path: 'catalogo', component: CatalogoComponent, title: 'Encuentra tu vehículo | RutaCar' },
  { path: 'acceso', component: AccesoComponent, title: 'Iniciar sesión | RutaCar' },
  { path: 'registro', component: RegistroComponent, title: 'Crear cuenta | RutaCar' },
  { path: 'recuperar', component: RecuperacionComponent, title: 'Recuperar acceso | RutaCar' },
  { path: 'sin-permiso', component: SinPermisoComponent, title: 'Acceso restringido | RutaCar' },
  { path: 'panel', component: InicioComponent, canActivate: [RolGuard], title: 'Mi panel | RutaCar' },
  { path: 'perfil', component: PerfilComponent, canActivate: [RolGuard], title: 'Mi cuenta | RutaCar' },
  { path: 'reservas', component: ReservasComponent, canActivate: [RolGuard], data: { roles: ['cliente','administrador','asesor'] }, title: 'Reservas | RutaCar' },
  { path: 'clientes', component: ClientesComponent, canActivate: [RolGuard], data: { roles: ['administrador','asesor'] }, title: 'Clientes | RutaCar' },
  { path: 'pagos', component: PagosComponent, canActivate: [RolGuard], data: { roles: ['administrador','asesor'] }, title: 'Pagos | RutaCar' },
  { path: 'inspecciones', component: InspeccionesComponent, canActivate: [RolGuard], data: { roles: ['administrador','asesor','tecnico'] }, title: 'Inspecciones | RutaCar' },
  { path: 'flota', component: InventarioComponent, canActivate: [RolGuard], data: { roles: ['administrador'] }, title: 'Flota | RutaCar' },
  { path: 'catalogos', component: ConfiguracionComponent, canActivate: [RolGuard], data: { roles: ['administrador'] }, title: 'Sedes, categorías y seguros | RutaCar' },
  { path: 'empleados', component: EmpleadosComponent, canActivate: [RolGuard], data: { roles: ['administrador'] }, title: 'Empleados | RutaCar' },
  { path: 'cuentas', component: CuentasComponent, canActivate: [RolGuard], data: { roles: ['administrador'] }, title: 'Cuentas y roles | RutaCar' },
  { path: 'reportes', component: ReportesComponent, canActivate: [RolGuard], data: { roles: ['administrador','tecnico'] }, title: 'Reportes | RutaCar' },
  { path: '**', redirectTo: '' }
];

@NgModule({ imports: [RouterModule.forRoot(rutas, { scrollPositionRestoration: 'enabled' })], exports: [RouterModule] })
export class AppRoutingModule {}
