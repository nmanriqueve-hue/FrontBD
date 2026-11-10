import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { ClienteResponse, LicenciaResponse } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { CLAVE_POLITICA } from '../../core/formato';
import { coincideCon, enfocarPrimerInvalido, resumenInvalidos, validarControl } from '../../core/validadores';

@Component({ selector: 'app-perfil', standalone: false, templateUrl: './perfil.component.html', styleUrl: './perfil.component.css' })
export class PerfilComponent implements OnInit {
  form: FormGroup;
  cliente: ClienteResponse | null = null;
  licencia: LicenciaResponse | null = null;
  error = '';
  exito = '';
  cargando = false;
  readonly validar = validarControl;
  constructor(public auth: AuthService, private api: ApiService, private router: Router, fb: FormBuilder) {
    this.form = fb.group({
      actual: ['', [Validators.required, Validators.maxLength(72)]],
      nueva: ['', [Validators.required, Validators.pattern(CLAVE_POLITICA)]],
      confirmar: ['', [Validators.required, coincideCon('nueva', 'Las contrase\u00f1as no coinciden.')]]
    });
    // Si cambia la nueva contrase\u00f1a, se vuelve a comparar la confirmaci\u00f3n.
    this.form.get('nueva')?.valueChanges.subscribe(() => this.form.get('confirmar')?.updateValueAndValidity());
  }
  async ngOnInit(): Promise<void> {
    const sesion = this.auth.sesion;
    if (!sesion || sesion.tipo !== 'CLIENTE') { return; }
    try { this.cliente = await firstValueFrom(this.api.cliente(sesion.id)); } catch { this.cliente = null; }
    try { this.licencia = await firstValueFrom(this.api.licencia(sesion.id)); } catch { this.licencia = null; }
  }
  async cambiar(): Promise<void> {
    if (this.cargando) { return; }
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    const v = this.form.getRawValue();
    if (v.nueva === v.actual) { this.error = 'La nueva contrase\u00f1a debe ser distinta de la actual.'; return; }
    const eraTemporal = !!this.auth.sesion?.debeCambiarClave;
    this.cargando = true;
    try {
      await this.auth.cambiarClave(v.actual, v.nueva);
      this.form.reset(); this.exito = 'Contrase\u00f1a actualizada.';
      if (eraTemporal) { await this.router.navigateByUrl('/panel'); }
    } catch (e) { this.error = mensajeError(e, 'No se pudo actualizar la contrase\u00f1a.'); }
    finally { this.cargando = false; }
  }
}
