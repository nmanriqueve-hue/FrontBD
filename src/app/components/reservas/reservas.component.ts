import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import {
  ClienteResponse, CotizacionResponse, EmpleadoResponse, EstadoReserva, PenalizacionResponse, ReservaResponse,
  ReservaResumen, SedeResponse, SeguroResponse, VehiculoResponse
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { fechaIso, METODOS_PAGO } from '../../core/formato';
import { fechasCoherentes, validarControl } from '../../core/validadores';

@Component({ selector: 'app-reservas', standalone: false, templateUrl: './reservas.component.html', styleUrl: './reservas.component.css' })
export class ReservasComponent implements OnInit {
  form: FormGroup;
  verFormulario = false;
  error = '';
  exito = '';
  guardando = false;
  cargando = false;
  filtro: EstadoReserva | '' = '';
  reservas: ReservaResumen[] = [];
  detalle: ReservaResponse | null = null;
  clientes: ClienteResponse[] = [];
  sedes: SedeResponse[] = [];
  seguros: SeguroResponse[] = [];
  vehiculos: VehiculoResponse[] = [];
  asesores: EmpleadoResponse[] = [];
  penalizaciones: PenalizacionResponse[] = [];
  segurosSeleccionados: number[] = [];
  cotizacion: CotizacionResponse | null = null;
  asesorElegido: number | '' = '';
  pago: { monto: number; metodo: string; resultado: 'APROBADO' | 'RECHAZADO' } = { monto: 0, metodo: 'TARJETA', resultado: 'APROBADO' };
  readonly metodos = METODOS_PAGO;
  readonly validar = validarControl;
  readonly hoy = fechaIso();
  private turnoCotizacion = 0;

  constructor(fb: FormBuilder, private api: ApiService, private ruta: ActivatedRoute, public auth: AuthService) {
    this.form = fb.group({
      clienteId: [null, Validators.required], vehiculoId: [null, Validators.required],
      fechaInicio: ['', Validators.required], fechaFin: ['', Validators.required], sedeRecibeId: [null, Validators.required]
    }, { validators: fechasCoherentes('fechaInicio', 'fechaFin') });
  }

  get puedeOperar(): boolean { return this.auth.tieneRol(['administrador', 'asesor']); }
  get vehiculoElegido(): VehiculoResponse | undefined { const id = this.form.get('vehiculoId')?.value; return this.vehiculos.find(v => v.idVehiculo === id); }
  get puedePagar(): boolean { const d = this.detalle; return !!d && d.saldoPendiente > 0 && (d.estadoReserva === 'PENDIENTE' || d.estadoReserva === 'CONFIRMADA'); }
  get puedeCancelar(): boolean { const e = this.detalle?.estadoReserva; return e === 'PENDIENTE' || e === 'CONFIRMADA'; }
  get puedeIniciar(): boolean { return this.puedeOperar && this.detalle?.estadoReserva === 'CONFIRMADA'; }
  get puedeFinalizar(): boolean { return this.puedeOperar && this.detalle?.estadoReserva === 'EN_CURSO'; }

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    try {
      const [sedes, seguros] = await Promise.all([firstValueFrom(this.api.sedes()), firstValueFrom(this.api.seguros())]);
      this.sedes = sedes; this.seguros = seguros;
      if (this.puedeOperar) { this.clientes = (await firstValueFrom(this.api.clientes({ size: 100 }))).content; }
    } catch (e) { this.error = mensajeError(e, 'No se pudieron cargar los datos de apoyo.'); }
    await this.cargarReservas();
    await this.cargarPenalizaciones();
    this.cargando = false;
    this.ruta.queryParamMap.subscribe(p => {
      const vehiculo = p.get('vehiculo');
      if (vehiculo) { void this.abrirDesdeCatalogo(Number(vehiculo), p.get('inicio') || '', p.get('fin') || '', p.get('sedeDevolucion')); }
    });
  }

  async cargarReservas(): Promise<void> {
    try {
      const pagina = await firstValueFrom(this.api.reservas({ idCliente: this.auth.esCliente ? this.auth.sesion?.id : null, estado: this.filtro || null, size: 100 }));
      this.reservas = pagina.content;
    } catch (e) { this.error = mensajeError(e, 'No se pudieron cargar las reservas.'); }
  }
  private async cargarPenalizaciones(): Promise<void> {
    const sesion = this.auth.sesion;
    if (!sesion || !this.auth.esCliente) { return; }
    try { this.penalizaciones = await firstValueFrom(this.api.penalizacionesDeCliente(sesion.id)); } catch { this.penalizaciones = []; }
  }

  // ---------- Nueva reserva ----------
  nueva(): void {
    this.cerrar(); this.cerrarDetalle(); this.verFormulario = true; this.exito = '';
    if (this.auth.esCliente) { this.form.patchValue({ clienteId: this.auth.sesion?.id }); this.form.get('clienteId')?.disable(); }
  }
  cerrar(): void {
    this.verFormulario = false; this.error = ''; this.segurosSeleccionados = []; this.vehiculos = []; this.cotizacion = null;
    this.form.get('clienteId')?.enable();
    this.form.reset({ clienteId: null, vehiculoId: null, fechaInicio: '', fechaFin: '', sedeRecibeId: null });
  }
  private async abrirDesdeCatalogo(idVehiculo: number, inicio: string, fin: string, sedeDevolucion: string | null): Promise<void> {
    this.nueva();
    this.form.patchValue({ fechaInicio: inicio, fechaFin: fin });
    await this.cargarVehiculos();
    if (!this.vehiculos.some(v => v.idVehiculo === idVehiculo)) { this.error = 'Ese vehículo ya no está disponible en las fechas elegidas. Elige otro.'; return; }
    this.form.patchValue({ vehiculoId: idVehiculo, ...(sedeDevolucion ? { sedeRecibeId: Number(sedeDevolucion) } : {}) });
    this.cambioVehiculo();
  }
  async cambioFechas(): Promise<void> { await this.cargarVehiculos(); await this.cotizar(); }
  private async cargarVehiculos(): Promise<void> {
    const v = this.form.getRawValue();
    if (!v.fechaInicio || !v.fechaFin || v.fechaInicio >= v.fechaFin) { this.vehiculos = []; return; }
    try { this.vehiculos = await firstValueFrom(this.api.vehiculosDisponibles({ fechaInicio: v.fechaInicio, fechaFin: v.fechaFin })); }
    catch (e) { this.vehiculos = []; this.error = mensajeError(e, 'No se pudo consultar la disponibilidad.'); }
    if (v.vehiculoId && !this.vehiculos.some(x => x.idVehiculo === v.vehiculoId)) { this.form.patchValue({ vehiculoId: null }); }
  }
  cambioVehiculo(): void {
    const vehiculo = this.vehiculoElegido;
    if (vehiculo && !this.form.get('sedeRecibeId')?.value) { this.form.patchValue({ sedeRecibeId: vehiculo.idSede }); }
    void this.cotizar();
  }
  alternarSeguro(id: number, valor: boolean): void {
    this.segurosSeleccionados = valor ? [...this.segurosSeleccionados, id] : this.segurosSeleccionados.filter(item => item !== id);
    void this.cotizar();
  }
  seguroMarcado(id: number): boolean { return this.segurosSeleccionados.includes(id); }
  /** El costo lo calcula la base de datos; aquí solo se muestra. */
  async cotizar(): Promise<void> {
    const v = this.form.getRawValue();
    const turno = ++this.turnoCotizacion;
    if (!v.vehiculoId || !v.fechaInicio || !v.fechaFin || v.fechaInicio >= v.fechaFin) { this.cotizacion = null; return; }
    try {
      const c = await firstValueFrom(this.api.cotizar({ idVehiculo: v.vehiculoId, fechaInicio: v.fechaInicio, fechaFin: v.fechaFin, idsSeguros: this.segurosSeleccionados }));
      if (turno === this.turnoCotizacion) { this.cotizacion = c; }
    } catch { if (turno === this.turnoCotizacion) { this.cotizacion = null; } }
  }

  async guardar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.guardando) { return; }
    if (this.form.invalid) { this.error = this.form.hasError('fechas') ? 'La fecha de devolución debe ser posterior a la de recogida.' : 'Completa todos los datos de la reserva.'; return; }
    const v = this.form.getRawValue();
    const vehiculo = this.vehiculoElegido;
    if (v.fechaInicio < this.hoy) { this.error = 'La recogida debe ser hoy o una fecha futura.'; return; }
    if (!vehiculo) { this.error = 'Elige un vehículo disponible para esas fechas.'; return; }
    this.guardando = true;
    try {
      const creada = await firstValueFrom(this.api.crearReserva({
        idCliente: v.clienteId, idVehiculo: v.vehiculoId, idAsesor: this.auth.esAsesor ? this.auth.sesion?.id : undefined,
        idSedeEntrega: vehiculo.idSede, idSedeRecibe: v.sedeRecibeId, fechaInicio: v.fechaInicio, fechaFin: v.fechaFin, idsSeguros: [...this.segurosSeleccionados]
      }));
      this.cerrar();
      await this.cargarReservas();
      this.abrirDetalle(creada);
      this.exito = 'Reserva creada. Queda pendiente y se confirma cuando el pago sea aprobado.';
    } catch (e) { this.error = mensajeError(e, 'No se pudo crear la reserva.'); }
    finally { this.guardando = false; }
  }

  // ---------- Detalle, pago y operación ----------
  async verDetalle(r: ReservaResumen): Promise<void> {
    this.error = ''; this.exito = ''; this.verFormulario = false;
    try { this.abrirDetalle(await firstValueFrom(this.api.reserva(r.idReserva))); }
    catch (e) { this.error = mensajeError(e, 'No se pudo cargar la reserva.'); }
  }
  private abrirDetalle(r: ReservaResponse): void {
    this.detalle = r; this.pago = { monto: r.saldoPendiente, metodo: 'TARJETA', resultado: 'APROBADO' };
    if (this.auth.esAdmin && !this.asesores.length) { void this.cargarAsesores(); }
  }
  private async cargarAsesores(): Promise<void> {
    try { this.asesores = await firstValueFrom(this.api.empleados({ tipo: 'ASESOR' })); } catch { this.asesores = []; }
  }
  cerrarDetalle(): void { this.detalle = null; }

  private async actualizar(r: ReservaResponse, mensaje: string): Promise<void> {
    this.abrirDetalle(r); this.exito = mensaje; await this.cargarReservas();
  }
  async pagar(): Promise<void> {
    const d = this.detalle;
    if (!d || this.guardando) { return; }
    this.error = ''; this.exito = '';
    const monto = Number(this.pago.monto);
    if (!(monto > 0) || monto > d.saldoPendiente) { this.error = 'El monto debe ser mayor que cero y no superar el saldo pendiente.'; return; }
    this.guardando = true;
    try {
      const r = await firstValueFrom(this.api.registrarPago(d.idReserva, { monto, metodoPago: this.pago.metodo, estado: this.pago.resultado }));
      let mensaje: string;
      if (this.pago.resultado === 'RECHAZADO') { mensaje = r.estadoReserva === 'CANCELADA' ? 'El banco rechazó el pago: la pre-reserva se canceló y el vehículo quedó libre.' : 'El banco rechazó el pago.'; }
      else { mensaje = r.saldoPendiente === 0 ? 'Pago aprobado: la reserva quedó confirmada.' : 'Pago aprobado. Queda un saldo pendiente.'; }
      await this.actualizar(r, mensaje);
    } catch (e) { this.error = mensajeError(e, 'No se pudo registrar el pago.'); }
    finally { this.guardando = false; }
  }
  async cancelar(): Promise<void> {
    const d = this.detalle;
    if (!d || !confirm('¿Cancelar esta reserva? Los pagos aprobados se reembolsan.')) { return; }
    this.error = ''; this.exito = '';
    try { await this.actualizar(await firstValueFrom(this.api.cancelarReserva(d.idReserva)), 'Reserva cancelada.'); }
    catch (e) { this.error = mensajeError(e, 'No se pudo cancelar la reserva.'); }
  }
  async iniciar(): Promise<void> {
    const d = this.detalle;
    if (!d) { return; }
    this.error = ''; this.exito = '';
    const idAsesor = this.auth.esAsesor ? this.auth.sesion?.id : Number(this.asesorElegido);
    if (!idAsesor) { this.error = 'Elige el asesor que entrega el vehículo.'; return; }
    try { await this.actualizar(await firstValueFrom(this.api.iniciarReserva(d.idReserva, idAsesor)), 'Entrega registrada: el alquiler está en curso.'); }
    catch (e) { this.error = mensajeError(e, 'No se pudo iniciar el alquiler.'); }
  }
  async finalizar(): Promise<void> {
    const d = this.detalle;
    if (!d) { return; }
    this.error = ''; this.exito = '';
    try { await this.actualizar(await firstValueFrom(this.api.finalizarReserva(d.idReserva)), 'Devolución registrada: el alquiler finalizó.'); }
    catch (e) { this.error = mensajeError(e, 'No se pudo finalizar el alquiler.'); }
  }
}
