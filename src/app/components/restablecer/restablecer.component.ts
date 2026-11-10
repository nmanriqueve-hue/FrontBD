import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CLAVE_POLITICA } from '../../core/formato';
import { coincideCon, enfocarPrimerInvalido, resumenInvalidos, validarControl } from '../../core/validadores';

/** Pantalla a la que lleva el enlace del correo: define la contraseña nueva con el token de la URL. */
@Component({ selector: 'app-restablecer', standalone: false, templateUrl: './restablecer.component.html' })
export class RestablecerComponent {
  form: FormGroup;
  readonly token: string;
  error = '';
  cargando = false;
  visible = false;
  readonly validar = validarControl;
  constructor(private auth: AuthService, private router: Router, route: ActivatedRoute, fb: FormBuilder) {
    this.token = route.snapshot.queryParamMap.get('token') ?? '';
    this.form = fb.group({
      nueva: ['', [Validators.required, Validators.pattern(CLAVE_POLITICA)]],
      confirmar: ['', [Validators.required, coincideCon('nueva', 'Las contraseñas no coinciden.')]]
    });
    this.form.get('nueva')?.valueChanges.subscribe(() => this.form.get('confirmar')?.updateValueAndValidity());
  }
  async restablecer(): Promise<void> {
    if (this.cargando) { return; }
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    this.cargando = true;
    try {
      await this.auth.restablecerClave(this.token, this.form.getRawValue().nueva);
      await this.router.navigate(['/acceso'], { queryParams: { recuperada: 1 } });
    } catch (e) { this.error = mensajeError(e, 'No se pudo restablecer la contraseña.'); }
    finally { this.cargando = false; }
  }
}
