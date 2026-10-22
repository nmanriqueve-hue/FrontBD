import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DatosService } from '../../core/datos.service';

@Component({ selector: 'app-inicio', standalone: false, templateUrl: './inicio.component.html', styleUrl: './inicio.component.css' })
export class InicioComponent {
  sede = '';
  sedeDevolucion = '';
  categoria = '';
  inicio = '';
  fin = '';
  error = '';
  constructor(public datos: DatosService, public auth: AuthService, private router: Router) {}
  get activos(): number { return this.datos.vehiculos.filter(v => v.estado === 'disponible').length; }
  get borradores(): number { return this.datos.reservas.filter(r => r.estado === 'borrador').length; }
  get misReservas(): number { const id = this.auth.sesion?.clienteId; return this.datos.reservas.filter(r => r.clienteId === id && r.estado !== 'cancelada').length; }
  get vehiculosPublicos() { return this.datos.vehiculos.filter(v => v.estado === 'disponible' && this.datos.categorias.some(c => c.id === v.categoriaId && c.estado === 'activo')).slice(0,3); }
  tarifa(id: string): number { const v = this.datos.vehiculos.find(v => v.id === id); return this.datos.categorias.find(c => c.id === v?.categoriaId)?.tarifaDiaria || 0; }
  imagenCategoria(nombre: string): string {
    const tipo = nombre.toLowerCase();
    if (tipo.includes('suv') || tipo.includes('camioneta')) { return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf'; }
    if (tipo.includes('sed')) { return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70'; }
    return 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8';
  }
  buscar(): void {
    this.error = '';
    if (!!this.inicio !== !!this.fin) { this.error = 'Selecciona las dos fechas para consultar disponibilidad.'; return; }
    if (this.inicio && this.fin && (this.inicio >= this.fin || new Date(this.inicio).getTime() < Date.now())) { this.error = 'La recogida debe ser futura y la devolución posterior.'; return; }
    if (this.sedeDevolucion && !this.datos.sedes.some(s => s.id === this.sedeDevolucion && s.estado === 'activo')) { this.error = 'Selecciona una sede de devolución activa.'; return; }
    this.router.navigate(['/catalogo'], { queryParams: { sede: this.sede || null, sedeDevolucion: this.sedeDevolucion || null, categoria: this.categoria || null, inicio: this.inicio || null, fin: this.fin || null } });
  }
}
