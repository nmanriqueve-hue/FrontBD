import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CLAVE_POLITICA } from '../../core/formato';
import { coincideCon, enfocarPrimerInvalido, resumenInvalidos, validarControl } from '../../core/validadores';

/** La persona que olvidó su contraseña la redefine con su correo y su número de documento. */
@Component({ selector: 'app-recuperacion', standalone: false, templateUrl: './recuperacion.component.html', styleUrl: './recuperacion.component.css' })
export class RecuperacionComponent {
  form: FormGroup;
  error = '';
  cargando = false;
  visible = false;
  readonly validar = validarControl;
  constructor(private auth: AuthService, private router: Router, fb: FormBuilder) {
    this.form = fb.group({
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      documento: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]{4,20}$')]],
      nueva: ['', [Validators.required, Validators.pattern(CLAVE_POLITICA)]],
      confirmar: ['', [Validators.required, coincideCon('nueva', 'Las contraseñas no coinciden.')]]
    });
    this.form.get('nueva')?.valueChanges.subscribe(() => this.form.get('confirmar')?.updateValueAndValidity());
  }
  async restablecer(): Promise<void> {
    if (this.cargando) { return; }
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    const v = this.form.getRawValue();
    this.cargando = true;
    try {
      await this.auth.recuperarClave(v.correo, v.documento, v.nueva);
      await this.router.navigate(['/acceso'], { queryParams: { recuperada: 1 } });
    } catch (e) { this.error = mensajeError(e, 'No se pudo restablecer la contraseña.'); }
    finally { this.cargando = false; }
  }
}
