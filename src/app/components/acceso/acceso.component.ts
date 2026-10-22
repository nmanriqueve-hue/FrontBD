import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-acceso', standalone: false, templateUrl: './acceso.component.html', styleUrl: './acceso.component.css' })
export class AccesoComponent {
  form: FormGroup;
  error = '';
  cargando = false;
  visible = false;
  readonly validar = validarControl;
  constructor(fb: FormBuilder, public auth: AuthService, private router: Router, private route: ActivatedRoute) {
    this.form = fb.group({ correo: ['', [Validators.required, Validators.email]], clave: ['', Validators.required] });
  }
  async ingresar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid || this.cargando) { return; }
    this.cargando = true;
    try {
      await this.auth.iniciarSesion(this.form.value.correo, this.form.value.clave);
      const volver = this.route.snapshot.queryParamMap.get('volver');
      await this.router.navigateByUrl(volver?.startsWith('/') && !volver.startsWith('//') ? volver : '/panel');
    } catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo iniciar la sesión.'; }
    finally { this.cargando = false; }
  }
}
