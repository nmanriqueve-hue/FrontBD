import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CLAVE_POLITICA } from '../../core/formato';
import { coincideCon, enfocarPrimerInvalido, fechaNoFutura, fechaNoPasada, fechasCoherentes, resumenInvalidos, sinSoloEspacios, validarControl } from '../../core/validadores';

const CORREO = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$';

@Component({ selector: 'app-registro', standalone: false, templateUrl: './registro.component.html', styleUrl: './registro.component.css' })
export class RegistroComponent implements OnDestroy {
  form: FormGroup;
  error = '';
  cargando = false;
  private destruido = false;
  readonly validar = validarControl;
  constructor(fb: FormBuilder, public auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {
    this.form = fb.group({
      documento: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]{4,20}$')]],
      primerNombre: ['', [Validators.required, sinSoloEspacios, Validators.maxLength(50)]],
      segundoNombre: ['', Validators.maxLength(50)],
      primerApellido: ['', [Validators.required, sinSoloEspacios, Validators.maxLength(50)]],
      segundoApellido: ['', Validators.maxLength(50)],
      correo: ['', [Validators.required, Validators.email, Validators.pattern(CORREO), Validators.maxLength(100)]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9+() -]{7,20}$')]],
      numeroLicencia: ['', [Validators.required, sinSoloEspacios, Validators.maxLength(50)]],
      categoriaLicencia: ['', [Validators.required, sinSoloEspacios, Validators.maxLength(5)]],
      expedicion: ['', [Validators.required, fechaNoFutura('La fecha de expedici\u00f3n no puede ser posterior a hoy.')]],
      vencimiento: ['', [Validators.required, fechaNoPasada('La licencia debe estar vigente: la fecha de vencimiento no puede ser anterior a hoy.')]],
      clave: ['', [Validators.required, Validators.pattern(CLAVE_POLITICA)]],
      confirmar: ['', [Validators.required, coincideCon('clave', 'Las contrase\u00f1as no coinciden.')]]
    }, { validators: fechasCoherentes('expedicion', 'vencimiento') });
    // Si cambia la contrase\u00f1a, se vuelve a comparar la confirmaci\u00f3n.
    this.form.get('clave')?.valueChanges.subscribe(() => this.form.get('confirmar')?.updateValueAndValidity());
  }

  async registrar(): Promise<void> {
    if (this.cargando) { return; }
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid) {
      const fechas = this.form.hasError('fechas') ? ' La fecha de vencimiento debe ser posterior a la de expedici\u00f3n.' : '';
      this.error = resumenInvalidos(this.form) + fechas;
      enfocarPrimerInvalido();
      return;
    }
    const v = this.form.getRawValue();
    this.cargando = true;
    try {
      await this.auth.registrarCliente({
        cliente: { numeroDocumento: v.documento.trim(), primerNombre: v.primerNombre.trim(), segundoNombre: v.segundoNombre?.trim() || undefined, primerApellido: v.primerApellido.trim(), segundoApellido: v.segundoApellido?.trim() || undefined, correo: v.correo.trim().toLowerCase(), telefono: v.telefono.trim(), clave: v.clave },
        licencia: { numeroLicencia: v.numeroLicencia.trim(), categoriaLicencia: v.categoriaLicencia.trim(), fechaExpedicion: v.expedicion, fechaVencimiento: v.vencimiento }
      });
    } catch (e) {
      this.cargando = false;
      const mensaje = e instanceof Error && e.message ? e.message : 'No fue posible crear la cuenta. Int\u00e9ntalo de nuevo.';
      this.error = mensaje;
      this.marcarCampoRepetido(mensaje);
      this.refrescar();
      return;
    }
    // La cuenta ya existe y la sesi\u00f3n qued\u00f3 iniciada: se avisa y se lleva al men\u00fa principal.
    this.cargando = false;
    this.form.reset();
    window.alert('Registro exitoso. Te llevamos al men\u00fa principal.');
    await this.router.navigateByUrl('/panel');
  }

  ngOnDestroy(): void { this.destruido = true; }

  /** Si el servidor rechaza el correo o el documento (por ejemplo, ya registrado), se se\u00f1ala tambi\u00e9n junto al campo. */
  private marcarCampoRepetido(mensaje: string): void {
    if (/correo/i.test(mensaje)) { this.form.get('correo')?.setErrors({ mensaje }); }
    if (/documento/i.test(mensaje)) { this.form.get('documento')?.setErrors({ mensaje }); }
    enfocarPrimerInvalido();
  }

  private refrescar(): void {
    if (!this.destruido) { this.cdr.detectChanges(); }
  }
}
