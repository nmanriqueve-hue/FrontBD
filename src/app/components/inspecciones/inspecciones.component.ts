import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatosService } from '../../core/datos.service';
import { Dano, Inspeccion, Observacion } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { validarControl } from '../../core/validadores';

@Component({ selector: 'app-inspecciones', standalone: false, templateUrl: './inspecciones.component.html', styleUrl: './inspecciones.component.css' })
export class InspeccionesComponent {
  form: FormGroup;
  abierto = false;
  edicion = '';
  error = '';
  exito = '';
  observaciones: Observacion[] = [];
  danos: Dano[] = [];
  fotos: string[] = [];
  nuevaObservacion = '';
  nuevoDano = '';
  nuevoValor = 0;
  filtroTipo = '';
  procesandoFoto = false;
  readonly validar = validarControl;

  constructor(public datos: DatosService, fb: FormBuilder, public auth: AuthService) {
    this.form = fb.group({ reservaId: ['', Validators.required], empleadoId: ['', Validators.required], tipo: ['entrega', Validators.required], fecha: ['', Validators.required], kilometraje: [0, [Validators.required, Validators.min(0)]], combustible: ['', Validators.required], comentarioCliente: [''] });
  }
  get empleadosActivos() { return this.datos.empleados.filter(e => e.estado === 'activo' && (this.auth.esAdmin || e.id === this.auth.sesion?.empleadoId)); }
  get reservasActivas() { return this.datos.reservas.filter(r => r.estado === 'borrador'); }
  get filtradas(): Inspeccion[] { return this.datos.inspecciones.filter(i => !this.filtroTipo || i.tipo === this.filtroTipo); }
  get valorDanos(): number { return this.danos.reduce((total, item) => total + item.valorEstimado, 0); }
  nueva(): void { this.cerrar(); this.abierto = true; if (!this.auth.esAdmin) { this.form.patchValue({ empleadoId: this.auth.sesion?.empleadoId || '' }); } }
  cerrar(): void { this.abierto = false; this.edicion = ''; this.error = ''; this.form.reset({ tipo: 'entrega', kilometraje: 0 }); this.observaciones = []; this.danos = []; this.fotos = []; this.nuevaObservacion = ''; this.nuevoDano = ''; this.nuevoValor = 0; }
  editar(item: Inspeccion): void {
    if (!this.auth.esAdmin && item.empleadoId !== this.auth.sesion?.empleadoId) { this.error = 'Solo puedes editar tus propias inspecciones.'; return; }
    this.nueva(); this.edicion = item.id; this.form.patchValue(item);
    this.observaciones = item.observaciones.map(obs => ({ ...obs }));
    this.danos = item.danos.map(d => ({ ...d })); this.fotos = [...item.fotos];
  }
  agregarObservacion(): void {
    const texto = this.nuevaObservacion.trim();
    if (!texto) { this.error = 'Escribe la observación antes de agregarla.'; return; }
    this.observaciones.push({ descripcion: texto }); this.nuevaObservacion = ''; this.error = '';
  }
  agregarDano(): void {
    const texto = this.nuevoDano.trim();
    if (!texto || !Number.isFinite(Number(this.nuevoValor)) || Number(this.nuevoValor) < 0) { this.error = 'Indica el daño y un valor estimado no negativo.'; return; }
    this.danos.push({ descripcion: texto, valorEstimado: Number(this.nuevoValor) }); this.nuevoDano = ''; this.nuevoValor = 0; this.error = '';
  }
  quitarObservacion(posicion: number): void { this.observaciones.splice(posicion, 1); }
  quitarDano(posicion: number): void { this.danos.splice(posicion, 1); }
  quitarFoto(posicion: number): void { this.fotos.splice(posicion, 1); }
  async cargarFotos(evento: Event): Promise<void> {
    const elemento = evento.target as HTMLInputElement;
    const archivos = Array.from(elemento.files ?? []);
    elemento.value = '';
    if (!archivos.length) { return; }
    if (this.fotos.length + archivos.length > 4) { this.error = 'Puedes adjuntar máximo 4 fotos a cada borrador.'; return; }
    if (archivos.some(archivo => !archivo.type.startsWith('image/') || archivo.size > 450000)) { this.error = 'Selecciona imágenes de máximo 450 KB cada una.'; return; }
    this.procesandoFoto = true; this.error = '';
    try {
      for (const archivo of archivos) {
        const contenido = await new Promise<string>((resolve, reject) => {
          const lector = new FileReader();
          lector.onload = () => resolve(String(lector.result));
          lector.onerror = () => reject(new Error('No se pudo leer una fotografía.'));
          lector.readAsDataURL(archivo);
        });
        this.fotos.push(contenido);
      }
    } catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo cargar la fotografía.'; }
    finally { this.procesandoFoto = false; }
  }
  guardar(): void {
    this.form.markAllAsTouched(); this.error = '';
    if (this.form.invalid) { this.error = 'Completa los campos obligatorios de la inspección.'; return; }
    const v = this.form.getRawValue();
    if (!this.auth.esAdmin && v.empleadoId !== this.auth.sesion?.empleadoId) { this.error = 'No puedes registrar inspecciones a nombre de otro empleado.'; return; }
    if (!this.empleadosActivos.some(e => e.id === v.empleadoId)) { this.error = 'Solo un empleado con contrato activo puede preparar esta acta.'; return; }
    const reserva = this.datos.reservas.find(r => r.id === v.reservaId && r.estado === 'borrador');
    if (!reserva) { this.error = 'Selecciona una pre-reserva local vigente.'; return; }
    const registroAnterior = this.datos.inspecciones.find(i => i.id === this.edicion);
    if (registroAnterior && !this.auth.esAdmin && registroAnterior.empleadoId !== this.auth.sesion?.empleadoId) { this.error = 'No puedes modificar esta inspección.'; return; }
    const duplicada = this.datos.inspecciones.some(i => i.id !== this.edicion && i.reservaId === v.reservaId && i.tipo === v.tipo);
    if (duplicada) { this.error = 'Ya existe un borrador de esta clase para la pre-reserva. Edita el existente.'; return; }
    if (!Number.isFinite(new Date(v.fecha).getTime())) { this.error = 'Indica una fecha de inspección válida.'; return; }
    const inspeccion: Inspeccion = { ...v, id: this.edicion || this.datos.nuevoId(), creado: registroAnterior?.creado || this.datos.fechaActual(), observaciones: [...this.observaciones], danos: [...this.danos], fotos: [...this.fotos], estado: 'borrador' };
    try { this.datos.guardar('inspecciones', inspeccion); this.cerrar(); this.exito = 'Borrador de inspección guardado en el navegador. No es un acta oficial ni genera cobros.'; }
    catch (e) { this.error = e instanceof Error ? e.message : 'No fue posible guardar este borrador.'; }
  }
}
