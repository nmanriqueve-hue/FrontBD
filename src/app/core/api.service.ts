import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api-config';
import {
  ApiError, CambiarClaveRequest, CategoriaRequest, CategoriaResponse, ClaveTemporalResponse,
  ClienteResponse, ClienteUpdateRequest, EstadoCliente, CostoMantenimientoResponse, CotizacionResponse, EmpleadoRequest,
  EmpleadoResponse, EmpleadosSedeResponse, EstadoCatalogo, EstadoReserva, EstadoVehiculo, FlotaEstadoResponse,
  GastoTecnicoResponse, HistorialVehiculoResponse, IngresoSedeResponse, InspeccionRequest, InspeccionResponse,
  InspeccionUpdateRequest, LicenciaRequest, LicenciaResponse, LoginRequest, LoginResponse, PagoRequest, PagoResponse,
  Pagina, PenalizacionRequest, PenalizacionResponse, PerfilResponse, PiezaDTO, PiezaFrecuenciaResponse,
  RegistroRequest, RestablecerClaveRequest, ReservaRequest, ReservaResponse, ReservaResumen, SedeRequest, SedeResponse,
  SeguroRankingResponse, SeguroRequest, SeguroResponse, TipoEmpleado, TipoInspeccion, VehiculoRequest, VehiculoResponse
} from './api-models';

type Filtros = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

/** Convierte un objeto de filtros en HttpParams, omitiendo los valores vacíos. */
function parametros(filtros: Filtros = {}): HttpParams {
  let p = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === null || valor === undefined || valor === '') { continue; }
    p = p.set(clave, Array.isArray(valor) ? valor.join(',') : String(valor));
  }
  return p;
}

/**
 * Mensaje legible para mostrar al usuario a partir de un error HTTP del backend
 * (formato ApiError: mensaje + detalles por campo) o de un Error cualquiera.
 */
export function mensajeError(e: unknown, defecto = 'No se pudo completar la operación.'): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) { return 'No hay conexión con el servidor. Verifica que el backend esté en ejecución.'; }
    const cuerpo = e.error as Partial<ApiError> | null;
    const detalles = cuerpo?.detalles ? Object.entries(cuerpo.detalles).map(([campo, texto]) => `${campo}: ${texto}`).join('. ') : '';
    return [cuerpo?.mensaje, detalles].filter(Boolean).join(' · ') || defecto;
  }
  return e instanceof Error ? e.message : defecto;
}

/** Acceso tipado a todos los endpoints del backend. No guarda estado: cada método devuelve un Observable. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ---------- Autenticación ----------
  login(datos: LoginRequest): Observable<LoginResponse> { return this.http.post<LoginResponse>(`${API_URL}/auth/login`, datos); }
  registro(datos: RegistroRequest): Observable<LoginResponse> { return this.http.post<LoginResponse>(`${API_URL}/auth/registro`, datos); }
  me(): Observable<PerfilResponse> { return this.http.get<PerfilResponse>(`${API_URL}/auth/me`); }
  cambiarClave(datos: CambiarClaveRequest): Observable<LoginResponse> { return this.http.post<LoginResponse>(`${API_URL}/auth/cambiar-clave`, datos); }
  restablecerClave(datos: RestablecerClaveRequest): Observable<ClaveTemporalResponse> { return this.http.post<ClaveTemporalResponse>(`${API_URL}/auth/restablecer-clave`, datos); }

  // ---------- Sedes, categorías y seguros ----------
  sedes(incluirInactivos = false): Observable<SedeResponse[]> { return this.http.get<SedeResponse[]>(`${API_URL}/sedes`, { params: parametros({ incluirInactivos }) }); }
  crearSede(datos: SedeRequest): Observable<SedeResponse> { return this.http.post<SedeResponse>(`${API_URL}/sedes`, datos); }
  actualizarSede(id: number, datos: SedeRequest): Observable<SedeResponse> { return this.http.put<SedeResponse>(`${API_URL}/sedes/${id}`, datos); }
  estadoSede(id: number, estado: EstadoCatalogo): Observable<SedeResponse> { return this.http.patch<SedeResponse>(`${API_URL}/sedes/${id}/estado`, { estado }); }

  categorias(incluirInactivos = false): Observable<CategoriaResponse[]> { return this.http.get<CategoriaResponse[]>(`${API_URL}/categorias`, { params: parametros({ incluirInactivos }) }); }
  crearCategoria(datos: CategoriaRequest): Observable<CategoriaResponse> { return this.http.post<CategoriaResponse>(`${API_URL}/categorias`, datos); }
  actualizarCategoria(id: number, datos: CategoriaRequest): Observable<CategoriaResponse> { return this.http.put<CategoriaResponse>(`${API_URL}/categorias/${id}`, datos); }
  estadoCategoria(id: number, estado: EstadoCatalogo): Observable<CategoriaResponse> { return this.http.patch<CategoriaResponse>(`${API_URL}/categorias/${id}/estado`, { estado }); }

  seguros(incluirInactivos = false): Observable<SeguroResponse[]> { return this.http.get<SeguroResponse[]>(`${API_URL}/seguros`, { params: parametros({ incluirInactivos }) }); }
  crearSeguro(datos: SeguroRequest): Observable<SeguroResponse> { return this.http.post<SeguroResponse>(`${API_URL}/seguros`, datos); }
  actualizarSeguro(id: number, datos: SeguroRequest): Observable<SeguroResponse> { return this.http.put<SeguroResponse>(`${API_URL}/seguros/${id}`, datos); }
  estadoSeguro(id: number, estado: EstadoCatalogo): Observable<SeguroResponse> { return this.http.patch<SeguroResponse>(`${API_URL}/seguros/${id}/estado`, { estado }); }

  // ---------- Vehículos ----------
  vehiculosDisponibles(f: { fechaInicio: string; fechaFin: string; idCategoria?: number | null; idSede?: number | null }): Observable<VehiculoResponse[]> {
    return this.http.get<VehiculoResponse[]>(`${API_URL}/vehiculos/disponibles`, { params: parametros(f) });
  }
  vehiculos(f: { idSede?: number | null; estado?: EstadoVehiculo | null; page?: number; size?: number } = {}): Observable<Pagina<VehiculoResponse>> {
    return this.http.get<Pagina<VehiculoResponse>>(`${API_URL}/vehiculos`, { params: parametros(f) });
  }
  vehiculo(id: number): Observable<VehiculoResponse> { return this.http.get<VehiculoResponse>(`${API_URL}/vehiculos/${id}`); }
  crearVehiculo(datos: VehiculoRequest): Observable<VehiculoResponse> { return this.http.post<VehiculoResponse>(`${API_URL}/vehiculos`, datos); }
  estadoVehiculo(id: number, estado: EstadoVehiculo): Observable<VehiculoResponse> { return this.http.patch<VehiculoResponse>(`${API_URL}/vehiculos/${id}/estado`, { estado }); }

  // ---------- Clientes y licencias ----------
  clientes(f: { page?: number; size?: number } = {}): Observable<Pagina<ClienteResponse>> { return this.http.get<Pagina<ClienteResponse>>(`${API_URL}/clientes`, { params: parametros(f) }); }
  cliente(id: number): Observable<ClienteResponse> { return this.http.get<ClienteResponse>(`${API_URL}/clientes/${id}`); }
  clientePorDocumento(documento: string): Observable<ClienteResponse> { return this.http.get<ClienteResponse>(`${API_URL}/clientes/documento/${encodeURIComponent(documento)}`); }
  actualizarCliente(id: number, datos: ClienteUpdateRequest): Observable<ClienteResponse> { return this.http.put<ClienteResponse>(`${API_URL}/clientes/${id}`, datos); }
  estadoCliente(id: number, estado: EstadoCliente): Observable<ClienteResponse> { return this.http.patch<ClienteResponse>(`${API_URL}/clientes/${id}/estado`, { estado }); }
  licencia(idCliente: number): Observable<LicenciaResponse> { return this.http.get<LicenciaResponse>(`${API_URL}/clientes/${idCliente}/licencia`); }
  registrarLicencia(idCliente: number, datos: LicenciaRequest): Observable<LicenciaResponse> { return this.http.post<LicenciaResponse>(`${API_URL}/clientes/${idCliente}/licencia`, datos); }

  // ---------- Empleados ----------
  empleados(f: { tipo?: TipoEmpleado | null; idSede?: number | null } = {}): Observable<EmpleadoResponse[]> { return this.http.get<EmpleadoResponse[]>(`${API_URL}/empleados`, { params: parametros(f) }); }
  empleado(id: number): Observable<EmpleadoResponse> { return this.http.get<EmpleadoResponse>(`${API_URL}/empleados/${id}`); }
  crearEmpleado(datos: EmpleadoRequest): Observable<EmpleadoResponse> { return this.http.post<EmpleadoResponse>(`${API_URL}/empleados`, datos); }
  estadoEmpleado(id: number, estado: EstadoCatalogo): Observable<EmpleadoResponse> { return this.http.patch<EmpleadoResponse>(`${API_URL}/empleados/${id}/estado`, { estado }); }

  // ---------- Reservas y pagos ----------
  cotizar(f: { idVehiculo: number; fechaInicio: string; fechaFin: string; idsSeguros?: number[] }): Observable<CotizacionResponse> {
    return this.http.get<CotizacionResponse>(`${API_URL}/reservas/cotizacion`, { params: parametros(f) });
  }
  reservas(f: { idCliente?: number | null; estado?: EstadoReserva | null; page?: number; size?: number } = {}): Observable<Pagina<ReservaResumen>> {
    return this.http.get<Pagina<ReservaResumen>>(`${API_URL}/reservas`, { params: parametros(f) });
  }
  reserva(id: number): Observable<ReservaResponse> { return this.http.get<ReservaResponse>(`${API_URL}/reservas/${id}`); }
  crearReserva(datos: ReservaRequest): Observable<ReservaResponse> { return this.http.post<ReservaResponse>(`${API_URL}/reservas`, datos); }
  pagosDeReserva(id: number): Observable<PagoResponse[]> { return this.http.get<PagoResponse[]>(`${API_URL}/reservas/${id}/pagos`); }
  registrarPago(id: number, datos: PagoRequest): Observable<ReservaResponse> { return this.http.post<ReservaResponse>(`${API_URL}/reservas/${id}/pagos`, datos); }
  iniciarReserva(id: number, idAsesor: number): Observable<ReservaResponse> { return this.http.post<ReservaResponse>(`${API_URL}/reservas/${id}/iniciar`, { idAsesor }); }
  finalizarReserva(id: number): Observable<ReservaResponse> { return this.http.post<ReservaResponse>(`${API_URL}/reservas/${id}/finalizar`, null); }
  cancelarReserva(id: number): Observable<ReservaResponse> { return this.http.post<ReservaResponse>(`${API_URL}/reservas/${id}/cancelar`, null); }

  // ---------- Penalizaciones ----------
  penalizacionesDeReserva(idReserva: number): Observable<PenalizacionResponse[]> { return this.http.get<PenalizacionResponse[]>(`${API_URL}/reservas/${idReserva}/penalizaciones`); }
  penalizacionesDeCliente(idCliente: number): Observable<PenalizacionResponse[]> { return this.http.get<PenalizacionResponse[]>(`${API_URL}/clientes/${idCliente}/penalizaciones`); }
  crearPenalizacion(idReserva: number, datos: PenalizacionRequest): Observable<PenalizacionResponse> { return this.http.post<PenalizacionResponse>(`${API_URL}/reservas/${idReserva}/penalizaciones`, datos); }
  estadoPenalizacion(id: number, estado: 'PAGADA' | 'ANULADA'): Observable<PenalizacionResponse> { return this.http.patch<PenalizacionResponse>(`${API_URL}/penalizaciones/${id}/estado`, { estado }); }

  // ---------- Inspecciones (MongoDB) ----------
  inspeccionesDeVehiculo(idVehiculo: number): Observable<InspeccionResponse[]> { return this.http.get<InspeccionResponse[]>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones`); }
  costoMantenimiento(idVehiculo: number): Observable<CostoMantenimientoResponse> { return this.http.get<CostoMantenimientoResponse>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones/costo-total`); }
  inspeccion(idVehiculo: number, idInspeccion: string): Observable<InspeccionResponse> { return this.http.get<InspeccionResponse>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones/${idInspeccion}`); }
  crearInspeccion(idVehiculo: number, datos: InspeccionRequest): Observable<InspeccionResponse> { return this.http.post<InspeccionResponse>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones`, datos); }
  actualizarInspeccion(idVehiculo: number, idInspeccion: string, datos: InspeccionUpdateRequest): Observable<InspeccionResponse> {
    return this.http.put<InspeccionResponse>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones/${idInspeccion}`, datos);
  }
  agregarPieza(idVehiculo: number, idInspeccion: string, pieza: PiezaDTO): Observable<InspeccionResponse> {
    return this.http.post<InspeccionResponse>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones/${idInspeccion}/piezas`, pieza);
  }
  eliminarInspeccion(idVehiculo: number, idInspeccion: string): Observable<void> { return this.http.delete<void>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones/${idInspeccion}`); }
  subirFoto(idVehiculo: number, idInspeccion: string, archivo: File): Observable<InspeccionResponse> {
    const formulario = new FormData();
    formulario.append('archivo', archivo);
    return this.http.post<InspeccionResponse>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones/${idInspeccion}/fotos`, formulario);
  }
  quitarFoto(idVehiculo: number, idInspeccion: string, idFoto: string): Observable<InspeccionResponse> {
    return this.http.delete<InspeccionResponse>(`${API_URL}/vehiculos/${idVehiculo}/inspecciones/${idInspeccion}/fotos/${idFoto}`);
  }
  /** La foto exige el JWT, por eso se descarga como Blob y no con un {@code <img src>} directo. */
  foto(idFoto: string): Observable<Blob> { return this.http.get(`${API_URL}/inspecciones/fotos/${idFoto}`, { responseType: 'blob' }); }
  buscarInspecciones(f: { pieza?: string; idEmpleado?: number | null; tipo?: TipoInspeccion | null; desde?: string; hasta?: string } = {}): Observable<InspeccionResponse[]> {
    return this.http.get<InspeccionResponse[]>(`${API_URL}/inspecciones/buscar`, { params: parametros(f) });
  }
  inspeccionesDeReserva(idReserva: number): Observable<InspeccionResponse[]> { return this.http.get<InspeccionResponse[]>(`${API_URL}/inspecciones/reserva/${idReserva}`); }
  piezasMasCambiadas(limite = 5): Observable<PiezaFrecuenciaResponse[]> { return this.http.get<PiezaFrecuenciaResponse[]>(`${API_URL}/inspecciones/estadisticas/piezas-mas-cambiadas`, { params: parametros({ limite }) }); }
  gastoPorTecnico(): Observable<GastoTecnicoResponse[]> { return this.http.get<GastoTecnicoResponse[]>(`${API_URL}/inspecciones/estadisticas/gasto-por-tecnico`); }

  // ---------- Reportes (RF-10) ----------
  historialVehiculo(idVehiculo: number): Observable<HistorialVehiculoResponse> { return this.http.get<HistorialVehiculoResponse>(`${API_URL}/reportes/vehiculos/${idVehiculo}/historial`); }
  estadoFlota(idSede?: number | null): Observable<FlotaEstadoResponse[]> { return this.http.get<FlotaEstadoResponse[]>(`${API_URL}/reportes/flota/estado`, { params: parametros({ idSede }) }); }
  ingresosPorSede(f: { desde?: string; hasta?: string } = {}): Observable<IngresoSedeResponse[]> { return this.http.get<IngresoSedeResponse[]>(`${API_URL}/reportes/ingresos-por-sede`, { params: parametros(f) }); }
  segurosMasContratados(limite = 10): Observable<SeguroRankingResponse[]> { return this.http.get<SeguroRankingResponse[]>(`${API_URL}/reportes/seguros-mas-contratados`, { params: parametros({ limite }) }); }
  empleadosPorSede(): Observable<EmpleadosSedeResponse[]> { return this.http.get<EmpleadosSedeResponse[]>(`${API_URL}/reportes/empleados-por-sede`); }
}
