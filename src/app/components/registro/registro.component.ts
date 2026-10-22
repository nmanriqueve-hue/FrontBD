import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-registro', standalone: false, templateUrl: './registro.component.html', styleUrl: './registro.component.css' })
export class RegistroComponent {
  form: FormGroup;
  error = '';
  codigo = '';
  cargando = false;
  readonly validar = validarControl;
  constructor(fb: FormBuilder, public auth: AuthService, private router: Router) {
    this.form = fb.group({ documento: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]{4,25}$')]], primerNombre: ['', [Validators.required, Validators.maxLength(70)]], segundoNombre: [''], primerApellido: ['', Validators.required], segundoApellido: [''], correo: ['', [Validators.required, Validators.email]], telefono: ['', [Validators.required, Validators.pattern('^[0-9+() -]{7,20}$')]], numeroLicencia: ['', Validators.required], categoriaLicencia: ['', Validators.required], expedicion: ['', Validators.required], vencimiento: ['', Validators.required], clave: ['', [Validators.required, Validators.minLength(10), Validators.pattern('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}')]], confirmar: ['', Validators.required] });
  }
  async registrar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid || this.cargando) { return; }
    const v = this.form.getRawValue();
    if (v.clave !== v.confirmar) { this.error = 'Las contraseñas no coinciden.'; return; }
    const hoy = new Date().toISOString().slice(0, 10);
    if (v.expedicion > hoy || v.vencimiento < hoy || v.expedicion >= v.vencimiento) { this.error = 'La licencia debe estar expedida y vigente. Verifica ambas fechas.'; return; }
    this.cargando = true;
    try {
      this.codigo = await this.auth.registrarCliente({ documento: v.documento.trim(), primerNombre: v.primerNombre.trim(), segundoNombre: v.segundoNombre?.trim() || '', primerApellido: v.primerApellido.trim(), segundoApellido: v.segundoApellido?.trim() || '', correo: v.correo.trim().toLowerCase(), telefono: v.telefono.trim(), estado: 'activo', licencia: { numero: v.numeroLicencia.trim(), categoria: v.categoriaLicencia, expedicion: v.expedicion, vencimiento: v.vencimiento } }, v.clave);
      this.form.reset();
    } catch (e) { this.error = e instanceof Error ? e.message : 'No fue posible registrar la cuenta.'; }
    finally { this.cargando = false; }
  }
  continuar(): void { this.router.navigateByUrl('/panel'); }
}
