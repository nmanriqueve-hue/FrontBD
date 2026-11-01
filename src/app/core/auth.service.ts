import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService, mensajeError } from './api.service';
import { LoginResponse, PerfilResponse, RegistroRequest, TipoCuenta } from './api-models';

export type RolAcceso = 'cliente' | 'administrador' | 'asesor' | 'tecnico';

/** Usuario autenticado, tal como lo describe el backend en /api/auth/me. */
export interface Sesion {
  id: number;
  tipo: TipoCuenta;
  rol: RolAcceso;
  nombre: string;
  correo: string;
  estado: string;
  /** true cuando la clave es temporal: solo se puede cambiar la clave hasta que se actualice. */
  debeCambiarClave: boolean;
  /** Temporales para las pantallas que aún usan datos locales; se eliminan al migrarlas. */
  clienteId?: string;
  empleadoId?: string;
}

const TOKEN_KEY = 'rutacar.token';
const PERFIL_KEY = 'rutacar.perfil';
const EXPIRA_KEY = 'rutacar.expira';
/** Claves de versiones anteriores, cuando el acceso y los datos vivían en el navegador. */
const CLAVES_OBSOLETAS = ['alquiler-bd2-cuentas-locales-v3', 'alquiler-bd2-sesion-local-v3', 'bd2-rutacar-demo-v3'];

/**
 * Autenticación contra el backend con JWT. El token y el perfil se guardan en sessionStorage
 * (se pierden al cerrar la pestaña). Ya no existen cuentas, claves ni códigos en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly cambio = new BehaviorSubject<number>(0);
  readonly cambios = this.cambio.asObservable();
  private perfil: Sesion | null = null;
  private tokenActual: string | null = null;
  private expiraEn = 0;

  constructor(private api: ApiService) {
    CLAVES_OBSOLETAS.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    this.cargar();
  }

  /** Token vigente o null si no hay sesión o ya venció. */
  get token(): string | null {
    if (this.tokenActual && Date.now() >= this.expiraEn) { this.vaciar(); }
    return this.tokenActual;
  }
  get sesion(): Sesion | null { return this.token ? this.perfil : null; }
  get esCliente(): boolean { return this.sesion?.rol === 'cliente'; }
  get esAdmin(): boolean { return this.sesion?.rol === 'administrador'; }
  get esAsesor(): boolean { return this.sesion?.rol === 'asesor'; }
  get esTecnico(): boolean { return this.sesion?.rol === 'tecnico'; }
  tieneRol(roles: RolAcceso[]): boolean { const rol = this.sesion?.rol; return !!rol && roles.includes(rol); }

  async iniciarSesion(correo: string, clave: string): Promise<Sesion> {
    try { return this.abrir(await firstValueFrom(this.api.login({ correo: correo.trim(), clave }))); }
    catch (e) { throw new Error(mensajeError(e, 'No se pudo iniciar la sesión.')); }
  }

  /** El backend crea la cuenta y devuelve la sesión iniciada. */
  async registrarCliente(datos: RegistroRequest): Promise<Sesion> {
    try { return this.abrir(await firstValueFrom(this.api.registro(datos))); }
    catch (e) { throw new Error(mensajeError(e, 'No fue posible registrar la cuenta.')); }
  }

  /** Devuelve un token nuevo sin la marca de clave temporal. */
  async cambiarClave(claveActual: string, claveNueva: string): Promise<Sesion> {
    try { return this.abrir(await firstValueFrom(this.api.cambiarClave({ claveActual, claveNueva }))); }
    catch (e) { throw new Error(mensajeError(e, 'No se pudo actualizar la contraseña.')); }
  }

  /** Genera una clave temporal de un solo uso (administrador, o asesor para clientes). */
  async restablecerClave(tipo: TipoCuenta, id: number): Promise<string> {
    try { return (await firstValueFrom(this.api.restablecerClave({ tipo, id }))).claveTemporal; }
    catch (e) { throw new Error(mensajeError(e, 'No se pudo restablecer la contraseña.')); }
  }

  /** Vuelve a leer el perfil desde el backend. */
  async refrescarPerfil(): Promise<void> {
    if (!this.token) { return; }
    try { this.guardarPerfil(await firstValueFrom(this.api.me())); }
    catch { /* si el token ya no sirve, el interceptor cierra la sesión */ }
  }

  cerrarSesion(): void { this.vaciar(); this.notificar(); }

  // ---------- Internos ----------
  private abrir(r: LoginResponse): Sesion {
    this.tokenActual = r.token;
    this.expiraEn = Date.now() + r.expiraEnSegundos * 1000;
    sessionStorage.setItem(TOKEN_KEY, r.token);
    sessionStorage.setItem(EXPIRA_KEY, String(this.expiraEn));
    return this.guardarPerfil(r.usuario);
  }

  private guardarPerfil(p: PerfilResponse): Sesion {
    const rol = p.rol.toLowerCase() as RolAcceso;
    this.perfil = {
      id: p.id, tipo: p.tipo, rol, nombre: p.nombre, correo: p.correo, estado: p.estado, debeCambiarClave: p.debeCambiarClave,
      clienteId: p.tipo === 'CLIENTE' ? String(p.id) : undefined,
      empleadoId: p.tipo === 'EMPLEADO' ? String(p.id) : undefined
    };
    sessionStorage.setItem(PERFIL_KEY, JSON.stringify(this.perfil));
    this.notificar();
    return this.perfil;
  }

  private cargar(): void {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const perfil = sessionStorage.getItem(PERFIL_KEY);
    const expira = Number(sessionStorage.getItem(EXPIRA_KEY));
    if (!token || !perfil || !expira || Date.now() >= expira) { this.vaciar(); return; }
    try { this.perfil = JSON.parse(perfil) as Sesion; this.tokenActual = token; this.expiraEn = expira; }
    catch { this.vaciar(); }
  }

  private vaciar(): void {
    this.tokenActual = null; this.perfil = null; this.expiraEn = 0;
    [TOKEN_KEY, PERFIL_KEY, EXPIRA_KEY].forEach(k => sessionStorage.removeItem(k));
  }

  private notificar(): void { this.cambio.next(this.cambio.value + 1); }
}
