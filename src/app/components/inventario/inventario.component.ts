import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Vehiculo } from '../../core/models';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-inventario', standalone: false, templateUrl: './inventario.component.html', styleUrl: './inventario.component.css' })
export class InventarioComponent {
  form: FormGroup;
  edicion = '';
  verFormulario = false;
  buscar = '';
  filtroSede = '';
  filtroEstado = '';
  error = '';
  exito = '';
  readonly validar = validarControl;

  constructor(public datos: DatosService, fb: FormBuilder) {
    this.form = fb.group({
      placa: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9-]{5,10}$')]], marca: ['', Validators.required],
      modeloAnio: [null, [Validators.required, Validators.min(1900), Validators.max(2100)]], kilometraje: [0, [Validators.required, Validators.min(0)]],
      color: ['', Validators.required], categoriaId: ['', Validators.required], sedeId: ['', Validators.required], estado: ['disponible', Validators.required]
    });
  }
  get filtrados(): Vehiculo[] {
    const q = this.buscar.toLowerCase().trim();
    return this.datos.vehiculos.filter(v => `${v.placa} ${v.marca} ${this.datos.nombreCategoria(v.categoriaId)}`.toLowerCase().includes(q) &&
      (!this.filtroSede || v.sedeId === this.filtroSede) && (!this.filtroEstado || v.estado === this.filtroEstado));
  }
  nuevo(): void { this.cancelar(); this.verFormulario = true; }
  cancelar(): void { this.edicion = ''; this.verFormulario = false; this.error = ''; this.form.reset({ estado: 'disponible', kilometraje: 0 }); }
  editar(v: Vehiculo): void { this.edicion = v.id; this.verFormulario = true; this.error = ''; this.exito = ''; this.form.patchValue(v); }
  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error = 'Completa los datos del vehículo con valores válidos.'; return; }
    const valor = this.form.getRawValue();
    valor.placa = valor.placa.trim().toUpperCase();
    if (this.datos.vehiculos.some(v => v.id !== this.edicion && v.placa === valor.placa)) { this.error = 'La placa ya se encuentra registrada.'; return; }
    if (!this.datos.categorias.some(c => c.id === valor.categoriaId && c.estado === 'activo')) { this.error = 'Selecciona una categoría activa.'; return; }
    if (!this.datos.sedes.some(s => s.id === valor.sedeId && s.estado === 'activo')) { this.error = 'Selecciona una sede activa.'; return; }
    if (valor.estado !== 'disponible' && this.datos.reservas.some(r => r.vehiculoId === this.edicion && r.estado === 'borrador')) { this.error = 'Cancela las pre-reservas locales pendientes antes de retirar el vehículo de disponibilidad.'; return; }
    const anterior = this.datos.vehiculos.find(v => v.id === this.edicion);
    const registro: Vehiculo = { ...valor, id: this.edicion || this.datos.nuevoId(), creado: anterior?.creado || this.datos.fechaActual() };
    try { this.datos.guardar('vehiculos', registro); this.cancelar(); this.exito = 'Vehículo guardado localmente.'; }
    catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo guardar el vehículo.'; }
  }
}
