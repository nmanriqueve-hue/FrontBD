import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { ClienteResponse, LicenciaResponse } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { CLAVE_POLITICA, fechaIso } from '../../core/formato';
import { validarControl, resumenInvalidos, enfocarPrimerInvalido } from '../../core/validadores';

@Component({ selector: 'app-clientes', standalone: false, templateUrl: './clientes.component.html', styleUrl: './clientes.component.css' })
export class ClientesComponent implements OnInit {
  form: FormGroup;
  clientes: ClienteResponse[] = [];
  buscar = '';
  verFormulario = false;
  edicion: number | null = null;
  licenciaActual: LicenciaResponse | null = null;
  cargando = false;
  guardando = false;
  error = '';
  exito = '';
  readonly validar = validarControl;
  private readonly camposLicencia = ['numeroLicencia', 'categoriaLicencia', 'expedicion', 'vencimiento'];

  constructor(private api: ApiService, fb: FormBuilder, public auth: AuthService) {
    this.form = fb.group({
      documento: ['', [Validators.required, Validators.pattern('^[0-9A-Za-z-]{4,20}$')]],
      primerNombre: ['', [Validators.required, Validators.maxLength(50)]], segundoNombre: ['', Validators.maxLength(50)],
      primerApellido: ['', [Validators.required, Validators.maxLength(50)]], segundoApellido: ['', Validators.maxLength(50)],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]], telefono: ['', [Validators.required, Validators.pattern('^[0-9+() -]{7,20}$')]],
      clave: [''], numeroLicencia: [''], categoriaLicencia: [''], expedicion: [''], vencimiento: ['']
    });
  }

  ngOnInit(): void { void this.cargar(); }
  async cargar(): Promise<void> {
    this.cargando = true;
    try { this.clientes = (await firstValueFrom(this.api.clientes({ size: 200 }))).content; }
    catch (e) { this.error = mensajeError(e, 'No se pudieron cargar los clientes.'); }
    finally { this.cargando = false; }
  }
  get filtrados(): ClienteResponse[] {
    const q = this.buscar.toLowerCase().trim();
    return this.clientes.filter(c => `${c.numeroDocumento} ${c.primerNombre} ${c.segundoNombre ?? ''} ${c.primerApellido} ${c.correo}`.toLowerCase().includes(q));
  }
  get pideLicencia(): boolean { return this.edicion === null || !this.licenciaActual; }

  nuevo(): void { this.cancelar(); this.exito = ''; this.verFormulario = true; this.ajustar(); }
  cancelar(): void {
    this.verFormulario = false; this.edicion = null; this.licenciaActual = null; this.error = '';
    this.form.reset({ clave: '', numeroLicencia: '', categoriaLicencia: '', expedicion: '', vencimiento: '' });
    this.form.get('documento')?.enable();
  }
  async editar(c: ClienteResponse): Promise<void> {
    this.cancelar(); this.exito = ''; this.edicion = c.idCliente; this.verFormulario = true;
    this.form.patchValue({ documento: c.numeroDocumento, primerNombre: c.primerNombre, segundoNombre: c.segundoNombre ?? '', primerApellido: c.primerApellido, segundoApellido: c.segundoApellido ?? '', correo: c.correo, telefono: c.telefono ?? '' });
    try { this.licenciaActual = await firstValueFrom(this.api.licencia(c.idCliente)); } catch { this.licenciaActual = null; }
    this.ajustar();
  }
  /** La clave solo se pide al crear; la licencia solo si el cliente aún no tiene una. */
  private ajustar(): void {
    const creando = this.edicion === null;
    const clave = this.form.get('clave');
    clave?.setValidators(creando ? [Validators.required, Validators.pattern(CLAVE_POLITICA)] : []);
    clave?.updateValueAndValidity();
    for (const campo of this.camposLicencia) {
      const control = this.form.get(campo);
      control?.setValidators(this.pideLicencia ? [Validators.required] : []);
      control?.updateValueAndValidity();
    }
    if (creando) { this.form.get('documento')?.enable(); } else { this.form.get('documento')?.disable(); }
  }

  async guardar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.guardando) { return; }
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    const v = this.form.getRawValue();
    if (this.pideLicencia && (v.expedicion > v.vencimiento || v.expedicion > fechaIso() || v.vencimiento < fechaIso())) { this.error = 'La licencia debe estar expedida y vigente. Verifica las fechas.'; return; }
    const licencia = { numeroLicencia: v.numeroLicencia.trim(), categoriaLicencia: v.categoriaLicencia.trim(), fechaExpedicion: v.expedicion, fechaVencimiento: v.vencimiento };
    this.guardando = true;
    try {
      let id: number;
      if (this.edicion === null) {
        const creado = await firstValueFrom(this.api.crearCliente({ numeroDocumento: v.documento.trim(), primerNombre: v.primerNombre.trim(), segundoNombre: v.segundoNombre?.trim() || undefined, primerApellido: v.primerApellido.trim(), segundoApellido: v.segundoApellido?.trim() || undefined, correo: v.correo.trim().toLowerCase(), telefono: v.telefono.trim(), clave: v.clave }));
        id = creado.idCliente;
      } else {
        id = this.edicion;
        await firstValueFrom(this.api.actualizarCliente(id, { primerNombre: v.primerNombre.trim(), segundoNombre: v.segundoNombre?.trim() || undefined, primerApellido: v.primerApellido.trim(), segundoApellido: v.segundoApellido?.trim() || undefined, correo: v.correo.trim().toLowerCase(), telefono: v.telefono.trim() }));
      }
      if (this.pideLicencia) {
        try { await firstValueFrom(this.api.registrarLicencia(id, licencia)); }
        catch (e) { this.error = 'El cliente quedó guardado, pero la licencia no se pudo registrar: ' + mensajeError(e); await this.cargar(); return; }
      }
      const eraNuevo = this.edicion === null;
      this.cancelar(); await this.cargar();
      this.exito = eraNuevo ? 'Cliente y licencia registrados.' : 'Cliente actualizado.';
    } catch (e) { this.error = mensajeError(e, 'No se pudo guardar el cliente.'); }
    finally { this.guardando = false; }
  }

  async bloquear(c: ClienteResponse): Promise<void> {
    const destino = c.estado === 'BLOQUEADO' ? 'ACTIVO' : 'BLOQUEADO';
    if (!confirm(`¿Cambiar el estado del cliente a ${destino}?`)) { return; }
    this.error = ''; this.exito = '';
    try { await firstValueFrom(this.api.estadoCliente(c.idCliente, destino)); await this.cargar(); this.exito = 'Estado del cliente actualizado.'; }
    catch (e) { this.error = mensajeError(e, 'No se pudo cambiar el estado.'); }
  }
}
