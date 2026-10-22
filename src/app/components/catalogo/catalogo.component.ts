import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { DatosService } from '../../core/datos.service';
import { Vehiculo } from '../../core/models';

@Component({ selector: 'app-catalogo', standalone: false, templateUrl: './catalogo.component.html', styleUrl: './catalogo.component.css' })
export class CatalogoComponent implements OnInit {
  busqueda = '';
  categoria = '';
  sede = '';
  sedeDevolucion = '';
  inicio = '';
  fin = '';
  constructor(public datos: DatosService, private router: Router, private route: ActivatedRoute, public auth: AuthService) {}
  ngOnInit(): void {
    this.route.queryParamMap.subscribe(p => {
      this.categoria = p.get('categoria') || '';
      this.sede = p.get('sede') || '';
      this.sedeDevolucion = p.get('sedeDevolucion') || '';
      this.inicio = p.get('inicio') || '';
      this.fin = p.get('fin') || '';
    });
  }
  get fechaError(): string {
    if (!!this.inicio !== !!this.fin) { return 'Indica tanto la recogida como la devolución para consultar posibles cruces.'; }
    if (this.inicio && this.fin && this.inicio >= this.fin) { return 'La devolución debe ser posterior a la fecha de recogida.'; }
    if (this.sedeDevolucion && !this.datos.sedes.some(s => s.id === this.sedeDevolucion && s.estado === 'activo')) { return 'La sede de devolución seleccionada no está activa.'; }
    return '';
  }
  get filtrados(): Vehiculo[] {
    if (this.fechaError) { return []; }
    const q = this.busqueda.toLowerCase().trim();
    return this.datos.vehiculos.filter(v => v.estado === 'disponible' &&
      this.datos.categorias.some(c => c.id === v.categoriaId && c.estado === 'activo') &&
      this.datos.sedes.some(s => s.id === v.sedeId && s.estado === 'activo') &&
      `${v.marca} ${v.placa} ${this.datos.nombreCategoria(v.categoriaId)}`.toLowerCase().includes(q) &&
      (!this.categoria || this.categoria === v.categoriaId) && (!this.sede || this.sede === v.sedeId) &&
      (!this.inicio || !this.datos.reservas.some(r => r.estado === 'borrador' && r.vehiculoId === v.id && this.inicio < r.fechaFin && this.fin > r.fechaInicio)));
  }
  imagen(v: Vehiculo): string {
    const categoria = this.datos.nombreCategoria(v.categoriaId).toLowerCase();
    if (categoria.includes('suv') || categoria.includes('camioneta')) return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=760&q=80';
    if (categoria.includes('sed')) return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=760&q=80';
    return 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=760&q=80';
  }
  tarifa(v: Vehiculo): number { return this.datos.categorias.find(c => c.id === v.categoriaId)?.tarifaDiaria ?? 0; }
  preparar(v: Vehiculo): void { this.router.navigate(['/reservas'], { queryParams: { vehiculo: v.id, ...(this.inicio && this.fin ? { inicio: this.inicio, fin: this.fin } : {}), ...(this.sedeDevolucion ? { sedeDevolucion: this.sedeDevolucion } : {}) } }); }
  limpiar(): void { this.busqueda = ''; this.categoria = ''; this.sede = ''; this.inicio = ''; this.fin = ''; this.sedeDevolucion = ''; }
}
