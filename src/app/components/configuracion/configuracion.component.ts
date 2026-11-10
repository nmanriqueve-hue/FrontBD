import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { CategoriaResponse, EstadoCatalogo, SedeResponse, SeguroResponse } from '../../core/api-models';
import { validarControl } from '../../core/validadores';

type Catalogo = 'categorias' | 'sedes' | 'seguros';

@Component({ selector: 'app-configuracion', standalone: false, templateUrl: './configuracion.component.html', styleUrl: './configuracion.component.css' })
export class ConfiguracionComponent implements OnInit {
  tab: Catalogo = 'categorias';
  form: FormGroup;
  categorias: CategoriaResponse[] = [];
  sedes: SedeResponse[] = [];
  seguros: SeguroResponse[] = [];
  edicion: number | null = null;
  error = '';
  exito = '';
  verFormulario = false;
  guardando = false;
  readonly validar = validarControl;
  constructor(private api: ApiService, private fb: FormBuilder) { this.form = this.crearFormulario('categorias'); }

  ngOnInit(): void { void this.cargar(); }
  /** El administrador ve también los registros inactivos. */
  async cargar(): Promise<void> {
    try {
      const [categorias, sedes, seguros] = await Promise.all([firstValueFrom(this.api.categorias(true)), firstValueFrom(this.api.sedes(true)), firstValueFrom(this.api.seguros(true))]);
      this.categorias = categorias; this.sedes = sedes; this.seguros = seguros;
    } catch (e) { this.error = mensajeError(e, 'No se pudieron cargar los catálogos.'); }
  }

  private crearFormulario(tipo: Catalogo): FormGroup {
    if (tipo === 'categorias') { return this.fb.group({ nombre: ['', [Validators.required, Validators.maxLength(50)]], tarifaDiaria: [null, [Validators.required, Validators.min(1)]], capacidadPasajeros: [null, [Validators.required, Validators.min(1), Validators.max(100)]], tipoTransmision: ['', Validators.required] }); }
    if (tipo === 'sedes') { return this.fb.group({ nombre: ['', [Validators.required, Validators.maxLength(100)]], ciudad: ['', [Validators.required, Validators.maxLength(50)]], direccion: ['', [Validators.required, Validators.maxLength(150)]], capacidadEstacionamiento: [null, [Validators.required, Validators.min(1)]] }); }
    return this.fb.group({ nombre: ['', [Validators.required, Validators.maxLength(100)]], descripcion: ['', Validators.maxLength(255)], costoDiario: [null, [Validators.required, Validators.min(0)]] });
  }

  seleccionar(tab: Catalogo): void { this.tab = tab; this.cerrar(); this.exito = ''; }
  nuevo(): void { this.cerrar(); this.exito = ''; this.verFormulario = true; }
  cerrar(): void { this.edicion = null; this.error = ''; this.verFormulario = false; this.form = this.crearFormulario(this.tab); }
  editarCategoria(c: CategoriaResponse): void { this.cerrar(); this.edicion = c.idCategoria; this.verFormulario = true; this.form.patchValue({ nombre: c.nombreCategoria, tarifaDiaria: c.tarifaDiaria, capacidadPasajeros: c.capacidadPasajeros, tipoTransmision: c.tipoTransmision }); }
  editarSede(s: SedeResponse): void { this.cerrar(); this.edicion = s.idSede; this.verFormulario = true; this.form.patchValue({ nombre: s.nombreSede, ciudad: s.ciudad, direccion: s.direccion, capacidadEstacionamiento: s.capacidadEstacionamiento }); }
  editarSeguro(s: SeguroResponse): void { this.cerrar(); this.edicion = s.idSeguro; this.verFormulario = true; this.form.patchValue({ nombre: s.nombreSeguro, descripcion: s.descripcion ?? '', costoDiario: s.costoDiario }); }

  async guardar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.guardando) { return; }
    if (this.form.invalid) { this.error = 'Corrige los campos señalados.'; return; }
    const v = this.form.getRawValue();
    const nombre = String(v.nombre).trim();
    this.guardando = true;
    try {
      if (this.tab === 'categorias') {
        const datos = { nombreCategoria: nombre, tarifaDiaria: Number(v.tarifaDiaria), capacidadPasajeros: Number(v.capacidadPasajeros), tipoTransmision: v.tipoTransmision };
        await firstValueFrom(this.edicion === null ? this.api.crearCategoria(datos) : this.api.actualizarCategoria(this.edicion, datos));
      } else if (this.tab === 'sedes') {
        const datos = { nombreSede: nombre, ciudad: v.ciudad.trim(), direccion: v.direccion.trim(), capacidadEstacionamiento: Number(v.capacidadEstacionamiento) };
        await firstValueFrom(this.edicion === null ? this.api.crearSede(datos) : this.api.actualizarSede(this.edicion, datos));
      } else {
        const datos = { nombreSeguro: nombre, descripcion: v.descripcion?.trim() || undefined, costoDiario: Number(v.costoDiario) };
        await firstValueFrom(this.edicion === null ? this.api.crearSeguro(datos) : this.api.actualizarSeguro(this.edicion, datos));
      }
      const eraNuevo = this.edicion === null;
      this.cerrar(); await this.cargar();
      this.exito = eraNuevo ? 'Registro creado.' : 'Registro actualizado.';
    } catch (e) { this.error = mensajeError(e, 'No se pudo guardar.'); }
    finally { this.guardando = false; }
  }

  /** Activa o desactiva: los registros desactivados se conservan para el historial. */
  async cambiar(id: number, estado: EstadoCatalogo): Promise<void> {
    const destino: EstadoCatalogo = estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    if (destino === 'INACTIVO' && !confirm('¿Marcar este registro como inactivo? Los registros históricos se conservarán.')) { return; }
    this.error = ''; this.exito = '';
    try {
      if (this.tab === 'categorias') { await firstValueFrom(this.api.estadoCategoria(id, destino)); }
      else if (this.tab === 'sedes') { await firstValueFrom(this.api.estadoSede(id, destino)); }
      else { await firstValueFrom(this.api.estadoSeguro(id, destino)); }
      await this.cargar(); this.exito = 'Estado actualizado.';
    } catch (e) { this.error = mensajeError(e, 'No se pudo actualizar el estado.'); }
  }
}
