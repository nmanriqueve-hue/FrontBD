import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-recuperacion', standalone: false, templateUrl: './recuperacion.component.html', styleUrl: './recuperacion.component.css' })
export class RecuperacionComponent {
  form: FormGroup;
  error = '';
  exito = false;
  cargando = false;
  readonly validar = validarControl;
  constructor(fb: FormBuilder, public auth: AuthService) {
    this.form = fb.group({ correo: ['', [Validators.required, Validators.email]], codigo: ['', Validators.required], clave: ['', [Validators.required, Validators.minLength(10)]], confirmar: ['', Validators.required] });
  }
  async guardar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid || this.cargando) { return; }
    const v = this.form.getRawValue();
    if (v.clave !== v.confirmar) { this.error = 'Las contraseñas no coinciden.'; return; }
    this.cargando = true;
    try { await this.auth.recuperar(v.correo, v.codigo, v.clave); this.exito = true; }
    catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo recuperar el acceso.'; }
    finally { this.cargando = false; }
  }
}
