import { TestBed } from '@angular/core/testing';
import { ClientesComponent } from '../components/clientes/clientes.component';
import { ConfiguracionComponent } from '../components/configuracion/configuracion.component';
import { EmpleadosComponent } from '../components/empleados/empleados.component';
import { InspeccionesComponent } from '../components/inspecciones/inspecciones.component';
import { InventarioComponent } from '../components/inventario/inventario.component';
import { ReportesComponent } from '../components/reportes/reportes.component';
import { CAT, CLIENTE, INSP, PAGINA, SEDE, VEH, configurar, responder, sesionComo, tick } from './ayudas';

describe('Pantallas del personal contra el backend', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

  it('clientes: crea el cliente y luego su licencia', async () => {
    sesionComo('administrador', 'EMPLEADO', 1);
    const http = configurar(); const f = TestBed.createComponent(ClientesComponent); const c = f.componentInstance; f.detectChanges();
    await responder(http, 'GET', '/clientes', PAGINA([CLIENTE]));
    f.detectChanges(); expect(f.nativeElement.textContent).toContain('Ana');
    c.nuevo();
    c.form.patchValue({ documento: '999888', primerNombre: 'Luis', primerApellido: 'Gomez', correo: 'L@x.com', telefono: '3011234567', clave: 'ClavePrueba2026', numeroLicencia: 'L-1', categoriaLicencia: 'B1', expedicion: '2020-01-01', vencimiento: '2035-01-01' });
    const g = c.guardar();
    const post = await responder(http, 'POST', '/clientes', { ...CLIENTE, idCliente: 20 });
    expect(post.request.body).toMatchObject({ numeroDocumento: '999888', correo: 'l@x.com', clave: 'ClavePrueba2026' });
    const lic = await responder(http, 'POST', '/clientes/20/licencia', { idLicencia: 1 });
    expect(lic.request.body).toEqual({ numeroLicencia: 'L-1', categoriaLicencia: 'B1', fechaExpedicion: '2020-01-01', fechaVencimiento: '2035-01-01' });
    await responder(http, 'GET', '/clientes', PAGINA([CLIENTE])); await g;
    expect(c.exito).toContain('registrados'); http.verify();
  });

  it('flota: lista y registra un vehiculo; el estado se cambia con PATCH', async () => {
    sesionComo('administrador', 'EMPLEADO', 1);
    const http = configurar(); const f = TestBed.createComponent(InventarioComponent); const c = f.componentInstance; f.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/categorias', [CAT]);
    await responder(http, 'GET', '/vehiculos', PAGINA([VEH]));
    f.detectChanges(); expect(f.nativeElement.textContent).toContain('ABC123');
    c.nuevo(); c.form.patchValue({ placa: 'xyz789', marca: 'Kia', modeloAnio: 2024, kilometraje: 0, idCategoria: 1, idSede: 1 });
    const g = c.guardar();
    const post = await responder(http, 'POST', '/vehiculos', { ...VEH, idVehiculo: 8 });
    expect(post.request.body).toMatchObject({ placa: 'XYZ789', marca: 'Kia', modeloAnio: 2024, idCategoria: 1, idSede: 1 });
    await responder(http, 'GET', '/vehiculos', PAGINA([VEH])); await g;
    const e = c.cambiarEstado(VEH as never, 'EN_MANTENIMIENTO');
    const patch = await responder(http, 'PATCH', '/vehiculos/7/estado', VEH);
    expect(patch.request.body).toEqual({ estado: 'EN_MANTENIMIENTO' });
    await responder(http, 'GET', '/vehiculos', PAGINA([VEH])); await e; http.verify();
  });

  it('catalogos: crea una categoria y desactiva una sede', async () => {
    sesionComo('administrador', 'EMPLEADO', 1);
    const http = configurar(); const f = TestBed.createComponent(ConfiguracionComponent); const c = f.componentInstance; f.detectChanges();
    const rc = await responder(http, 'GET', '/categorias', [CAT]); await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/seguros', []);
    expect(rc.request.params.get('incluirInactivos')).toBe('true');
    c.nuevo(); c.form.patchValue({ nombre: 'SUV', tarifaDiaria: 150000, capacidadPasajeros: 7, tipoTransmision: 'AUTOMATICA' });
    const g = c.guardar();
    const post = await responder(http, 'POST', '/categorias', CAT);
    expect(post.request.body).toEqual({ nombreCategoria: 'SUV', tarifaDiaria: 150000, capacidadPasajeros: 7, tipoTransmision: 'AUTOMATICA' });
    await responder(http, 'GET', '/categorias', [CAT]); await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/seguros', []); await g;
    c.seleccionar('sedes'); vi.spyOn(window, 'confirm').mockReturnValue(true);
    const d = c.cambiar(1, 'ACTIVO');
    const patch = await responder(http, 'PATCH', '/sedes/1/estado', SEDE);
    expect(patch.request.body).toEqual({ estado: 'INACTIVO' });
    await responder(http, 'GET', '/categorias', [CAT]); await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/seguros', []); await d; http.verify();
  });

  it('empleados: registra un asesor con su sede y clave inicial', async () => {
    sesionComo('administrador', 'EMPLEADO', 1);
    const http = configurar(); const f = TestBed.createComponent(EmpleadosComponent); const c = f.componentInstance; f.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/empleados', []);
    c.nuevo(); c.form.patchValue({ documento: '55555', primerNombre: 'Sara', primerApellido: 'Mora', correo: 'S@x.com', clave: 'ClavePrueba2026', fechaContratacion: '2025-01-10', idSede: 1, tipo: 'ASESOR', mostradorAsignado: 3 });
    const g = c.guardar();
    const post = await responder(http, 'POST', '/empleados', {});
    expect(post.request.body).toMatchObject({ numeroDocumento: '55555', correo: 's@x.com', idSede: 1, tipo: 'ASESOR', mostradorAsignado: 3 });
    await responder(http, 'GET', '/empleados', []); await g; expect(c.exito).toContain('registrado'); http.verify();
  });

  it('inspecciones (asesor): registra la ENTREGA de una reserva confirmada y sube la foto', async () => {
    sesionComo('asesor', 'EMPLEADO', 2);
    const http = configurar(); const f = TestBed.createComponent(InspeccionesComponent); const c = f.componentInstance; f.detectChanges();
    await responder(http, 'GET', '/vehiculos', PAGINA([VEH]));
    c.vehiculoId = 7; const e = c.elegirVehiculo(); await responder(http, 'GET', '/vehiculos/7/inspecciones', []); await e;
    c.nueva(); const res = await responder(http, 'GET', '/reservas', PAGINA([{ idReserva: 5, estadoReserva: 'CONFIRMADA', fechaInicio: '2026-11-01', fechaFin: '2026-11-03', costoTotal: 1, idCliente: 9, nombreCliente: 'Ana Perez', idVehiculo: 7, placa: 'ABC123' }]));
    expect(res.request.params.get('estado')).toBe('CONFIRMADA'); expect(c.reservasElegibles.length).toBe(1);
    expect(c.tiposPermitidos).toEqual(['ENTREGA', 'DEVOLUCION']);
    c.form.patchValue({ idReserva: 5, combustible: 'LLENO', kilometraje: 1000 });
    c.archivosPendientes = [new File(['x'], 'frente.jpg', { type: 'image/jpeg' })];
    const g = c.guardar();
    const post = await responder(http, 'POST', '/vehiculos/7/inspecciones', INSP);
    expect(post.request.body).toMatchObject({ tipo: 'ENTREGA', idReserva: 5, combustible: 'LLENO', kilometraje: 1000, danos: [], piezasCambiadas: [] });
    const foto = await responder(http, 'POST', `/inspecciones/${'a'.repeat(24)}/fotos`, INSP);
    expect(foto.request.body instanceof FormData).toBe(true);
    await responder(http, 'GET', '/vehiculos/7/inspecciones', [INSP]); await g;
    expect(c.exito).toContain('registrada'); http.verify();
  });

  it('inspecciones (tecnico): solo MANTENIMIENTO, sin reserva, con piezas', async () => {
    sesionComo('tecnico', 'EMPLEADO', 3);
    const http = configurar(); const f = TestBed.createComponent(InspeccionesComponent); const c = f.componentInstance; f.detectChanges();
    await responder(http, 'GET', '/vehiculos', PAGINA([VEH]));
    c.vehiculoId = 7; const e = c.elegirVehiculo(); await responder(http, 'GET', '/vehiculos/7/inspecciones', []); await e;
    c.nueva(); await tick();
    expect(c.tiposPermitidos).toEqual(['MANTENIMIENTO']); expect(c.necesitaReserva).toBe(false);
    c.nuevaPieza = { nombre: 'Llanta', cantidad: 2, costo: 300000 }; c.agregarPieza();
    c.form.patchValue({ combustible: 'MEDIO', kilometraje: 1200 });
    const g = c.guardar();
    const post = await responder(http, 'POST', '/vehiculos/7/inspecciones', { ...INSP, tipo: 'MANTENIMIENTO', idReserva: null });
    expect(post.request.body.idReserva).toBeUndefined();
    expect(post.request.body).toMatchObject({ tipo: 'MANTENIMIENTO', piezasCambiadas: [{ nombre: 'Llanta', cantidad: 2, costo: 300000 }] });
    await responder(http, 'GET', '/vehiculos/7/inspecciones', []); await g; http.verify();
  });

  it('reportes (admin): historial del vehiculo y reportes generales', async () => {
    sesionComo('administrador', 'EMPLEADO', 1);
    const http = configurar(); const f = TestBed.createComponent(ReportesComponent); const c = f.componentInstance; f.detectChanges();
    await responder(http, 'GET', '/vehiculos', PAGINA([VEH])); await responder(http, 'GET', '/reportes/flota/estado', [{ estado: 'DISPONIBLE', cantidad: 8 }]);
    await responder(http, 'GET', '/piezas-mas-cambiadas', []); await responder(http, 'GET', '/gasto-por-tecnico', []);
    await responder(http, 'GET', '/reportes/ingresos-por-sede', [{ idSede: 1, nombreSede: 'Sede Chapinero', ingresos: 294000, pagosAprobados: 1 }]);
    await responder(http, 'GET', '/reportes/seguros-mas-contratados', []); await responder(http, 'GET', '/reportes/empleados-por-sede', []);
    c.vehiculoId = 7; const h = c.cambiarVehiculo();
    await responder(http, 'GET', '/reportes/vehiculos/7/historial', { vehiculo: VEH, resumen: { totalReservas: 2, reservasFinalizadas: 1, reservasCanceladas: 1, ingresosPorAlquiler: 294000, totalInspecciones: 2, totalDanosReportados: 1, totalPiezasCambiadas: 0, costoMantenimiento: 0, totalPenalizaciones: 150000 }, reservas: [], inspecciones: [], penalizaciones: [] }); await h;
    f.detectChanges(); const t = f.nativeElement.textContent as string;
    expect(t).toContain('Alquileres'); expect(t).toContain('Sede Chapinero'); http.verify();
  });
});
