import { TestBed } from '@angular/core/testing';
import { CatalogoComponent } from '../components/catalogo/catalogo.component';
import { PagosComponent } from '../components/pagos/pagos.component';
import { ReservasComponent } from '../components/reservas/reservas.component';
import { fechaIso } from '../core/formato';
import { API, CAT, PAGINA, RESERVA, RESUMEN, SEDE, SEGURO, VEH, configurar, responder, sesionComo, tick } from './ayudas';

describe('Catalogo, reservas y pagos contra el backend', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

  it('catalogo: pide sedes, categorias y disponibilidad y muestra los vehiculos', async () => {
    const http = configurar(); const fixture = TestBed.createComponent(CatalogoComponent); fixture.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/categorias', [CAT]);
    const disp = await responder(http, 'GET', '/vehiculos/disponibles', [VEH]);
    expect(disp.request.params.get('fechaInicio')).toBe(fechaIso()); expect(disp.request.params.get('fechaFin')).toBe(fechaIso(1));
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Chevrolet Spark'); expect(texto).toContain('ABC123'); expect(texto).toContain('1 opción encontrada');
    fixture.componentInstance.categoria = 1; const p = fixture.componentInstance.buscar();
    const r2 = await responder(http, 'GET', '/vehiculos/disponibles', [VEH]); await p;
    expect(r2.request.params.get('idCategoria')).toBe('1'); http.verify();
  });

  it('catalogo: con fechas invalidas no consulta al backend', async () => {
    const http = configurar(); const fixture = TestBed.createComponent(CatalogoComponent); fixture.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/categorias', [CAT]); await responder(http, 'GET', '/vehiculos/disponibles', []);
    const c = fixture.componentInstance;
    c.inicio = fechaIso(3); c.fin = fechaIso(1); await c.buscar();
    expect(c.fechaError).toContain('posterior'); expect(c.vehiculos).toEqual([]);
    c.inicio = fechaIso(-2); c.fin = fechaIso(1); await c.buscar(); expect(c.fechaError).toContain('anterior a hoy');
    http.expectNone(r => r.url.endsWith('/vehiculos/disponibles')); http.verify();
  });

  it('reservas (asesor): crea la reserva, rechaza un pago y cancela la pre-reserva', async () => {
    sesionComo('asesor', 'EMPLEADO', 2);
    const http = configurar(); const fixture = TestBed.createComponent(ReservasComponent); const c = fixture.componentInstance; fixture.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/seguros', [SEGURO]);
    await responder(http, 'GET', '/clientes', PAGINA([{ idCliente: 9, numeroDocumento: '123', primerNombre: 'Ana', segundoNombre: null, primerApellido: 'Perez', segundoApellido: null, correo: 'a@x.com', telefono: null, estado: 'ACTIVO' }]));
    await responder(http, 'GET', '/reservas', PAGINA([])); await tick();
    c.nueva(); c.form.patchValue({ clienteId: 9, fechaInicio: fechaIso(), fechaFin: fechaIso(2) });
    const f = c.cambioFechas(); await responder(http, 'GET', '/vehiculos/disponibles', [VEH]); await f;
    c.form.patchValue({ vehiculoId: 7 }); c.cambioVehiculo(); c.alternarSeguro(3, true); await tick();
    const cotizaciones = http.match(r => r.url.endsWith('/reservas/cotizacion'));
    expect(cotizaciones.length).toBe(2); expect(cotizaciones[1].request.params.get('idsSeguros')).toBe('3');
    cotizaciones.forEach(q => q.flush({ idVehiculo: 7, dias: 2, costoTotal: 204000 })); await tick();
    expect(c.cotizacion?.costoTotal).toBe(204000); expect(c.form.get('sedeRecibeId')?.value).toBe(1);
    const g = c.guardar();
    const post = await responder(http, 'POST', '/reservas', RESERVA('PENDIENTE', 204000));
    expect(post.request.body).toMatchObject({ idCliente: 9, idVehiculo: 7, idAsesor: 2, idSedeEntrega: 1, idSedeRecibe: 1, idsSeguros: [3] });
    await responder(http, 'GET', '/reservas', PAGINA([RESUMEN])); await g;
    expect(c.detalle?.estadoReserva).toBe('PENDIENTE'); expect(c.exito).toContain('Reserva creada');
    c.pago.resultado = 'RECHAZADO'; const p = c.pagar();
    const pago = await responder(http, 'POST', '/reservas/5/pagos', RESERVA('CANCELADA', 204000));
    expect(pago.request.body).toMatchObject({ monto: 204000, estado: 'RECHAZADO' });
    await responder(http, 'GET', '/reservas', PAGINA([])); await p;
    expect(c.exito).toContain('rechazó'); expect(c.detalle?.estadoReserva).toBe('CANCELADA'); http.verify();
  });

  it('reservas: no deja crear con fechas cruzadas ni pagar mas que el saldo', async () => {
    sesionComo('asesor', 'EMPLEADO', 2);
    const http = configurar(); const fixture = TestBed.createComponent(ReservasComponent); const c = fixture.componentInstance; fixture.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/seguros', []); await responder(http, 'GET', '/clientes', PAGINA([])); await responder(http, 'GET', '/reservas', PAGINA([RESUMEN]));
    c.nueva(); c.form.patchValue({ clienteId: 9, vehiculoId: 7, sedeRecibeId: 1, fechaInicio: fechaIso(3), fechaFin: fechaIso(1) });
    await c.guardar(); expect(c.error).toContain('posterior');
    const v = c.verDetalle(RESUMEN as never); await responder(http, 'GET', '/reservas/5', RESERVA('PENDIENTE', 204000)); await v;
    c.pago.monto = 999999999; await c.pagar(); expect(c.error).toContain('saldo pendiente');
    c.pago.monto = 0; await c.pagar(); expect(c.error).toContain('mayor que cero');
    http.expectNone(r => r.method === 'POST'); http.verify();
  });

  it('reservas (asesor): aprobar el pago confirma y luego inicia con su propio id', async () => {
    sesionComo('asesor', 'EMPLEADO', 2);
    const http = configurar(); const fixture = TestBed.createComponent(ReservasComponent); const c = fixture.componentInstance; fixture.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/seguros', []); await responder(http, 'GET', '/clientes', PAGINA([])); await responder(http, 'GET', '/reservas', PAGINA([RESUMEN]));
    const v = c.verDetalle(RESUMEN as never); await responder(http, 'GET', '/reservas/5', RESERVA('PENDIENTE', 204000)); await v;
    const p = c.pagar(); await responder(http, 'POST', '/reservas/5/pagos', RESERVA('CONFIRMADA', 0)); await responder(http, 'GET', '/reservas', PAGINA([])); await p;
    expect(c.exito).toContain('confirmada'); expect(c.puedeIniciar).toBe(true);
    const i = c.iniciar(); const ini = await responder(http, 'POST', '/reservas/5/iniciar', RESERVA('EN_CURSO', 0));
    expect(ini.request.body).toEqual({ idAsesor: 2 });
    await responder(http, 'GET', '/reservas', PAGINA([])); await i;
    expect(c.detalle?.estadoReserva).toBe('EN_CURSO'); expect(c.puedeFinalizar).toBe(true); expect(c.puedeCancelar).toBe(false); http.verify();
  });

  it('reservas (cliente): el formulario usa su propio id, sin asesor ni listado de clientes', async () => {
    sesionComo('cliente', 'CLIENTE', 9);
    const http = configurar(); const fixture = TestBed.createComponent(ReservasComponent); const c = fixture.componentInstance; fixture.detectChanges();
    await responder(http, 'GET', '/sedes', [SEDE]); await responder(http, 'GET', '/seguros', []);
    const lista = await responder(http, 'GET', '/reservas', PAGINA([])); expect(lista.request.params.get('idCliente')).toBe('9');
    await responder(http, 'GET', '/clientes/9/penalizaciones', []);
    c.nueva(); expect(c.form.getRawValue().clienteId).toBe(9); expect(c.form.get('clienteId')?.disabled).toBe(true); expect(c.puedeOperar).toBe(false);
    // El cliente ve su saldo, pero no puede registrar (ni aprobar) su propio pago.
    c.detalle = RESERVA('PENDIENTE', 204000) as never;
    expect(c.tieneSaldoPorPagar).toBe(true); expect(c.puedePagar).toBe(false);
    http.expectNone(r => r.url.endsWith('/clientes')); http.expectNone(r => r.url.endsWith('/pagos')); http.verify();
  });

  it('pagos: lista las pendientes y registra un pago aprobado', async () => {
    sesionComo('administrador', 'EMPLEADO', 1);
    const http = configurar(); const fixture = TestBed.createComponent(PagosComponent); const c = fixture.componentInstance; fixture.detectChanges();
    const lista = await responder(http, 'GET', '/reservas', PAGINA([RESUMEN])); expect(lista.request.params.get('estado')).toBe('PENDIENTE');
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('ABC123');
    const e = c.elegir(RESUMEN as never); await responder(http, 'GET', '/reservas/5', RESERVA('PENDIENTE', 204000)); await e;
    expect(c.pago.monto).toBe(204000);
    const p = c.pagar(); await responder(http, 'POST', '/reservas/5/pagos', RESERVA('CONFIRMADA', 0)); await responder(http, 'GET', '/reservas', PAGINA([])); await p;
    expect(c.exito).toContain('confirmada'); expect(API).toContain('/api'); http.verify();
  });
});
