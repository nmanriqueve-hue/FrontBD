import { Component } from '@angular/core';
import { DatosService } from '../../core/datos.service';

@Component({ selector: 'app-pagos', standalone: false, templateUrl: './pagos.component.html', styleUrl: './pagos.component.css' })
export class PagosComponent {
  constructor(public datos: DatosService) {}
  get pendientes() { return this.datos.reservas.filter(r => r.estado === 'borrador'); }
}
