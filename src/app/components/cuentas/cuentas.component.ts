import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from '../../core/api.service';
import { ClienteResponse, EmpleadoResponse, TipoCuenta } from '../../core/api-models';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-cuentas', standalone: false, templateUrl: './cuentas.component.html', styleUrl: './cuentas.component.css' })
export class CuentasComponent implements OnInit {
  empleados: EmpleadoResponse[] = [];
  clientes: ClienteResponse[] = [];
  cargando = false;
  error = '';
  temporal: { nombre: string; clave: string } | null = null;
  constructor(public auth: AuthService, private api: ApiService) {}
  ngOnInit(): void { void this.cargar(); }
  async cargar(): Promise<void> {
    this.cargando = true; this.error = '';
    try {
      const [empleados, clientes] = await Promise.all([firstValueFrom(this.api.empleados()), firstValueFrom(this.api.clientes({ size: 100 }))]);
      this.empleados = empleados; this.clientes = clientes.content;
    } catch (e) { this.error = mensajeError(e, 'No se pudieron cargar las cuentas.'); }
    finally { this.cargando = false; }
  }
  esPropia(tipo: TipoCuenta, id: number): boolean { return this.auth.sesion?.tipo === tipo && this.auth.sesion.id === id; }
  async restablecer(tipo: TipoCuenta, id: number, nombre: string): Promise<void> {
    if (!confirm(`¿Generar una contraseña temporal para ${nombre}? La contraseña actual dejará de funcionar.`)) { return; }
    this.error = ''; this.temporal = null;
    try { this.temporal = { nombre, clave: await this.auth.restablecerClave(tipo, id) }; }
    catch (e) { this.error = mensajeError(e, 'No se pudo restablecer la contraseña.'); }
  }
}
