import { Component } from '@angular/core';
import { DatosService } from '../../core/datos.service';
import { Inspeccion, Reserva } from '../../core/models';

@Component({ selector: 'app-reportes', standalone: false, templateUrl: './reportes.component.html', styleUrl: './reportes.component.css' })
export class ReportesComponent {
  vehiculoId = '';
  seleccion = '';
  constructor(public datos: DatosService) {}

  get reservas(): Reserva[] {
    return this.datos.reservas.filter(r => !this.vehiculoId || r.vehiculoId === this.vehiculoId);
  }
  get inspecciones(): Inspeccion[] {
    const ids = new Set(this.reservas.map(r => r.id));
    return this.datos.inspecciones.filter(i => ids.has(i.reservaId));
  }
  get totalPropuesto(): number { return this.inspecciones.reduce((total, i) => total + i.danos.reduce((suma, d) => suma + d.valorEstimado, 0), 0); }
  get detalle(): Inspeccion | undefined { return this.inspecciones.find(i => i.id === this.seleccion); }
  cambiarVehiculo(): void { this.seleccion = ''; }
  mostrarDetalle(id: string): void { this.seleccion = this.seleccion === id ? '' : id; }
  exportarReservas(): void {
    this.datos.exportarCsv('pre-reservas-locales.csv', ['Vehículo', 'Cliente', 'Fecha inicio', 'Fecha fin', 'Sede recogida', 'Sede devolución', 'Costo base COP', 'Seguros COP', 'Subtotal COP', 'Estado'], this.reservas.map(r => [this.datos.nombreVehiculo(r.vehiculoId), this.datos.nombreCliente(r.clienteId), r.fechaInicio, r.fechaFin, this.datos.nombreSede(r.sedeEntregaId), this.datos.nombreSede(r.sedeRecibeId), r.costoBase, r.costoSeguros, r.costoEstimado, r.estado]));
  }
  exportarInspecciones(): void {
    this.datos.exportarCsv('inspecciones-locales.csv', ['Vehículo', 'Empleado', 'Tipo', 'Fecha', 'Km', 'Combustible', 'Observaciones', 'Daños', 'Valor propuesto COP', 'Estado'], this.inspecciones.map(i => [this.datos.nombreVehiculoPorReserva(i.reservaId), this.datos.nombreEmpleado(i.empleadoId), i.tipo, i.fecha, i.kilometraje, i.combustible, i.observaciones.map(o => o.descripcion).join(' | '), i.danos.map(d => d.descripcion).join(' | '), i.danos.reduce((total,d) => total + d.valorEstimado,0), i.estado]));
  }
}
