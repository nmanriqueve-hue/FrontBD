import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Categoria, Cliente, Colecciones, Empleado, Inspeccion, Reserva, Sede, Seguro, Tabla, Vehiculo } from './models';

const CLAVE = 'bd2-rutacar-demo-v3';
const DEMO_DATE = '2026-10-16T12:00:00.000Z';
const VACIO: Colecciones = {
  categorias: [
    { id: 'cat-sedan-demo', creado: DEMO_DATE, nombre: 'Sedán', tarifaDiaria: 145000, capacidadPasajeros: 5, tipoTransmision: 'Automática', estado: 'activo' },
    { id: 'cat-suv-demo', creado: DEMO_DATE, nombre: 'SUV', tarifaDiaria: 225000, capacidadPasajeros: 5, tipoTransmision: 'Automática', estado: 'activo' },
    { id: 'cat-compacto-demo', creado: DEMO_DATE, nombre: 'Compacto', tarifaDiaria: 109000, capacidadPasajeros: 5, tipoTransmision: 'Manual', estado: 'activo' }
  ],
  sedes: [
    { id: 'sede-bogota-demo', creado: DEMO_DATE, nombre: 'Bogotá Norte', ciudad: 'Bogotá', direccion: 'Sede demostrativa, sin dirección comercial', capacidadEstacionamiento: 35, estado: 'activo' },
    { id: 'sede-medellin-demo', creado: DEMO_DATE, nombre: 'Medellín Centro', ciudad: 'Medellín', direccion: 'Sede demostrativa, sin dirección comercial', capacidadEstacionamiento: 25, estado: 'activo' }
  ],
  seguros: [
    { id: 'seguro-robo-demo', creado: DEMO_DATE, nombre: 'Protección contra robo', descripcion: 'Opción de prueba; cobertura sujeta a definición del backend', costoDiario: 22000, estado: 'activo' },
    { id: 'seguro-terceros-demo', creado: DEMO_DATE, nombre: 'Protección a terceros', descripcion: 'Opción de prueba; cobertura sujeta a definición del backend', costoDiario: 18000, estado: 'activo' }
  ],
  clientes: [
    { id: 'cliente-demo', creado: DEMO_DATE, documento: 'DEMO-1001', primerNombre: 'Cliente', segundoNombre: '', primerApellido: 'Prueba', segundoApellido: '', correo: 'cliente@rutacar.test', telefono: '3000000000', estado: 'activo', licencia: { numero: 'LIC-DEMO-1001', categoria: 'B1', expedicion: '2024-01-15', vencimiento: '2032-01-15' } }
  ],
  vehiculos: [
    { id: 'veh-sedan-demo', creado: DEMO_DATE, placa: 'DEMO01', marca: 'Sedán de prueba', modeloAnio: 2025, kilometraje: 14000, color: 'Plata', categoriaId: 'cat-sedan-demo', sedeId: 'sede-bogota-demo', estado: 'disponible' },
    { id: 'veh-suv-demo', creado: DEMO_DATE, placa: 'DEMO02', marca: 'SUV de prueba', modeloAnio: 2025, kilometraje: 9500, color: 'Negro', categoriaId: 'cat-suv-demo', sedeId: 'sede-bogota-demo', estado: 'disponible' },
    { id: 'veh-compacto-demo', creado: DEMO_DATE, placa: 'DEMO03', marca: 'Compacto de prueba', modeloAnio: 2024, kilometraje: 21500, color: 'Blanco', categoriaId: 'cat-compacto-demo', sedeId: 'sede-medellin-demo', estado: 'disponible' }
  ],
  empleados: [
    { id: 'empleado-asesor-demo', creado: DEMO_DATE, documento: 'EMP-DEMO-01', primerNombre: 'Asesor', primerApellido: 'Prueba', fechaContratacion: '2026-01-20', sedeId: 'sede-bogota-demo', rol: 'asesor', estado: 'activo', mostradorAsignado: 'Punto de atención A' },
    { id: 'empleado-tecnico-demo', creado: DEMO_DATE, documento: 'EMP-DEMO-02', primerNombre: 'Técnico', primerApellido: 'Prueba', fechaContratacion: '2026-01-20', sedeId: 'sede-bogota-demo', rol: 'tecnico', estado: 'activo', especialidad: 'Inspección de vehículos' }
  ],
  reservas: [], inspecciones: []
};

@Injectable({ providedIn: 'root' })
export class DatosService {
  private readonly subject = new BehaviorSubject<Colecciones>(this.leer());
  readonly cambios = this.subject.asObservable();

  get datos(): Colecciones { return this.subject.value; }
  get categorias(): Categoria[] { return this.datos.categorias; }
  get sedes(): Sede[] { return this.datos.sedes; }
  get seguros(): Seguro[] { return this.datos.seguros; }
  get clientes(): Cliente[] { return this.datos.clientes; }
  get vehiculos(): Vehiculo[] { return this.datos.vehiculos; }
  get empleados(): Empleado[] { return this.datos.empleados; }
  get reservas(): Reserva[] { return this.datos.reservas; }
  get inspecciones(): Inspeccion[] { return this.datos.inspecciones; }

  private leer(): Colecciones {
    try {
      const texto = localStorage.getItem(CLAVE);
      if (!texto) { return structuredClone(VACIO); }
      const leido: unknown = JSON.parse(texto);
      if (!leido || typeof leido !== 'object' || Array.isArray(leido)) { return structuredClone(VACIO); }
      const valor = leido as Record<string, unknown>;
      return {
        categorias: this.arreglo<Categoria>(valor, 'categorias'), sedes: this.arreglo<Sede>(valor, 'sedes'),
        seguros: this.arreglo<Seguro>(valor, 'seguros'), clientes: this.arreglo<Cliente>(valor, 'clientes'),
        vehiculos: this.arreglo<Vehiculo>(valor, 'vehiculos'), empleados: this.arreglo<Empleado>(valor, 'empleados'),
        reservas: this.arreglo<Reserva>(valor, 'reservas'), inspecciones: this.arreglo<Inspeccion>(valor, 'inspecciones')
      };
    } catch { return structuredClone(VACIO); }
  }

  private arreglo<T>(valor: Record<string, unknown>, llave: string): T[] {
    return Array.isArray(valor[llave]) ? valor[llave] as T[] : [];
  }

  nuevoId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  fechaActual(): string { return new Date().toISOString(); }

  guardar<K extends Tabla>(tabla: K, item: Colecciones[K][number]): void {
    const actuales = this.datos[tabla] as Array<Colecciones[K][number]>;
    const items = [...actuales];
    const posicion = items.findIndex(actual => actual.id === item.id);
    if (posicion >= 0) { items[posicion] = item; } else { items.unshift(item); }
    const siguiente = { ...this.datos, [tabla]: items } as Colecciones;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(siguiente));
      this.subject.next(siguiente);
    } catch { throw new Error('No hay espacio disponible para guardar este borrador en el navegador.'); }
  }

  eliminar<K extends Tabla>(tabla: K, id: string): void {
    const items = (this.datos[tabla] as Array<Colecciones[K][number]>).filter(item => item.id !== id);
    const siguiente = { ...this.datos, [tabla]: items } as Colecciones;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(siguiente));
      this.subject.next(siguiente);
    } catch { throw new Error('No se pudo actualizar el almacenamiento local.'); }
  }

  tieneCruce(vehiculoId: string, clienteId: string, inicio: string, fin: string, exceptuarId = ''): string {
    const conflicto = this.reservas.find(reserva => reserva.id !== exceptuarId && reserva.estado !== 'cancelada' &&
      (reserva.vehiculoId === vehiculoId || reserva.clienteId === clienteId) &&
      inicio < reserva.fechaFin && fin > reserva.fechaInicio);
    if (!conflicto) { return ''; }
    return conflicto.vehiculoId === vehiculoId ? 'El vehículo ya tiene una pre-reserva local que se cruza con estas fechas.' : 'El cliente ya tiene una pre-reserva local que coincide con estas fechas.';
  }

  dias(inicio: string, fin: string): number {
    const diferencia = new Date(fin).getTime() - new Date(inicio).getTime();
    return Number.isFinite(diferencia) && diferencia > 0 ? Math.ceil(diferencia / 86400000) : 0;
  }

  cotizar(vehiculoId: string, inicio: string, fin: string, seguros: string[]): { dias: number; base: number; seguros: number; total: number } {
    const dias = this.dias(inicio, fin);
    const vehiculo = this.vehiculos.find(item => item.id === vehiculoId);
    const categoria = this.categorias.find(item => item.id === vehiculo?.categoriaId);
    const base = dias * (categoria?.tarifaDiaria ?? 0);
    const costoSeguros = dias * this.seguros.filter(item => seguros.includes(item.id)).reduce((total, item) => total + item.costoDiario, 0);
    return { dias, base, seguros: costoSeguros, total: base + costoSeguros };
  }

  nombreCliente(id: string): string {
    const item = this.clientes.find(cliente => cliente.id === id);
    return item ? `${item.primerNombre} ${item.primerApellido}` : 'Cliente sin registro';
  }
  nombreVehiculo(id: string): string {
    const item = this.vehiculos.find(vehiculo => vehiculo.id === id);
    return item ? `${item.marca} · ${item.placa}` : 'Vehículo sin registro';
  }
  nombreVehiculoPorReserva(reservaId: string): string {
    const reserva = this.reservas.find(item => item.id === reservaId);
    return reserva ? this.nombreVehiculo(reserva.vehiculoId) : 'Reserva sin registro';
  }
  nombreEmpleado(id: string): string {
    const item = this.empleados.find(empleado => empleado.id === id);
    return item ? `${item.primerNombre} ${item.primerApellido}` : 'Empleado sin registro';
  }
  nombreSede(id: string): string { return this.sedes.find(item => item.id === id)?.nombre ?? 'Sin sede'; }
  nombreCategoria(id: string): string { return this.categorias.find(item => item.id === id)?.nombre ?? 'Sin categoría'; }

  exportarCsv(nombre: string, columnas: string[], filas: Array<Array<string | number>>): void {
    const escapar = (campo: string | number): string => `"${String(campo).replace(/"/g, '""')}"`;
    const contenido = [columnas, ...filas].map(fila => fila.map(escapar).join(';')).join('\r\n');
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(new Blob(['\uFEFF', contenido], { type: 'text/csv;charset=utf-8;' }));
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
