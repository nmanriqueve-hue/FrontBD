import { LOCALE_ID, NgModule } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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

registerLocaleData(localeEsCo);

@NgModule({
  declarations: [AppComponent, InicioComponent, CatalogoComponent, ClientesComponent, InventarioComponent,
    ConfiguracionComponent, EmpleadosComponent, ReservasComponent, PagosComponent, InspeccionesComponent,
    ReportesComponent, AccesoComponent, RegistroComponent, RecuperacionComponent, CuentasComponent,
    PerfilComponent, SinPermisoComponent],
  imports: [BrowserModule, FormsModule, ReactiveFormsModule, AppRoutingModule],
  providers: [{ provide: LOCALE_ID, useValue: 'es-CO' }],
  bootstrap: [AppComponent]
})
export class AppModule {}
