import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { enfocarPrimerInvalido, resumenInvalidos, validarControl } from '../../core/validadores';

/** La persona que olvidó su contraseña pide un enlace, que le llega a su correo registrado. */
@Component({ selector: 'app-recuperacion', standalone: false, templateUrl: './recuperacion.component.html', styleUrl: './recuperacion.component.css' })
export class RecuperacionComponent {
  form: FormGroup;
  error = '';
  cargando = false;
  enviado = false;
  readonly validar = validarControl;
  constructor(private auth: AuthService, fb: FormBuilder) {
    this.form = fb.group({ correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]] });
  }
  async enviar(): Promise<void> {
    if (this.cargando) { return; }
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    this.cargando = true;
    try {
      await this.auth.olvideClave(this.form.getRawValue().correo);
      this.enviado = true;
    } catch (e) { this.error = mensajeError(e, 'No se pudo enviar el enlace. Inténtalo de nuevo.'); }
    finally { this.cargando = false; }
  }
}
