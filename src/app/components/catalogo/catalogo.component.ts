import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { CategoriaResponse, SedeResponse, VehiculoResponse } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';
import { fechaIso, imagenCategoria } from '../../core/formato';

@Component({ selector: 'app-catalogo', standalone: false, templateUrl: './catalogo.component.html', styleUrl: './catalogo.component.css' })
export class CatalogoComponent implements OnInit {
  busqueda = '';
  categoria: number | '' = '';
  sede: number | '' = '';
  sedeDevolucion: number | '' = '';
  inicio = fechaIso();
  fin = fechaIso(1);
  sedes: SedeResponse[] = [];
  categorias: CategoriaResponse[] = [];
  vehiculos: VehiculoResponse[] = [];
  cargando = false;
  errorCarga = '';
  private consulta = 0;
  readonly imagen = (v: VehiculoResponse): string => imagenCategoria(v.nombreCategoria);

  constructor(private api: ApiService, private router: Router, private route: ActivatedRoute, public auth: AuthService) {}

  ngOnInit(): void {
    void this.cargarCatalogos();
    this.route.queryParamMap.subscribe(p => {
      this.categoria = p.get('categoria') ? Number(p.get('categoria')) : '';
      this.sede = p.get('sede') ? Number(p.get('sede')) : '';
      this.sedeDevolucion = p.get('sedeDevolucion') ? Number(p.get('sedeDevolucion')) : '';
      this.inicio = p.get('inicio') || fechaIso();
      this.fin = p.get('fin') || fechaIso(1);
      void this.buscar();
    });
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      const [sedes, categorias] = await Promise.all([firstValueFrom(this.api.sedes()), firstValueFrom(this.api.categorias())]);
      this.sedes = sedes; this.categorias = categorias;
    } catch (e) { this.errorCarga = mensajeError(e, 'No se pudieron cargar las sedes y categorías.'); }
  }

  get fechaError(): string {
    if (!this.inicio || !this.fin) { return 'Indica la fecha de recogida y la de devolución para consultar disponibilidad.'; }
    if (this.inicio >= this.fin) { return 'La devolución debe ser posterior a la fecha de recogida.'; }
    if (this.inicio < fechaIso()) { return 'La recogida no puede ser anterior a hoy.'; }
    return '';
  }

  /** Consulta al backend los vehículos libres en el rango; descarta respuestas de consultas anteriores. */
  async buscar(): Promise<void> {
    if (this.fechaError) { this.vehiculos = []; return; }
    const turno = ++this.consulta;
    this.cargando = true; this.errorCarga = '';
    try {
      const lista = await firstValueFrom(this.api.vehiculosDisponibles({
        fechaInicio: this.inicio, fechaFin: this.fin,
        idCategoria: this.categoria === '' ? null : this.categoria, idSede: this.sede === '' ? null : this.sede
      }));
      if (turno === this.consulta) { this.vehiculos = lista; }
    } catch (e) {
      if (turno === this.consulta) { this.vehiculos = []; this.errorCarga = mensajeError(e, 'No se pudo consultar la disponibilidad.'); }
    } finally { if (turno === this.consulta) { this.cargando = false; } }
  }

  get filtrados(): VehiculoResponse[] {
    const q = this.busqueda.toLowerCase().trim();
    return this.vehiculos.filter(v => `${v.marca} ${v.placa} ${v.nombreCategoria}`.toLowerCase().includes(q));
  }
  tarifa(v: VehiculoResponse): number { return this.categorias.find(c => c.idCategoria === v.idCategoria)?.tarifaDiaria ?? 0; }
  preparar(v: VehiculoResponse): void {
    this.router.navigate(['/reservas'], { queryParams: { vehiculo: v.idVehiculo, inicio: this.inicio, fin: this.fin, ...(this.sedeDevolucion !== '' ? { sedeDevolucion: this.sedeDevolucion } : {}) } });
  }
  limpiar(): void { this.busqueda = ''; this.categoria = ''; this.sede = ''; this.sedeDevolucion = ''; this.inicio = fechaIso(); this.fin = fechaIso(1); void this.buscar(); }
}
