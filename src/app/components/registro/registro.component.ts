import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-registro', standalone: false, templateUrl: './registro.component.html', styleUrl: './registro.component.css' })
export class RegistroComponent implements OnDestroy {
  form: FormGroup;
  error = '';
  cargando = false;
  private destruido = false;
  readonly validar = validarControl;
  constructor(fb: FormBuilder, public auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {
    this.form = fb.group({ documento: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]{4,25}$')]], primerNombre: ['', [Validators.required, Validators.maxLength(70)]], segundoNombre: [''], primerApellido: ['', Validators.required], segundoApellido: [''], correo: ['', [Validators.required, Validators.email]], telefono: ['', [Validators.required, Validators.pattern('^[0-9+() -]{7,20}$')]], numeroLicencia: ['', Validators.required], categoriaLicencia: ['', Validators.required], expedicion: ['', Validators.required], vencimiento: ['', Validators.required], clave: ['', [Validators.required, Validators.minLength(10), Validators.pattern('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}')]], confirmar: ['', Validators.required] });
  }

  async registrar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = '';
    if (this.cargando) { return; }
    if (this.form.invalid) {
      const campos = Object.keys(this.form.controls).filter(k => this.form.controls[k].invalid);
      this.avisar('Revisa estos campos antes de registrarte: ' + campos.join(', ') + '.');
      return;
    }
    const v = this.form.getRawValue();
    if (v.clave !== v.confirmar) { this.avisar('Las contrase\u00f1as no coinciden.'); return; }
    const hoy = new Date().toISOString().slice(0, 10);
    if (v.expedicion > hoy || v.vencimiento < hoy || v.expedicion >= v.vencimiento) { this.avisar('La licencia debe estar expedida y vigente. Verifica ambas fechas.'); return; }
    this.cargando = true;
    try {
      await this.auth.registrarCliente({
        cliente: { numeroDocumento: v.documento.trim(), primerNombre: v.primerNombre.trim(), segundoNombre: v.segundoNombre?.trim() || undefined, primerApellido: v.primerApellido.trim(), segundoApellido: v.segundoApellido?.trim() || undefined, correo: v.correo.trim().toLowerCase(), telefono: v.telefono.trim(), clave: v.clave },
        licencia: { numeroLicencia: v.numeroLicencia.trim(), categoriaLicencia: v.categoriaLicencia.trim(), fechaExpedicion: v.expedicion, fechaVencimiento: v.vencimiento }
      });
    } catch (e) {
      console.error(e);
      this.cargando = false;
      this.avisar(e instanceof Error ? e.message : 'No fue posible registrar la cuenta.');
      return;
    }
    // La cuenta ya existe y la sesi\u00f3n qued\u00f3 iniciada: se avisa y se lleva al men\u00fa principal.
    this.cargando = false;
    this.form.reset();
    window.alert('Registro exitoso. Te llevamos al men\u00fa principal.');
    await this.router.navigateByUrl('/panel');
  }

  ngOnDestroy(): void { this.destruido = true; }

  /** Muestra el mensaje en pantalla y en un aviso del navegador, para que nunca pase inadvertido. */
  private avisar(mensaje: string): void {
    this.error = mensaje;
    if (!this.destruido) { this.cdr.detectChanges(); }
    window.alert(mensaje);
  }
}