import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Reserva, Vehiculo } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { fechasCoherentes, validarControl } from '../../core/validadores';

@Component({ selector: 'app-reservas', standalone: false, templateUrl: './reservas.component.html', styleUrl: './reservas.component.css' })
export class ReservasComponent implements OnInit {
  form: FormGroup;
  verFormulario = false;
  edicion = '';
  error = '';
  exito = '';
  guardando = false;
  filtro = '';
  segurosSeleccionados: string[] = [];
  readonly validar = validarControl;

  constructor(public datos: DatosService, fb: FormBuilder, private ruta: ActivatedRoute, public auth: AuthService) {
    this.form = fb.group({ clienteId: ['', Validators.required], vehiculoId: ['', Validators.required], fechaInicio: ['', Validators.required], fechaFin: ['', Validators.required], sedeEntregaId: ['', Validators.required], sedeRecibeId: ['', Validators.required] }, { validators: fechasCoherentes('fechaInicio', 'fechaFin') });
  }
  ngOnInit(): void {
    this.ruta.queryParamMap.subscribe(parametros => {
      const id = parametros.get('vehiculo');
      if (id && this.datos.vehiculos.some(v => v.id === id)) {
        this.nueva(id);
        this.form.patchValue({ fechaInicio: parametros.get('inicio') || '', fechaFin: parametros.get('fin') || '', ...(parametros.get('sedeDevolucion') ? { sedeRecibeId: parametros.get('sedeDevolucion') } : {}) });
      }
    });
  }
  get candidatos(): Vehiculo[] { return this.datos.vehiculos.filter(v => v.estado === 'disponible' && this.datos.categorias.some(c => c.id === v.categoriaId && c.estado === 'activo') && this.datos.sedes.some(s => s.id === v.sedeId && s.estado === 'activo')); }
  get segurosActivos() { return this.datos.seguros.filter(s => s.estado === 'activo'); }
  get cotizacion() { const v = this.form.getRawValue(); return this.datos.cotizar(v.vehiculoId, v.fechaInicio, v.fechaFin, this.segurosSeleccionados); }
  get filtrados(): Reserva[] { return this.datos.reservas.filter(r => (!this.auth.esCliente || r.clienteId === this.auth.sesion?.clienteId) && (!this.filtro || r.estado === this.filtro)); }

  nueva(vehiculoId = ''): void {
    this.cerrar(); this.verFormulario = true;
    if (this.auth.esCliente) { this.form.patchValue({ clienteId: this.auth.sesion?.clienteId || '' }); this.form.get('clienteId')?.disable(); }
    if (vehiculoId) { this.form.patchValue({ vehiculoId }); this.cambioVehiculo(); }
  }
  cerrar(): void { this.verFormulario = false; this.edicion = ''; this.error = ''; this.segurosSeleccionados = []; this.form.get('clienteId')?.enable(); this.form.reset({ clienteId: '', vehiculoId: '', fechaInicio: '', fechaFin: '', sedeEntregaId: '', sedeRecibeId: '' }); }
  cambioVehiculo(): void {
    const v = this.datos.vehiculos.find(item => item.id === this.form.get('vehiculoId')?.value);
    this.form.patchValue({ sedeEntregaId: v?.sedeId ?? '', sedeRecibeId: v?.sedeId ?? '' });
  }
  editar(r: Reserva): void {
    if (this.auth.esCliente && r.clienteId !== this.auth.sesion?.clienteId) { this.error = 'No puedes acceder a la reserva de otro cliente.'; return; }
    if (r.estado !== 'borrador') { this.error = 'Solo puedes editar pre-reservas sin cancelar.'; return; }
    this.nueva(); this.edicion = r.id; this.segurosSeleccionados = [...r.seguroIds]; this.form.patchValue(r);
  }
  alternarSeguro(id: string, valor: boolean): void { this.segurosSeleccionados = valor ? [...this.segurosSeleccionados, id] : this.segurosSeleccionados.filter(item => item !== id); }
  seguroMarcado(id: string): boolean { return this.segurosSeleccionados.includes(id); }

  guardar(): void {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.guardando) { return; }
    if (this.form.invalid) { this.error = this.form.hasError('fechas') ? 'La fecha de devolución debe ser posterior a la de recogida.' : 'Completa todos los datos de la pre-reserva.'; return; }
    const v = this.form.getRawValue();
    if (this.auth.esCliente && v.clienteId !== this.auth.sesion?.clienteId) { this.error = 'Solo puedes preparar pre-reservas para tu propia cuenta.'; return; }
    if (this.edicion) { const existente = this.datos.reservas.find(r => r.id === this.edicion); if (!existente || (this.auth.esCliente && existente.clienteId !== v.clienteId)) { this.error = 'No puedes modificar esta pre-reserva.'; return; } }
    if (new Date(v.fechaInicio).getTime() < Date.now()) { this.error = 'La recogida debe programarse para una fecha y hora futuras.'; return; }
    const cliente = this.datos.clientes.find(c => c.id === v.clienteId);
    if (!cliente || cliente.estado !== 'activo') { this.error = 'Selecciona un cliente activo y no bloqueado.'; return; }
    if (cliente.licencia.vencimiento < v.fechaInicio.slice(0, 10) || cliente.licencia.vencimiento < v.fechaFin.slice(0, 10)) { this.error = 'La licencia debe estar vigente durante todo el período de alquiler.'; return; }
    const vehiculo = this.candidatos.find(item => item.id === v.vehiculoId);
    if (!vehiculo) { this.error = 'Este vehículo no está disponible en el inventario local.'; return; }
    if (vehiculo.sedeId !== v.sedeEntregaId) { this.error = 'La sede de recogida debe ser la sede actual del vehículo.'; return; }
    if (!this.datos.sedes.some(s => s.id === v.sedeRecibeId && s.estado === 'activo')) { this.error = 'La sede de devolución debe estar activa.'; return; }
    const cruce = this.datos.tieneCruce(v.vehiculoId, v.clienteId, v.fechaInicio, v.fechaFin, this.edicion);
    if (cruce) { this.error = cruce; return; }
    const estimado = this.cotizacion;
    if (estimado.dias < 1) { this.error = 'El intervalo de alquiler debe ser mayor que cero.'; return; }
    const anterior = this.datos.reservas.find(r => r.id === this.edicion);
    const registro: Reserva = { ...v, id: this.edicion || this.datos.nuevoId(), creado: anterior?.creado ?? this.datos.fechaActual(), seguroIds: [...this.segurosSeleccionados], costoBase: estimado.base, costoSeguros: estimado.seguros, costoEstimado: estimado.total, estado: 'borrador' };
    this.guardando = true;
    try { this.datos.guardar('reservas', registro); this.cerrar(); this.exito = 'Pre-reserva guardada localmente. No está confirmada ni pagada.'; }
    catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo guardar la pre-reserva.'; }
    finally { this.guardando = false; }
  }
  cancelarReserva(r: Reserva): void {
    if ((this.auth.esCliente && r.clienteId !== this.auth.sesion?.clienteId) || r.estado === 'cancelada' || !confirm('¿Cancelar esta pre-reserva local? Esta acción conservará el historial.')) { return; }
    try { this.datos.guardar('reservas', { ...r, estado: 'cancelada' }); this.exito = 'Pre-reserva cancelada localmente.'; }
    catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo cancelar.'; }
  }
}
