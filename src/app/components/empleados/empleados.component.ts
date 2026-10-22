import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Empleado, RolEmpleado } from '../../core/models';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-empleados', standalone: false, templateUrl: './empleados.component.html', styleUrl: './empleados.component.css' })
export class EmpleadosComponent {
  form: FormGroup;
  edicion = '';
  abierto = false;
  buscar = '';
  error = '';
  exito = '';
  readonly validar = validarControl;
  constructor(public datos: DatosService, fb: FormBuilder) {
    this.form = fb.group({ documento: ['', [Validators.required, Validators.pattern('^[0-9A-Za-z-]{4,25}$')]], primerNombre: ['', Validators.required], primerApellido: ['', Validators.required], fechaContratacion: ['', Validators.required], sedeId: ['', Validators.required], rol: ['asesor', Validators.required], estado: ['activo', Validators.required], nivelAcceso: [''], bonoGerencial: [0, Validators.min(0)], mostradorAsignado: [''], especialidad: [''] });
  }
  get filtrados(): Empleado[] { const q = this.buscar.toLowerCase().trim(); return this.datos.empleados.filter(e => `${e.primerNombre} ${e.primerApellido} ${e.documento} ${e.rol}`.toLowerCase().includes(q)); }
  get rol(): RolEmpleado { return this.form.get('rol')?.value as RolEmpleado; }
  nuevo(): void { this.cerrar(); this.abierto = true; }
  cerrar(): void { this.abierto = false; this.edicion = ''; this.error = ''; this.form.reset({ rol: 'asesor', estado: 'activo', bonoGerencial: 0 }); }
  editar(e: Empleado): void { this.edicion = e.id; this.abierto = true; this.error = ''; this.exito = ''; this.form.patchValue(e); }
  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error = 'Completa los campos obligatorios con datos válidos.'; return; }
    const v = this.form.getRawValue();
    if (v.rol === 'administrador') { this.error = 'La plataforma tiene un solo administrador fijo. Registra asesores o técnicos.'; return; }
    if (this.datos.empleados.some(e => e.id !== this.edicion && e.documento === v.documento.trim())) { this.error = 'El documento ya corresponde a otro empleado.'; return; }
    if (!this.datos.sedes.some(s => s.id === v.sedeId && s.estado === 'activo')) { this.error = 'Selecciona una sede activa.'; return; }
    const anterior = this.datos.empleados.find(e => e.id === this.edicion);
    const e: Empleado = { ...v, documento: v.documento.trim(), id: this.edicion || this.datos.nuevoId(), creado: anterior?.creado || this.datos.fechaActual(), nivelAcceso: v.rol === 'administrador' ? v.nivelAcceso : '', bonoGerencial: v.rol === 'administrador' ? Number(v.bonoGerencial) : 0, mostradorAsignado: v.rol === 'asesor' ? v.mostradorAsignado : '', especialidad: v.rol === 'tecnico' ? v.especialidad : '' };
    try { this.datos.guardar('empleados', e); this.cerrar(); this.exito = 'Empleado registrado en este navegador.'; }
    catch (err) { this.error = err instanceof Error ? err.message : 'No fue posible guardar.'; }
  }
}
