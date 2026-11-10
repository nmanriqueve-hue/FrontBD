import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { ReservaResponse, ReservaResumen } from '../../core/api-models';
import { METODOS_PAGO } from '../../core/formato';

@Component({ selector: 'app-pagos', standalone: false, templateUrl: './pagos.component.html', styleUrl: './pagos.component.css' })
export class PagosComponent implements OnInit {
  pendientes: ReservaResumen[] = [];
  seleccionada: ReservaResponse | null = null;
  pago: { monto: number; metodo: string; resultado: 'APROBADO' | 'RECHAZADO' } = { monto: 0, metodo: 'TARJETA', resultado: 'APROBADO' };
  readonly metodos = METODOS_PAGO;
  cargando = false;
  procesando = false;
  error = '';
  exito = '';

  constructor(private api: ApiService) {}
  ngOnInit(): void { void this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando = true;
    try { this.pendientes = (await firstValueFrom(this.api.reservas({ estado: 'PENDIENTE', size: 100 }))).content; }
    catch (e) { this.error = mensajeError(e, 'No se pudieron cargar las reservas pendientes.'); }
    finally { this.cargando = false; }
  }
  async elegir(r: ReservaResumen): Promise<void> {
    this.error = ''; this.exito = '';
    try {
      this.seleccionada = await firstValueFrom(this.api.reserva(r.idReserva));
      this.pago = { monto: this.seleccionada.saldoPendiente, metodo: 'TARJETA', resultado: 'APROBADO' };
    } catch (e) { this.error = mensajeError(e, 'No se pudo cargar la reserva.'); }
  }
  cerrar(): void { this.seleccionada = null; }
  async pagar(): Promise<void> {
    const r = this.seleccionada;
    if (!r || this.procesando) { return; }
    this.error = ''; this.exito = '';
    const monto = Number(this.pago.monto);
    if (!(monto > 0) || monto > r.saldoPendiente) { this.error = 'El monto debe ser mayor que cero y no superar el saldo pendiente.'; return; }
    this.procesando = true;
    try {
      const res = await firstValueFrom(this.api.registrarPago(r.idReserva, { monto, metodoPago: this.pago.metodo, estado: this.pago.resultado }));
      if (this.pago.resultado === 'RECHAZADO') { this.exito = res.estadoReserva === 'CANCELADA' ? 'El banco rechazó el pago: la pre-reserva se canceló y el vehículo quedó libre.' : 'El banco rechazó el pago.'; }
      else { this.exito = res.saldoPendiente === 0 ? 'Pago aprobado: la reserva quedó confirmada.' : 'Pago aprobado. Queda un saldo pendiente.'; }
      this.seleccionada = null;
      await this.cargar();
    } catch (e) { this.error = mensajeError(e, 'No se pudo registrar el pago.'); }
    finally { this.procesando = false; }
  }
}
