import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { DatosService } from '../../core/datos.service';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-cuentas', standalone: false, templateUrl: './cuentas.component.html', styleUrl: './cuentas.component.css' })
export class CuentasComponent {
  form: FormGroup;
  abierto = false;
  cargando = false;
  error = '';
  exito = '';
  codigo = '';
  readonly validar = validarControl;
  constructor(public auth: AuthService, public datos: DatosService, fb: FormBuilder) {
    this.form = fb.group({ empleadoId: ['', Validators.required], correo: ['', [Validators.required, Validators.email]], clave: ['', [Validators.required, Validators.minLength(10)]] });
  }
  rolEmpleado(id: string): string { return this.datos.empleados.find(e => e.id === id)?.rol || 'sin empleado'; }
  get disponibles() { return this.datos.empleados.filter(e => e.estado === 'activo' && !this.auth.cuentas.some(c => c.empleadoId === e.id)); }
  async crear(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.form.invalid || this.cargando) { return; }
    this.cargando = true;
    try {
      const v = this.form.getRawValue();
      this.codigo = await this.auth.crearAccesoEmpleado(v.empleadoId, v.correo, v.clave);
      this.form.reset(); this.abierto = false; this.exito = 'Acceso de empleado creado localmente.';
    } catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo crear el acceso.'; }
    finally { this.cargando = false; }
  }
  cambiarEstado(id: string): void {
    if (!confirm('¿Cambiar el estado de acceso de esta cuenta?')) { return; }
    try { this.auth.cambiarEstado(id); this.exito = 'Estado actualizado en este navegador.'; this.error = ''; }
    catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo actualizar.'; }
  }
}
