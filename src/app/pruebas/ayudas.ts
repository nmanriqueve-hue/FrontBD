import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideRouter, RouterLink } from '@angular/router';
import { authInterceptor } from '../core/auth.interceptor';
import { fechaIso } from '../core/formato';
import { CatalogoComponent } from '../components/catalogo/catalogo.component';
import { ClientesComponent } from '../components/clientes/clientes.component';
import { ConfiguracionComponent } from '../components/configuracion/configuracion.component';
import { EmpleadosComponent } from '../components/empleados/empleados.component';
import { InspeccionesComponent } from '../components/inspecciones/inspecciones.component';
import { InventarioComponent } from '../components/inventario/inventario.component';
import { PagosComponent } from '../components/pagos/pagos.component';
import { RegistroComponent } from '../components/registro/registro.component';
import { ReportesComponent } from '../components/reportes/reportes.component';
import { ReservasComponent } from '../components/reservas/reservas.component';

/** Módulo solo para pruebas: declara los componentes con las mismas dependencias que AppModule. */
@NgModule({
  declarations: [CatalogoComponent, ClientesComponent, ConfiguracionComponent, EmpleadosComponent, InspeccionesComponent, InventarioComponent, PagosComponent, RegistroComponent, ReportesComponent, ReservasComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink]
})
export class PruebaModule {}

export const API = 'http://localhost:8080/api';
export const tick = (): Promise<void> => new Promise(r => setTimeout(r, 0));
export const PAGINA = (content: object[]) => ({ content, totalElements: content.length, totalPages: 1, number: 0, size: 200 });

export const SEDE = { idSede: 1, nombreSede: 'Sede Chapinero', ciudad: 'Bogota', direccion: 'x', capacidadEstacionamiento: 10, estado: 'ACTIVO' };
export const CAT = { idCategoria: 1, nombreCategoria: 'Compacto', capacidadPasajeros: 5, tarifaDiaria: 90000, tipoTransmision: 'MANUAL', estado: 'ACTIVO' };
export const VEH = { idVehiculo: 7, placa: 'ABC123', marca: 'Chevrolet Spark', modeloAnio: 2023, kilometraje: 1000, estado: 'DISPONIBLE', color: 'Rojo', idCategoria: 1, nombreCategoria: 'Compacto', idSede: 1, nombreSede: 'Sede Chapinero' };
export const SEGURO = { idSeguro: 3, nombreSeguro: 'Asistencia en ruta', descripcion: null, costoDiario: 12000, estado: 'ACTIVO' };
export const CLIENTE = { idCliente: 9, numeroDocumento: '123456', primerNombre: 'Ana', segundoNombre: null, primerApellido: 'Perez', segundoApellido: null, correo: 'a@x.com', telefono: '3001234567', estado: 'ACTIVO' };
export const INSP = { idInspeccion: 'a'.repeat(24), tipo: 'ENTREGA', idVehiculo: 7, idReserva: 5, idEmpleado: 2, combustible: 'LLENO', kilometraje: 1000, observacionesGenerales: null, danos: [], piezasCambiadas: [], fotos: [], fechaInspeccion: '2026-11-01T10:00:00' };
export const RESERVA = (estado: string, saldo: number) => ({ idReserva: 5, estadoReserva: estado, fechaCreacion: '2026-11-01', fechaInicio: fechaIso(), fechaFin: fechaIso(2), costoTotal: 204000, saldoPendiente: saldo, idCliente: 9, nombreCliente: 'Ana Perez', idVehiculo: 7, placa: 'ABC123', idAsesor: null, nombreAsesor: null, idSedeEntrega: 1, nombreSedeEntrega: 'Sede Chapinero', idSedeRecibe: 1, nombreSedeRecibe: 'Sede Chapinero', seguros: [], pagos: [] });
export const RESUMEN = { idReserva: 5, estadoReserva: 'PENDIENTE', fechaInicio: fechaIso(), fechaFin: fechaIso(2), costoTotal: 204000, idCliente: 9, nombreCliente: 'Ana Perez', idVehiculo: 7, placa: 'ABC123' };

/** Deja una sesión abierta (como la deja el login) sin pasar por el backend. */
export function sesionComo(rol: string, tipo: string, id: number, extra: Record<string, unknown> = {}): void {
  sessionStorage.setItem('rutacar.token', 'tok');
  sessionStorage.setItem('rutacar.expira', String(Date.now() + 3600000));
  const clienteId = tipo === 'CLIENTE' ? String(id) : undefined;
  const empleadoId = tipo === 'EMPLEADO' ? String(id) : undefined;
  sessionStorage.setItem('rutacar.perfil', JSON.stringify({ id, tipo, rol, nombre: 'Usuario Prueba', correo: 'u@x.com', estado: 'ACTIVO', debeCambiarClave: false, clienteId, empleadoId, ...extra }));
}

export function configurar(): HttpTestingController {
  TestBed.configureTestingModule({ imports: [PruebaModule], providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])] });
  return TestBed.inject(HttpTestingController);
}

/** Espera la petición, la responde y deja que el componente continúe. */
export async function responder(http: HttpTestingController, metodo: string, fin: string, cuerpo: object): Promise<TestRequest> {
  await tick();
  const req = http.expectOne(r => r.method === metodo && r.url.split('?')[0].endsWith(fin));
  req.flush(cuerpo);
  await tick();
  return req;
}
