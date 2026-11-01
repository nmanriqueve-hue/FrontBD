import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { ClienteResponse, LicenciaResponse } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { validarControl } from '../../core/validadores';

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
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.pattern('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,72}')]],
      confirmar: ['', Validators.required]
    });
  }
  async ngOnInit(): Promise<void> {
    const sesion = this.auth.sesion;
    if (!sesion || sesion.tipo !== 'CLIENTE') { return; }
    try { this.cliente = await firstValueFrom(this.api.cliente(sesion.id)); } catch { this.cliente = null; }
    try { this.licencia = await firstValueFrom(this.api.licencia(sesion.id)); } catch { this.licencia = null; }
  }
  async cambiar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.form.invalid || this.cargando) { this.error = 'Completa los tres campos; la nueva contraseña debe cumplir el formato indicado.'; return; }
    const v = this.form.getRawValue();
    if (v.nueva !== v.confirmar) { this.error = 'Las contraseñas no coinciden.'; return; }
    const eraTemporal = !!this.auth.sesion?.debeCambiarClave;
    this.cargando = true;
    try {
      await this.auth.cambiarClave(v.actual, v.nueva);
      this.form.reset(); this.exito = 'Contraseña actualizada.';
      if (eraTemporal) { await this.router.navigateByUrl('/panel'); }
    } catch (e) { this.error = mensajeError(e, 'No se pudo actualizar la contraseña.'); }
    finally { this.cargando = false; }
  }
}
