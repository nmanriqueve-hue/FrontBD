/**
 * Tipos que reflejan, campo por campo, las respuestas y peticiones del backend
 * (paquete co.edu.unbosque.alquiler.dto). Los estados y roles llegan en mayúscula.
 */

// ---------- Enumeraciones ----------
export type TipoCuenta = 'CLIENTE' | 'EMPLEADO';
export type RolBackend = 'ADMINISTRADOR' | 'ASESOR' | 'TECNICO' | 'CLIENTE';
export type TipoEmpleado = 'ADMINISTRADOR' | 'ASESOR' | 'TECNICO';
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
export type EstadoPago = 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';
export type EstadoVehiculo = 'DISPONIBLE' | 'ALQUILADO' | 'EN_MANTENIMIENTO' | 'BAJA' | 'VENDIDO';
export type EstadoCliente = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
export type EstadoCatalogo = 'ACTIVO' | 'INACTIVO';
export type EstadoCargo = 'PENDIENTE' | 'PAGADA' | 'ANULADA';
export type TipoInspeccion = 'ENTREGA' | 'DEVOLUCION' | 'MANTENIMIENTO';
export type NivelCombustible = 'VACIO' | 'UN_CUARTO' | 'MEDIO' | 'TRES_CUARTOS' | 'LLENO';
export type SeveridadDano = 'LEVE' | 'MODERADO' | 'GRAVE';
export type TransmisionBackend = 'MANUAL' | 'AUTOMATICA';

// ---------- Errores y paginación ----------
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  mensaje: string;
  detalles: Record<string, string> | null;
}

/** Respuesta paginada de Spring Data (solo los campos que usa el front). */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ---------- Autenticación ----------
export interface LoginRequest { correo: string; clave: string; }

export interface PerfilResponse {
  id: number;
  tipo: TipoCuenta;
  rol: RolBackend;
  nombre: string;
  correo: string;
  estado: string;
  debeCambiarClave: boolean;
}

export interface LoginResponse {
  token: string;
  tipoToken: string;
  expiraEnSegundos: number;
  usuario: PerfilResponse;
}

export interface ClienteRequest {
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  correo: string;
  telefono?: string;
  clave: string;
}

export interface LicenciaRequest {
  numeroLicencia: string;
  categoriaLicencia: string;
  fechaExpedicion: string;
  fechaVencimiento: string;
}

export interface RegistroRequest { cliente: ClienteRequest; licencia?: LicenciaRequest; }
export interface CambiarClaveRequest { claveActual: string; claveNueva: string; }
export interface RestablecerClaveRequest { tipo: TipoCuenta; id: number; }
export interface ClaveTemporalResponse { claveTemporal: string; }

// ---------- Clientes y licencias ----------
export interface ClienteResponse {
  idCliente: number;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  telefono: string | null;
  estado: EstadoCliente;
}

export interface ClienteUpdateRequest {
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  correo: string;
  telefono?: string;
}

export interface LicenciaResponse {
  idLicencia: number;
  idCliente: number;
  numeroLicencia: string;
  categoriaLicencia: string;
  fechaExpedicion: string;
  fechaVencimiento: string;
}

// ---------- Catálogos ----------
export interface CategoriaRequest {
  nombreCategoria: string;
  capacidadPasajeros: number;
  tarifaDiaria: number;
  tipoTransmision: TransmisionBackend;
}
export interface CategoriaResponse {
  idCategoria: number;
  nombreCategoria: string;
  capacidadPasajeros: number;
  tarifaDiaria: number;
  tipoTransmision: TransmisionBackend;
  estado: EstadoCatalogo;
}

export interface SedeRequest { nombreSede: string; ciudad: string; direccion: string; capacidadEstacionamiento: number; }
export interface SedeResponse {
  idSede: number;
  nombreSede: string;
  ciudad: string;
  direccion: string;
  capacidadEstacionamiento: number;
  estado: EstadoCatalogo;
}

export interface SeguroRequest { nombreSeguro: string; descripcion?: string; costoDiario: number; }
export interface SeguroResponse {
  idSeguro: number;
  nombreSeguro: string;
  descripcion: string | null;
  costoDiario: number;
  estado: EstadoCatalogo;
}

// ---------- Vehículos ----------
export interface VehiculoRequest {
  placa: string;
  marca: string;
  modeloAnio: number;
  kilometraje: number;
  color?: string;
  idCategoria: number;
  idSede: number;
}
export interface VehiculoResponse {
  idVehiculo: number;
  placa: string;
  marca: string;
  modeloAnio: number;
  kilometraje: number;
  estado: EstadoVehiculo;
  color: string | null;
  idCategoria: number;
  nombreCategoria: string;
  idSede: number;
  nombreSede: string;
}

// ---------- Empleados ----------
export interface EmpleadoRequest {
  numeroDocumento: string;
  primerNombre: string;
  primerApellido: string;
  correo: string;
  clave: string;
  fechaContratacion: string;
  idSede: number;
  tipo: TipoEmpleado;
  mostradorAsignado?: number;
  especialidad?: string;
  nivelAcceso?: string;
  bonoGerencial?: number;
}
export interface EmpleadoResponse {
  idEmpleado: number;
  numeroDocumento: string;
  primerNombre: string;
  primerApellido: string;
  correo: string;
  fechaContratacion: string;
  estado: EstadoCatalogo;
  idSede: number;
  nombreSede: string;
  tipo: TipoEmpleado;
  mostradorAsignado: number | null;
  especialidad: string | null;
  nivelAcceso: string | null;
  bonoGerencial: number | null;
}

// ---------- Reservas y pagos ----------
export interface ReservaRequest {
  idCliente: number;
  idVehiculo: number;
  idAsesor?: number;
  idSedeEntrega: number;
  idSedeRecibe: number;
  fechaInicio: string;
  fechaFin: string;
  idsSeguros?: number[];
}

export interface PagoRequest { monto: number; metodoPago: string; estado: EstadoPago; }
export interface PagoResponse {
  idPago: number;
  fechaPago: string;
  monto: number;
  metodoPago: string;
  estadoPago: EstadoPago;
}
export interface SeguroContratado { idSeguro: number; nombreSeguro: string; costoContratado: number; }

export interface ReservaResumen {
  idReserva: number;
  estadoReserva: EstadoReserva;
  fechaInicio: string;
  fechaFin: string;
  costoTotal: number;
  idCliente: number;
  nombreCliente: string;
  idVehiculo: number;
  placa: string;
}

export interface ReservaResponse {
  idReserva: number;
  estadoReserva: EstadoReserva;
  fechaCreacion: string;
  fechaInicio: string;
  fechaFin: string;
  costoTotal: number;
  saldoPendiente: number;
  idCliente: number;
  nombreCliente: string;
  idVehiculo: number;
  placa: string;
  idAsesor: number | null;
  nombreAsesor: string | null;
  idSedeEntrega: number;
  nombreSedeEntrega: string;
  idSedeRecibe: number;
  nombreSedeRecibe: string;
  seguros: SeguroContratado[];
  pagos: PagoResponse[];
}

export interface CotizacionResponse { idVehiculo: number; dias: number; costoTotal: number; }

export interface PenalizacionRequest { concepto: string; monto: number; idInspeccion?: string; }
export interface PenalizacionResponse {
  idPenalizacion: number;
  idReserva: number;
  fechaCargo: string;
  concepto: string;
  monto: number;
  estadoCargo: EstadoCargo;
  idInspeccion: string | null;
}

// ---------- Inspecciones (MongoDB) ----------
export interface DanoDTO { zona: string; descripcion: string; severidad: SeveridadDano; }
export interface PiezaDTO { nombre: string; cantidad: number; costo: number; }

export interface InspeccionRequest {
  tipo: TipoInspeccion;
  idReserva?: number;
  combustible: NivelCombustible;
  kilometraje: number;
  observacionesGenerales?: string;
  danos?: DanoDTO[];
  piezasCambiadas?: PiezaDTO[];
}
export interface InspeccionUpdateRequest {
  combustible: NivelCombustible;
  observacionesGenerales?: string;
  danos?: DanoDTO[];
  piezasCambiadas?: PiezaDTO[];
}
export interface InspeccionResponse {
  idInspeccion: string;
  tipo: TipoInspeccion;
  idVehiculo: number;
  idReserva: number | null;
  idEmpleado: number | null;
  combustible: NivelCombustible;
  kilometraje: number;
  observacionesGenerales: string | null;
  danos: DanoDTO[];
  piezasCambiadas: PiezaDTO[];
  fotos: string[];
  fechaInspeccion: string;
}
export interface CostoMantenimientoResponse { idVehiculo: number; costoTotal: number; }
export interface PiezaFrecuenciaResponse { nombre: string; totalCambiadas: number; costoTotal: number; }
export interface GastoTecnicoResponse { idTecnico: number; totalPiezas: number; costoTotal: number; }

// ---------- Reportes (RF-10) ----------
export interface ReservaHistorial {
  idReserva: number;
  estadoReserva: EstadoReserva;
  fechaInicio: string;
  fechaFin: string;
  costoTotal: number;
  idCliente: number;
  nombreCliente: string;
  sedeEntrega: string;
  sedeRecibe: string;
}
export interface ResumenHistorial {
  totalReservas: number;
  reservasFinalizadas: number;
  reservasCanceladas: number;
  ingresosPorAlquiler: number;
  totalInspecciones: number;
  totalDanosReportados: number;
  totalPiezasCambiadas: number;
  costoMantenimiento: number;
  totalPenalizaciones: number;
}
export interface HistorialVehiculoResponse {
  vehiculo: VehiculoResponse;
  resumen: ResumenHistorial;
  reservas: ReservaHistorial[];
  inspecciones: InspeccionResponse[];
  penalizaciones: PenalizacionResponse[];
}
export interface IngresoSedeResponse { idSede: number; nombreSede: string; ingresos: number; pagosAprobados: number; }
export interface FlotaEstadoResponse { estado: EstadoVehiculo; cantidad: number; }
export interface SeguroRankingResponse { idSeguro: number; nombreSeguro: string; vecesContratado: number; valorContratado: number; }
export interface EmpleadosSedeResponse { idSede: number; nombreSede: string; rol: TipoEmpleado; cantidad: number; }
