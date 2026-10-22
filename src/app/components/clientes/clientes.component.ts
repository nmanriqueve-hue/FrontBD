import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Cliente } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-clientes', standalone: false, templateUrl: './clientes.component.html', styleUrl: './clientes.component.css' })
export class ClientesComponent {
  form: FormGroup;
  buscar = '';
  verFormulario = false;
  edicion = '';
  error = '';
  exito = '';
  readonly validar = validarControl;
  constructor(public datos: DatosService, fb: FormBuilder, public auth: AuthService) {
    this.form = fb.group({
      documento: ['', [Validators.required, Validators.pattern('^[0-9A-Za-z-]{4,25}$')]],
      primerNombre: ['', [Validators.required, Validators.maxLength(70)]], segundoNombre: ['', Validators.maxLength(70)],
      primerApellido: ['', [Validators.required, Validators.maxLength(70)]], segundoApellido: ['', Validators.maxLength(70)],
      correo: ['', [Validators.required, Validators.email]], telefono: ['', [Validators.required, Validators.pattern('^[0-9+() -]{7,20}$')]],
      estado: ['activo', Validators.required], numeroLicencia: ['', Validators.required], categoriaLicencia: ['', Validators.required],
      expedicion: ['', Validators.required], vencimiento: ['', Validators.required]
    });
  }
  get filtrados(): Cliente[] {
    const q = this.buscar.toLowerCase().trim();
    return this.datos.clientes.filter(c => `${c.documento} ${c.primerNombre} ${c.segundoNombre} ${c.primerApellido} ${c.correo}`.toLowerCase().includes(q));
  }
  nuevo(): void { this.cancelar(); this.verFormulario = true; }
  cancelar(): void { this.verFormulario = false; this.edicion = ''; this.form.reset({ estado: 'activo' }); this.error = ''; }
  editar(c: Cliente): void {
    this.edicion = c.id; this.verFormulario = true; this.error = ''; this.exito = '';
    this.form.patchValue({ ...c, numeroLicencia: c.licencia.numero, categoriaLicencia: c.licencia.categoria, expedicion: c.licencia.expedicion, vencimiento: c.licencia.vencimiento });
  }
  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error = 'Verifica los campos obligatorios y el formato de los datos.'; return; }
    const v = this.form.getRawValue();
    if (v.expedicion > v.vencimiento || v.expedicion > new Date().toISOString().slice(0, 10)) { this.error = 'Verifica las fechas de expedición y vencimiento de la licencia.'; return; }
    if (this.datos.clientes.some(c => c.id !== this.edicion && c.documento.toLowerCase() === v.documento.trim().toLowerCase())) { this.error = 'El documento ya está registrado.'; return; }
    if (this.datos.clientes.some(c => c.id !== this.edicion && c.correo.toLowerCase() === v.correo.trim().toLowerCase())) { this.error = 'El correo electrónico ya está registrado.'; return; }
    if (this.datos.clientes.some(c => c.id !== this.edicion && c.licencia.numero.toLowerCase() === v.numeroLicencia.trim().toLowerCase())) { this.error = 'Este número de licencia ya pertenece a otro cliente.'; return; }
    const anterior = this.datos.clientes.find(c => c.id === this.edicion);
    if (anterior && anterior.correo !== v.correo.trim().toLowerCase() && this.auth.cuentas.some(c => c.clienteId === anterior.id)) { this.error = 'El correo está vinculado a una cuenta de acceso. Su modificación requiere sincronización con el servicio de autenticación.'; return; }
    const registro: Cliente = {
      id: this.edicion || this.datos.nuevoId(), creado: anterior?.creado ?? this.datos.fechaActual(), documento: v.documento.trim(),
      primerNombre: v.primerNombre.trim(), segundoNombre: v.segundoNombre?.trim() ?? '', primerApellido: v.primerApellido.trim(), segundoApellido: v.segundoApellido?.trim() ?? '',
      correo: v.correo.trim().toLowerCase(), telefono: v.telefono.trim(), estado: v.estado,
      licencia: { numero: v.numeroLicencia.trim(), categoria: v.categoriaLicencia, expedicion: v.expedicion, vencimiento: v.vencimiento }
    };
    try { this.datos.guardar('clientes', registro); this.cancelar(); this.exito = 'Cliente y licencia guardados en este navegador.'; }
    catch (err) { this.error = err instanceof Error ? err.message : 'No se pudo guardar el cliente.'; }
  }
  bloquear(c: Cliente): void {
    const destino = c.estado === 'bloqueado' ? 'activo' : 'bloqueado';
    if (!confirm(`¿Cambiar el estado del cliente a ${destino}?`)) { return; }
    try { this.datos.guardar('clientes', { ...c, estado: destino }); this.exito = 'Estado del cliente actualizado localmente.'; }
    catch (err) { this.error = err instanceof Error ? err.message : 'No se pudo cambiar el estado.'; }
  }
  vigente(cliente: Cliente): boolean { return cliente.licencia.vencimiento >= new Date().toISOString().slice(0,10); }
}
