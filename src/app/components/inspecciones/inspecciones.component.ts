import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { DanoDTO, InspeccionResponse, NivelCombustible, PiezaDTO, ReservaResumen, SeveridadDano, TipoInspeccion, VehiculoResponse } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { validarControl, resumenInvalidos, enfocarPrimerInvalido } from '../../core/validadores';

@Component({ selector: 'app-inspecciones', standalone: false, templateUrl: './inspecciones.component.html', styleUrl: './inspecciones.component.css' })
export class InspeccionesComponent implements OnInit, OnDestroy {
  form: FormGroup;
  vehiculos: VehiculoResponse[] = [];
  vehiculoId: number | '' = '';
  inspecciones: InspeccionResponse[] = [];
  filtroTipo: TipoInspeccion | '' = '';
  reservasElegibles: ReservaResumen[] = [];
  abierto = false;
  edicion: InspeccionResponse | null = null;
  danos: DanoDTO[] = [];
  piezas: PiezaDTO[] = [];
  nuevoDano: DanoDTO = { zona: '', descripcion: '', severidad: 'LEVE' };
  nuevaPieza = { nombre: '', cantidad: 1, costo: 0 };
  archivosPendientes: File[] = [];
  detalle: InspeccionResponse | null = null;
  fotosUrl = new Map<string, string>();
  penalizacion = { concepto: '', monto: 0 };
  cargando = false;
  guardando = false;
  error = '';
  exito = '';
  readonly niveles: { valor: NivelCombustible; etiqueta: string }[] = [
    { valor: 'VACIO', etiqueta: 'Vacío' }, { valor: 'UN_CUARTO', etiqueta: '1/4' }, { valor: 'MEDIO', etiqueta: '1/2' },
    { valor: 'TRES_CUARTOS', etiqueta: '3/4' }, { valor: 'LLENO', etiqueta: 'Lleno' }
  ];
  readonly severidades: SeveridadDano[] = ['LEVE', 'MODERADO', 'GRAVE'];
  readonly validar = validarControl;

  constructor(private api: ApiService, fb: FormBuilder, public auth: AuthService) {
    this.form = fb.group({
      tipo: ['ENTREGA', Validators.required], idReserva: [null], combustible: [null, Validators.required],
      kilometraje: [0, [Validators.required, Validators.min(0)]], observacionesGenerales: ['', Validators.maxLength(2000)]
    });
  }

  /** Cada rol registra los tipos que le corresponden; el backend vuelve a validarlo. */
  get tiposPermitidos(): TipoInspeccion[] {
    if (this.auth.esAdmin) { return ['ENTREGA', 'DEVOLUCION', 'MANTENIMIENTO']; }
    return this.auth.esTecnico ? ['MANTENIMIENTO'] : ['ENTREGA', 'DEVOLUCION'];
  }
  get vehiculoElegido(): VehiculoResponse | undefined { return this.vehiculos.find(v => v.idVehiculo === this.vehiculoId); }
  get filtradas(): InspeccionResponse[] { return this.inspecciones.filter(i => !this.filtroTipo || i.tipo === this.filtroTipo); }
  get tipoActual(): TipoInspeccion { return this.form.get('tipo')?.value as TipoInspeccion; }
  get necesitaReserva(): boolean { return this.tipoActual !== 'MANTENIMIENTO'; }
  get valorPiezas(): number { return this.piezas.reduce((total, p) => total + p.cantidad * p.costo, 0); }
  get puedePenalizar(): boolean { return this.auth.tieneRol(['administrador', 'asesor']) && this.detalle?.tipo === 'DEVOLUCION' && this.detalle.idReserva !== null; }

  ngOnInit(): void { void this.cargarVehiculos(); }
  ngOnDestroy(): void { this.fotosUrl.forEach(url => URL.revokeObjectURL(url)); }

  private async cargarVehiculos(): Promise<void> {
    try { this.vehiculos = (await firstValueFrom(this.api.vehiculos({ size: 200 }))).content; }
    catch (e) { this.error = mensajeError(e, 'No se pudo cargar la flota.'); }
  }
  async elegirVehiculo(): Promise<void> {
    this.cerrar(); this.detalle = null; this.exito = ''; this.inspecciones = [];
    if (this.vehiculoId === '') { return; }
    await this.cargarInspecciones();
  }
  private async cargarInspecciones(): Promise<void> {
    if (this.vehiculoId === '') { return; }
    this.cargando = true;
    try { this.inspecciones = await firstValueFrom(this.api.inspeccionesDeVehiculo(this.vehiculoId)); }
    catch (e) { this.error = mensajeError(e, 'No se pudieron cargar las inspecciones.'); }
    finally { this.cargando = false; }
  }

  // ---------- Formulario ----------
  nueva(): void {
    if (this.vehiculoId === '') { this.error = 'Elige primero el vehículo.'; return; }
    this.cerrar(); this.exito = ''; this.detalle = null; this.abierto = true;
    this.form.patchValue({ tipo: this.tiposPermitidos[0], kilometraje: this.vehiculoElegido?.kilometraje ?? 0 });
    void this.cargarReservasElegibles();
  }
  cerrar(): void {
    this.abierto = false; this.edicion = null; this.error = ''; this.danos = []; this.piezas = []; this.archivosPendientes = []; this.reservasElegibles = [];
    this.nuevoDano = { zona: '', descripcion: '', severidad: 'LEVE' }; this.nuevaPieza = { nombre: '', cantidad: 1, costo: 0 };
    this.form.enable(); this.form.reset({ tipo: 'ENTREGA', idReserva: null, combustible: null, kilometraje: 0, observacionesGenerales: '' });
  }
  async cambioTipo(): Promise<void> { this.form.patchValue({ idReserva: null }); await this.cargarReservasElegibles(); }
  /** La entrega se registra sobre una reserva confirmada y la devolución sobre una en curso. */
  private async cargarReservasElegibles(): Promise<void> {
    this.reservasElegibles = [];
    if (!this.necesitaReserva || !this.auth.tieneRol(['administrador', 'asesor']) || this.vehiculoId === '') { return; }
    try {
      const pagina = await firstValueFrom(this.api.reservas({ estado: this.tipoActual === 'ENTREGA' ? 'CONFIRMADA' : 'EN_CURSO', size: 100 }));
      this.reservasElegibles = pagina.content.filter(r => r.idVehiculo === this.vehiculoId);
    } catch (e) { this.error = mensajeError(e, 'No se pudieron cargar las reservas del vehículo.'); }
  }
  editar(i: InspeccionResponse): void {
    this.cerrar(); this.exito = ''; this.detalle = null; this.edicion = i; this.abierto = true;
    this.form.patchValue({ tipo: i.tipo, idReserva: i.idReserva, combustible: i.combustible, kilometraje: i.kilometraje, observacionesGenerales: i.observacionesGenerales ?? '' });
    // El tipo, la reserva y el kilometraje no se modifican después de registrar la inspección.
    this.form.get('tipo')?.disable(); this.form.get('idReserva')?.disable(); this.form.get('kilometraje')?.disable();
    this.danos = i.danos.map(d => ({ ...d })); this.piezas = i.piezasCambiadas.map(p => ({ ...p }));
  }
  agregarDano(): void {
    const d = this.nuevoDano;
    if (!d.zona.trim() || !d.descripcion.trim()) { this.error = 'Indica la zona y la descripción del daño.'; return; }
    this.danos.push({ zona: d.zona.trim(), descripcion: d.descripcion.trim(), severidad: d.severidad });
    this.nuevoDano = { zona: '', descripcion: '', severidad: 'LEVE' }; this.error = '';
  }
  agregarPieza(): void {
    const p = this.nuevaPieza;
    if (!p.nombre.trim() || !(Number(p.cantidad) >= 1) || !(Number(p.costo) >= 0)) { this.error = 'Indica el nombre, una cantidad de al menos 1 y un costo no negativo.'; return; }
    this.piezas.push({ nombre: p.nombre.trim(), cantidad: Number(p.cantidad), costo: Number(p.costo) });
    this.nuevaPieza = { nombre: '', cantidad: 1, costo: 0 }; this.error = '';
  }
  quitarDano(n: number): void { this.danos.splice(n, 1); }
  quitarPieza(n: number): void { this.piezas.splice(n, 1); }
  seleccionarArchivos(evento: Event): void {
    const elemento = evento.target as HTMLInputElement;
    const archivos = Array.from(elemento.files ?? []);
    elemento.value = '';
    if (archivos.some(a => !a.type.startsWith('image/'))) { this.error = 'Solo se aceptan imágenes.'; return; }
    this.archivosPendientes = [...this.archivosPendientes, ...archivos].slice(0, 6); this.error = '';
  }
  quitarPendiente(n: number): void { this.archivosPendientes.splice(n, 1); }

  async guardar(): Promise<void> {
    this.form.markAllAsTouched(); this.error = ''; this.exito = '';
    if (this.guardando || this.vehiculoId === '') { return; }
    if (this.form.invalid) { this.error = resumenInvalidos(this.form); enfocarPrimerInvalido(); return; }
    const v = this.form.getRawValue();
    if (!this.edicion && v.tipo !== 'MANTENIMIENTO' && !v.idReserva) { this.error = 'Selecciona la reserva a la que pertenece la inspección.'; return; }
    this.guardando = true;
    try {
      let guardada: InspeccionResponse;
      if (this.edicion) {
        guardada = await firstValueFrom(this.api.actualizarInspeccion(this.vehiculoId, this.edicion.idInspeccion, { combustible: v.combustible, observacionesGenerales: v.observacionesGenerales?.trim() || undefined, danos: [...this.danos], piezasCambiadas: [...this.piezas] }));
      } else {
        guardada = await firstValueFrom(this.api.crearInspeccion(this.vehiculoId, { tipo: v.tipo, idReserva: v.tipo === 'MANTENIMIENTO' ? undefined : v.idReserva, combustible: v.combustible, kilometraje: Number(v.kilometraje), observacionesGenerales: v.observacionesGenerales?.trim() || undefined, danos: [...this.danos], piezasCambiadas: [...this.piezas] }));
      }
      const fallidas = await this.subirPendientes(guardada.idInspeccion);
      const esNueva = !this.edicion;
      this.cerrar(); await this.cargarInspecciones();
      this.exito = (esNueva ? 'Inspección registrada en MongoDB.' : 'Inspección actualizada.') + (fallidas ? ` ${fallidas} foto(s) no se pudieron subir.` : '');
    } catch (e) { this.error = mensajeError(e, 'No se pudo guardar la inspección.'); }
    finally { this.guardando = false; }
  }
  private async subirPendientes(idInspeccion: string): Promise<number> {
    let fallidas = 0;
    if (this.vehiculoId === '') { return 0; }
    for (const archivo of this.archivosPendientes) {
      try { await firstValueFrom(this.api.subirFoto(this.vehiculoId, idInspeccion, archivo)); } catch { fallidas++; }
    }
    return fallidas;
  }

  // ---------- Detalle, fotos y penalización ----------
  async verDetalle(i: InspeccionResponse): Promise<void> {
    this.cerrar(); this.exito = ''; this.detalle = i; this.penalizacion = { concepto: '', monto: 0 };
    await this.cargarFotos(i);
  }
  private async cargarFotos(i: InspeccionResponse): Promise<void> {
    for (const id of i.fotos) {
      if (this.fotosUrl.has(id)) { continue; }
      try { this.fotosUrl.set(id, URL.createObjectURL(await firstValueFrom(this.api.foto(id)))); } catch { /* la foto no se pudo descargar */ }
    }
  }
  async agregarFotosDetalle(evento: Event): Promise<void> {
    const elemento = evento.target as HTMLInputElement;
    const archivos = Array.from(elemento.files ?? []);
    elemento.value = '';
    const d = this.detalle;
    if (!d || this.vehiculoId === '' || !archivos.length) { return; }
    this.error = '';
    try {
      let actual = d;
      for (const archivo of archivos) { actual = await firstValueFrom(this.api.subirFoto(this.vehiculoId, d.idInspeccion, archivo)); }
      await this.refrescarDetalle(actual);
    } catch (e) { this.error = mensajeError(e, 'No se pudo subir la fotografía.'); }
  }
  async quitarFoto(idFoto: string): Promise<void> {
    const d = this.detalle;
    if (!d || this.vehiculoId === '' || !confirm('¿Quitar esta fotografía?')) { return; }
    this.error = '';
    try { await this.refrescarDetalle(await firstValueFrom(this.api.quitarFoto(this.vehiculoId, d.idInspeccion, idFoto))); }
    catch (e) { this.error = mensajeError(e, 'No se pudo quitar la fotografía.'); }
  }
  private async refrescarDetalle(i: InspeccionResponse): Promise<void> {
    this.detalle = i;
    this.inspecciones = this.inspecciones.map(x => x.idInspeccion === i.idInspeccion ? i : x);
    await this.cargarFotos(i);
  }
  async eliminar(i: InspeccionResponse): Promise<void> {
    if (this.vehiculoId === '' || !confirm('¿Eliminar esta inspección y sus fotografías?')) { return; }
    this.error = ''; this.exito = '';
    try { await firstValueFrom(this.api.eliminarInspeccion(this.vehiculoId, i.idInspeccion)); this.detalle = null; await this.cargarInspecciones(); this.exito = 'Inspección eliminada.'; }
    catch (e) { this.error = mensajeError(e, 'No se pudo eliminar la inspección.'); }
  }
  /** Las penalizaciones se cobran a mano a partir de los daños de la devolución. */
  async registrarPenalizacion(): Promise<void> {
    const d = this.detalle;
    if (!d || d.idReserva === null) { return; }
    this.error = ''; this.exito = '';
    if (!this.penalizacion.concepto.trim() || !(Number(this.penalizacion.monto) > 0)) { this.error = 'Indica el concepto y un monto mayor que cero.'; return; }
    try {
      await firstValueFrom(this.api.crearPenalizacion(d.idReserva, { concepto: this.penalizacion.concepto.trim(), monto: Number(this.penalizacion.monto), idInspeccion: d.idInspeccion }));
      this.penalizacion = { concepto: '', monto: 0 }; this.exito = 'Penalización registrada en la reserva.';
    } catch (e) { this.error = mensajeError(e, 'No se pudo registrar la penalización.'); }
  }
  etiquetaNivel(n: NivelCombustible): string { return this.niveles.find(x => x.valor === n)?.etiqueta ?? n; }
}
