import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { CategoriaResponse, EstadoVehiculo, SedeResponse, VehiculoResponse } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { validarControl, resumenInvalidos, enfocarPrimerInvalido } from '../../core/validadores';

@Component({ selector: 'app-inventario', standalone: false, templateUrl: './inventario.component.html', styleUrl: './inventario.component.css' })
export class InventarioComponent implements OnInit {
  form: FormGroup;
  vehiculos: VehiculoResponse[] = [];
  sedes: SedeResponse[] = [];
  categorias: CategoriaResponse[] = [];
  verFormulario = false;
  buscar = '';
  filtroSede: number | '' = '';
  filtroEstado: EstadoVehiculo | '' = '';
  cargando = false;
  guardando = false;
  error = '';
  exito = '';
  /** ALQUILADO lo gestiona el sistema con las reservas; no se elige a mano. */
  readonly estadosManuales: EstadoVehiculo[] = ['DISPONIBLE', 'EN_MANTENIMIENTO', 'BAJA', 'VENDIDO'];
  readonly validar = validarControl;

  constructor(private api: ApiService, fb: FormBuilder, public auth: AuthService) {
    this.form = fb.group({
      placa: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9-]{5,10}$')]], marca: ['', [Validators.required, Validators.maxLength(50)]],
      modeloAnio: [null, [Validators.required, Validators.min(1950), Validators.max(2100)]], kilometraje: [0, [Validators.required, Validators.min(0)]],
      color: ['', Validators.maxLength(30)], idCategoria: [null, Validators.required], idSede: [null, Validators.required]
    });
  }
  ngOnInit(): void { void this.iniciar(); }
  private async iniciar(): Promise<void> {
    try {
      const [sedes, categorias] = await Promise.all([firstValueFrom(this.api.sedes()), firstValueFrom(this.api.categorias())]);
      this.sedes = sedes; this.categorias = categorias;
    } catch (e) { this.error = mensajeError(e, 'No se pudieron cargar las sedes y categorías.'); }
    await this.cargar();
  }
  async cargar(): Promise<void> {
    this.cargando = true;
    try {
      this.vehiculos = (await firstValueFrom(this.api.vehiculos({ idSede: this.filtroSede === '' ? null : this.filtroSede, estado: this.filtroEstado || null, size: 200 }))).content;
    } catch (e) { this.error = mensajeError(e, 'No se pudo cargar la flota.'); }
    finally { this.cargando = false; }
  }
  get filtrados(): VehiculoResponse[] {
    const q = this.buscar.toLowerCase().trim();
    return this.vehiculos.filter(v => `${v.placa} ${v.marca} ${v.nombreCategoria}`.toLowerCase().includes(q));
  }
  nuevo(): void { this.cancelar(); this.exito = ''; this.verFormulario = true; }
  cancelar(): void { this.verFormulario = false; this.error = ''; this.form.reset({ kilometraje: 0, idCategoria: null, idSede: null }); }

  async guardar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.guardando) { return; }
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    const v = this.form.getRawValue();
    this.guardando = true;
    try {
      await firstValueFrom(this.api.crearVehiculo({ placa: v.placa.trim().toUpperCase(), marca: v.marca.trim(), modeloAnio: Number(v.modeloAnio), kilometraje: Number(v.kilometraje), color: v.color?.trim() || undefined, idCategoria: v.idCategoria, idSede: v.idSede }));
      this.cancelar(); await this.cargar(); this.exito = 'Vehículo registrado.';
    } catch (e) { this.error = mensajeError(e, 'No se pudo registrar el vehículo.'); }
    finally { this.guardando = false; }
  }
  async cambiarEstado(v: VehiculoResponse, estado: string): Promise<void> {
    if (estado === v.estado) { return; }
    if ((estado === 'BAJA' || estado === 'VENDIDO') && !confirm('Un vehículo dado de baja o vendido sale de la disponibilidad, pero su historial se conserva. ¿Continuar?')) { await this.cargar(); return; }
    this.error = ''; this.exito = '';
    try { await firstValueFrom(this.api.estadoVehiculo(v.idVehiculo, estado as EstadoVehiculo)); this.exito = 'Estado del vehículo actualizado.'; }
    catch (e) { this.error = mensajeError(e, 'No se pudo cambiar el estado.'); }
    await this.cargar();
  }
}
