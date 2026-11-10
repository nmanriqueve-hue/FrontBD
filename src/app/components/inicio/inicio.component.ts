import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CategoriaResponse, SedeResponse } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { fechaIso, imagenCategoria } from '../../core/formato';

@Component({ selector: 'app-inicio', standalone: false, templateUrl: './inicio.component.html', styleUrl: './inicio.component.css' })
export class InicioComponent implements OnInit {
  sede: number | '' = '';
  sedeDevolucion: number | '' = '';
  categoria: number | '' = '';
  inicio = '';
  fin = '';
  error = '';
  sedes: SedeResponse[] = [];
  categorias: CategoriaResponse[] = [];
  disponibles = 0;
  reservasActivas = 0;
  readonly imagenCategoria = imagenCategoria;

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      const [sedes, categorias] = await Promise.all([firstValueFrom(this.api.sedes()), firstValueFrom(this.api.categorias())]);
      this.sedes = sedes; this.categorias = categorias;
    } catch { /* la portada sigue visible aunque el catálogo no cargue */ }
    if (this.auth.sesion) { await this.cargarIndicadores(); }
  }

  /** Indicadores del panel privado; cada uno se pide aparte para que un permiso faltante no tumbe los demás. */
  private async cargarIndicadores(): Promise<void> {
    try { this.disponibles = (await firstValueFrom(this.api.vehiculosDisponibles({ fechaInicio: fechaIso(), fechaFin: fechaIso(1) }))).length; } catch { this.disponibles = 0; }
    const sesion = this.auth.sesion;
    if (!sesion || !this.auth.tieneRol(['cliente', 'administrador', 'asesor'])) { return; }
    try {
      const pagina = await firstValueFrom(this.api.reservas({ idCliente: sesion.rol === 'cliente' ? sesion.id : null, size: 200 }));
      this.reservasActivas = pagina.content.filter(r => r.estadoReserva === 'PENDIENTE' || r.estadoReserva === 'CONFIRMADA' || r.estadoReserva === 'EN_CURSO').length;
    } catch { this.reservasActivas = 0; }
  }

  buscar(): void {
    this.error = '';
    if (!!this.inicio !== !!this.fin) { this.error = 'Selecciona las dos fechas para consultar disponibilidad.'; return; }
    if (this.inicio && this.fin && (this.inicio >= this.fin || this.inicio < fechaIso())) { this.error = 'La recogida debe ser hoy o una fecha futura, y la devolución posterior.'; return; }
    this.router.navigate(['/catalogo'], { queryParams: { sede: this.sede === '' ? null : this.sede, sedeDevolucion: this.sedeDevolucion === '' ? null : this.sedeDevolucion, categoria: this.categoria === '' ? null : this.categoria, inicio: this.inicio || null, fin: this.fin || null } });
  }
}
