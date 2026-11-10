import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { EmpleadoResponse, SedeResponse, TipoEmpleado } from '../../core/api-models';
import { CLAVE_POLITICA, fechaIso } from '../../core/formato';
import { validarControl, resumenInvalidos, enfocarPrimerInvalido } from '../../core/validadores';

@Component({ selector: 'app-empleados', standalone: false, templateUrl: './empleados.component.html', styleUrl: './empleados.component.css' })
export class EmpleadosComponent implements OnInit {
  form: FormGroup;
  empleados: EmpleadoResponse[] = [];
  sedes: SedeResponse[] = [];
  abierto = false;
  buscar = '';
  cargando = false;
  guardando = false;
  error = '';
  exito = '';
  readonly hoy = fechaIso();
  readonly validar = validarControl;
  constructor(private api: ApiService, fb: FormBuilder) {
    this.form = fb.group({
      documento: ['', [Validators.required, Validators.pattern('^[0-9A-Za-z-]{4,20}$')]], primerNombre: ['', [Validators.required, Validators.maxLength(50)]], primerApellido: ['', [Validators.required, Validators.maxLength(50)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]], clave: ['', [Validators.required, Validators.pattern(CLAVE_POLITICA)]],
      fechaContratacion: ['', Validators.required], idSede: [null, Validators.required], tipo: ['ASESOR', Validators.required], mostradorAsignado: [null, Validators.min(1)], especialidad: ['', Validators.maxLength(50)]
    });
  }
  ngOnInit(): void { void this.iniciar(); }
  private async iniciar(): Promise<void> {
    try { this.sedes = await firstValueFrom(this.api.sedes()); } catch { this.sedes = []; }
    await this.cargar();
  }
  async cargar(): Promise<void> {
    this.cargando = true;
    try { this.empleados = await firstValueFrom(this.api.empleados()); }
    catch (e) { this.error = mensajeError(e, 'No se pudo cargar el personal.'); }
    finally { this.cargando = false; }
  }
  get filtrados(): EmpleadoResponse[] {
    const q = this.buscar.toLowerCase().trim();
    return this.empleados.filter(e => `${e.primerNombre} ${e.primerApellido} ${e.numeroDocumento} ${e.tipo}`.toLowerCase().includes(q));
  }
  get tipo(): TipoEmpleado { return this.form.get('tipo')?.value as TipoEmpleado; }
  nuevo(): void { this.cerrar(); this.exito = ''; this.abierto = true; }
  cerrar(): void { this.abierto = false; this.error = ''; this.form.reset({ tipo: 'ASESOR', idSede: null, mostradorAsignado: null, especialidad: '' }); }

  async guardar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.guardando) { return; }
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    const v = this.form.getRawValue();
    if (v.fechaContratacion > this.hoy) { this.error = 'La fecha de contratación no puede ser futura.'; return; }
    this.guardando = true;
    try {
      await firstValueFrom(this.api.crearEmpleado({
        numeroDocumento: v.documento.trim(), primerNombre: v.primerNombre.trim(), primerApellido: v.primerApellido.trim(), correo: v.correo.trim().toLowerCase(), clave: v.clave,
        fechaContratacion: v.fechaContratacion, idSede: v.idSede, tipo: v.tipo,
        mostradorAsignado: v.tipo === 'ASESOR' && v.mostradorAsignado ? Number(v.mostradorAsignado) : undefined,
        especialidad: v.tipo === 'TECNICO' && v.especialidad?.trim() ? v.especialidad.trim() : undefined
      }));
      this.cerrar(); await this.cargar(); this.exito = 'Empleado registrado.';
    } catch (e) { this.error = mensajeError(e, 'No fue posible registrar al empleado.'); }
    finally { this.guardando = false; }
  }

  /** El contrato activo permite registrar entregas y devoluciones; al desactivarlo se pierde ese permiso. */
  async cambiarEstado(e: EmpleadoResponse): Promise<void> {
    const destino = e.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    if (!confirm(`¿Cambiar el contrato de ${e.primerNombre} ${e.primerApellido} a ${destino}?`)) { return; }
    this.error = ''; this.exito = '';
    try { await firstValueFrom(this.api.estadoEmpleado(e.idEmpleado, destino)); await this.cargar(); this.exito = 'Estado del empleado actualizado.'; }
    catch (err) { this.error = mensajeError(err, 'No se pudo cambiar el estado.'); }
  }
}
