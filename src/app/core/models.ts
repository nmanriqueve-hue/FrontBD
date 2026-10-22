export type EstadoGeneral = 'activo' | 'inactivo';
export type EstadoCliente = EstadoGeneral | 'bloqueado';
export type EstadoVehiculo = 'disponible' | 'mantenimiento' | 'baja' | 'vendido';
export type EstadoReserva = 'borrador' | 'cancelada';
export type RolEmpleado = 'administrador' | 'asesor' | 'tecnico';
export type TipoInspeccion = 'entrega' | 'devolucion';

export interface Registro { id: string; creado: string; }
export interface Categoria extends Registro { nombre: string; tarifaDiaria: number; capacidadPasajeros: number; tipoTransmision: string; estado: EstadoGeneral; }
export interface Sede extends Registro { nombre: string; ciudad: string; direccion: string; capacidadEstacionamiento: number; estado: EstadoGeneral; }
export interface Seguro extends Registro { nombre: string; descripcion: string; costoDiario: number; estado: EstadoGeneral; }
export interface Licencia { numero: string; categoria: string; expedicion: string; vencimiento: string; }
export interface Cliente extends Registro { documento: string; primerNombre: string; segundoNombre: string; primerApellido: string; segundoApellido: string; correo: string; telefono: string; estado: EstadoCliente; licencia: Licencia; }
export interface Vehiculo extends Registro { placa: string; marca: string; modeloAnio: number; kilometraje: number; color: string; categoriaId: string; sedeId: string; estado: EstadoVehiculo; }
export interface Empleado extends Registro { documento: string; primerNombre: string; primerApellido: string; fechaContratacion: string; sedeId: string; rol: RolEmpleado; estado: EstadoGeneral; nivelAcceso?: string; bonoGerencial?: number; mostradorAsignado?: string; especialidad?: string; }
export interface Reserva extends Registro { clienteId: string; vehiculoId: string; fechaInicio: string; fechaFin: string; sedeEntregaId: string; sedeRecibeId: string; seguroIds: string[]; costoBase: number; costoSeguros: number; costoEstimado: number; estado: EstadoReserva; }
export interface Observacion { descripcion: string; }
export interface Dano { descripcion: string; valorEstimado: number; }
export interface Inspeccion extends Registro { reservaId: string; empleadoId: string; tipo: TipoInspeccion; fecha: string; kilometraje: number; combustible: string; observaciones: Observacion[]; danos: Dano[]; fotos: string[]; comentarioCliente: string; estado: 'borrador'; }
export interface Colecciones {
  categorias: Categoria[];
  sedes: Sede[];
  seguros: Seguro[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  empleados: Empleado[];
  reservas: Reserva[];
  inspecciones: Inspeccion[];
}
export type Tabla = keyof Colecciones;
