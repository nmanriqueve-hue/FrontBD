import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { DatosService } from '../../core/datos.service';

@Component({ selector: 'app-perfil', standalone: false, templateUrl: './perfil.component.html', styleUrl: './perfil.component.css' })
export class PerfilComponent {
  form: FormGroup;
  codigo = '';
  error = '';
  exito = '';
  cargando = false;
  constructor(public auth: AuthService, public datos: DatosService, fb: FormBuilder) {
    this.form = fb.group({ actual: ['', Validators.required], nueva: ['', [Validators.required, Validators.minLength(10)]], confirmar: ['', Validators.required] });
  }
  get cliente() { return this.datos.clientes.find(c => c.id === this.auth.sesion?.clienteId); }
  async cambiar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.form.invalid || this.cargando) { this.error = 'Completa los tres campos.'; return; }
    const v = this.form.getRawValue();
    if (v.nueva !== v.confirmar) { this.error = 'Las contraseñas no coinciden.'; return; }
    this.cargando = true;
    try { this.codigo = await this.auth.cambiarClave(v.actual, v.nueva); this.exito = 'Contraseña modificada localmente.'; this.form.reset(); }
    catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo actualizar la contraseña.'; }
    finally { this.cargando = false; }
  }
}
