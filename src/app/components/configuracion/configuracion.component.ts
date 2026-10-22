import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Categoria, Sede, Seguro } from '../../core/models';
import { validarControl } from '../../core/validadores';

type Catalogo = 'categorias' | 'sedes' | 'seguros';

@Component({ selector: 'app-configuracion', standalone: false, templateUrl: './configuracion.component.html', styleUrl: './configuracion.component.css' })
export class ConfiguracionComponent {
  tab: Catalogo = 'categorias';
  form: FormGroup;
  edicion = '';
  error = '';
  exito = '';
  verFormulario = false;
  readonly validar = validarControl;
  constructor(public datos: DatosService, private fb: FormBuilder) { this.form = this.crearFormulario('categorias'); }

  private crearFormulario(tipo: Catalogo): FormGroup {
    if (tipo === 'categorias') { return this.fb.group({ nombre: ['', [Validators.required, Validators.maxLength(80)]], tarifaDiaria: [null, [Validators.required, Validators.min(1)]], capacidadPasajeros: [null, [Validators.required, Validators.min(1), Validators.max(100)]], tipoTransmision: ['', Validators.required], estado: ['activo'] }); }
    if (tipo === 'sedes') { return this.fb.group({ nombre: ['', [Validators.required, Validators.maxLength(100)]], ciudad: ['', Validators.required], direccion: ['', Validators.required], capacidadEstacionamiento: [null, [Validators.required, Validators.min(1)]], estado: ['activo'] }); }
    return this.fb.group({ nombre: ['', Validators.required], descripcion: [''], costoDiario: [null, [Validators.required, Validators.min(0)]], estado: ['activo'] });
  }

  seleccionar(tab: Catalogo): void { this.tab = tab; this.cerrar(); }
  nuevo(): void { this.cerrar(); this.verFormulario = true; }
  cerrar(): void { this.edicion = ''; this.error = ''; this.exito = ''; this.verFormulario = false; this.form = this.crearFormulario(this.tab); }
  editar(item: Categoria | Sede | Seguro): void { this.edicion = item.id; this.verFormulario = true; this.form.patchValue(item); this.error = ''; this.exito = ''; }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error = 'Corrige los campos señalados.'; return; }
    const valor = this.form.getRawValue();
    const texto = String(valor.nombre).trim();
    const lista = this.datos.datos[this.tab];
    if (lista.some(item => item.id !== this.edicion && item.nombre.toLowerCase() === texto.toLowerCase())) { this.error = 'Ya existe un registro con ese nombre en este catálogo.'; return; }
    const registro = { ...valor, nombre: texto, id: this.edicion || this.datos.nuevoId(), creado: lista.find(item => item.id === this.edicion)?.creado || this.datos.fechaActual() };
    try {
      if (this.tab === 'categorias') { this.datos.guardar('categorias', registro as Categoria); }
      if (this.tab === 'sedes') { this.datos.guardar('sedes', registro as Sede); }
      if (this.tab === 'seguros') { this.datos.guardar('seguros', registro as Seguro); }
      this.cerrar(); this.exito = 'Registro guardado en este navegador.';
    } catch (error) { this.error = error instanceof Error ? error.message : 'No se pudo guardar.'; }
  }

  cambiar(item: Categoria | Sede | Seguro): void {
    if (item.estado === 'activo' && !confirm('¿Marcar este registro como inactivo? Los registros históricos se conservarán.')) { return; }
    try {
      if (this.tab === 'categorias') { this.datos.guardar('categorias', { ...item, estado: item.estado === 'activo' ? 'inactivo' : 'activo' } as Categoria); }
      if (this.tab === 'sedes') { this.datos.guardar('sedes', { ...item, estado: item.estado === 'activo' ? 'inactivo' : 'activo' } as Sede); }
      if (this.tab === 'seguros') { this.datos.guardar('seguros', { ...item, estado: item.estado === 'activo' ? 'inactivo' : 'activo' } as Seguro); }
      this.exito = 'Estado actualizado localmente.';
    } catch (error) { this.error = error instanceof Error ? error.message : 'No se pudo actualizar.'; }
  }
}
