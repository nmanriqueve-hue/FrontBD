import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import {
  EmpleadosSedeResponse, FlotaEstadoResponse, GastoTecnicoResponse, HistorialVehiculoResponse, IngresoSedeResponse,
  InspeccionResponse, PiezaFrecuenciaResponse, SeguroRankingResponse, VehiculoResponse
} from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { descargarCsv } from '../../core/formato';

@Component({ selector: 'app-reportes', standalone: false, templateUrl: './reportes.component.html', styleUrl: './reportes.component.css' })
export class ReportesComponent implements OnInit {
  vehiculos: VehiculoResponse[] = [];
  vehiculoId: number | '' = '';
  historial: HistorialVehiculoResponse | null = null;
  flota: FlotaEstadoResponse[] = [];
  ingresos: IngresoSedeResponse[] = [];
  seguros: SeguroRankingResponse[] = [];
  empleadosSede: EmpleadosSedeResponse[] = [];
  piezas: PiezaFrecuenciaResponse[] = [];
  gastoTecnico: GastoTecnicoResponse[] = [];
  desde = '';
  hasta = '';
  seleccion = '';
  cargando = false;
  error = '';

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void { void this.cargar(); }

  /** Cada reporte se pide por separado: si el rol no tiene permiso para uno, los demás siguen funcionando. */
  private async intentar<T>(peticion: Promise<T>, vacio: T): Promise<T> {
    try { return await peticion; } catch (e) { this.error = mensajeError(e, 'No se pudo cargar uno de los reportes.'); return vacio; }
  }
  async cargar(): Promise<void> {
    this.cargando = true; this.error = '';
    this.vehiculos = (await this.intentar(firstValueFrom(this.api.vehiculos({ size: 200 })), { content: [], totalElements: 0, totalPages: 0, number: 0, size: 0 })).content;
    this.flota = await this.intentar(firstValueFrom(this.api.estadoFlota()), []);
    this.piezas = await this.intentar(firstValueFrom(this.api.piezasMasCambiadas(5)), []);
    this.gastoTecnico = await this.intentar(firstValueFrom(this.api.gastoPorTecnico()), []);
    if (this.auth.esAdmin) {
      this.ingresos = await this.intentar(firstValueFrom(this.api.ingresosPorSede()), []);
      this.seguros = await this.intentar(firstValueFrom(this.api.segurosMasContratados(5)), []);
      this.empleadosSede = await this.intentar(firstValueFrom(this.api.empleadosPorSede()), []);
    }
    this.cargando = false;
  }

  async cambiarVehiculo(): Promise<void> {
    this.seleccion = ''; this.historial = null;
    if (this.vehiculoId === '') { return; }
    this.historial = await this.intentar(firstValueFrom(this.api.historialVehiculo(this.vehiculoId)), null);
  }
  async filtrarIngresos(): Promise<void> {
    if (this.desde && this.hasta && this.desde > this.hasta) { this.error = 'La fecha inicial no puede ser posterior a la final.'; return; }
    this.error = '';
    this.ingresos = await this.intentar(firstValueFrom(this.api.ingresosPorSede({ desde: this.desde, hasta: this.hasta })), []);
  }
  get detalle(): InspeccionResponse | undefined { return this.historial?.inspecciones.find(i => i.idInspeccion === this.seleccion); }
  mostrarDetalle(id: string): void { this.seleccion = this.seleccion === id ? '' : id; }

  exportarHistorial(): void {
    const h = this.historial;
    if (!h) { return; }
    descargarCsv(`historial-${h.vehiculo.placa}.csv`, ['Reserva', 'Cliente', 'Inicio', 'Fin', 'Sede recogida', 'Sede devolución', 'Costo COP', 'Estado'],
      h.reservas.map(r => [r.idReserva, r.nombreCliente, r.fechaInicio, r.fechaFin, r.sedeEntrega, r.sedeRecibe, r.costoTotal, r.estadoReserva]));
  }
  exportarIngresos(): void {
    descargarCsv('ingresos-por-sede.csv', ['Sede', 'Ingresos COP', 'Pagos aprobados'], this.ingresos.map(i => [i.nombreSede, i.ingresos, i.pagosAprobados]));
  }
}
