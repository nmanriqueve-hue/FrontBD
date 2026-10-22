import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DatosService } from './datos.service';
import { Cliente, RolEmpleado } from './models';

export type RolAcceso = 'cliente' | RolEmpleado;
export interface CuentaLocal {
  id: string;
  correo: string;
  nombre: string;
  rol: RolAcceso;
  clienteId?: string;
  empleadoId?: string;
  salt: string;
  claveHash: string;
  recuperacionSalt: string;
  recuperacionHash: string;
  creado: string;
  estado: 'activo' | 'inactivo';
}

const CUENTAS_KEY = 'alquiler-bd2-cuentas-locales-v3';
const SESION_KEY = 'alquiler-bd2-sesion-local-v3';

const CUENTAS_DEMO: CuentaLocal[] = [
  {
    "id": "cuenta-admin-demo",
    "correo": "admin@rutacar.test",
    "nombre": "Administrador",
    "rol": "administrador",
    "salt": "fc7c3eea1c81628506338da4e40ff92ae96e4851b28af4f6",
    "claveHash": "effb49107f9306cb08c4ead7f1f43597f735f342030b724bb31a39d2c8ae3cff",
    "recuperacionSalt": "1f8697fcbe58602d49c2e9c0998234447fa3568c218a851c",
    "recuperacionHash": "856780ad99fbf3132288a950faf80484bba34287cc785a92b1d942f613a342f1",
    "creado": "2026-10-16T12:00:00.000Z",
    "estado": "activo"
  },
  {
    "id": "cuenta-asesor-demo",
    "correo": "asesor@rutacar.test",
    "nombre": "Asesor Prueba",
    "rol": "asesor",
    "salt": "5436098dd06409dc306d35aecbec81b4053677cdf0fd54fc",
    "claveHash": "4ffd4f160790cfc34eeb6f440a939b3fd170dd0b1fda3229f6dbcc17763037cc",
    "recuperacionSalt": "feb36ae03bb7c08bf9e850c41d3411237f46cd8b3ba061b2",
    "recuperacionHash": "bbdfd8d75d4464fadf610e3c75c7781653cada6bf5365f956914b5dbda8ce78b",
    "creado": "2026-10-16T12:00:00.000Z",
    "estado": "activo",
    "empleadoId": "empleado-asesor-demo"
  },
  {
    "id": "cuenta-tecnico-demo",
    "correo": "tecnico@rutacar.test",
    "nombre": "Técnico Prueba",
    "rol": "tecnico",
    "salt": "f483583e3980156e62e8c0cc9ddc474e5a59714188c766c8",
    "claveHash": "1734ebcfabe18097df3fcc9d7a635f494afe1d5f5d1762b849c582ffa2981ec2",
    "recuperacionSalt": "cd0aeeb403d2cdbe4b39e21421c8935937ed7ab12790c1b1",
    "recuperacionHash": "f20196f73671083b3d526aa3b3b1e39b3d194f4157357ec5cdcf48844f164fda",
    "creado": "2026-10-16T12:00:00.000Z",
    "estado": "activo",
    "empleadoId": "empleado-tecnico-demo"
  },
  {
    "id": "cuenta-cliente-demo",
    "correo": "cliente@rutacar.test",
    "nombre": "Cliente Prueba",
    "rol": "cliente",
    "salt": "9187958897fa58cfb53d9940efaa17ebe1196d723bac2364",
    "claveHash": "d4c621eb64c1667dfdeec58703302cf198d3770d7699e32e0b7aa70a5d338b35",
    "recuperacionSalt": "5134de70963954e32596436c533230d71e9aacf51d3b74b7",
    "recuperacionHash": "794bc5dc2e6cc58b4859cf3673a13068700926be985731a08824d493dabc3cb7",
    "creado": "2026-10-16T12:00:00.000Z",
    "estado": "activo",
    "clienteId": "cliente-demo"
  }
];


@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly cambio = new BehaviorSubject<number>(0);
  readonly cambios = this.cambio.asObservable();
  constructor(private datos: DatosService) {}

  get cuentas(): CuentaLocal[] {
    try {
      const guardado = localStorage.getItem(CUENTAS_KEY);
      if (guardado === null) { localStorage.setItem(CUENTAS_KEY, JSON.stringify(CUENTAS_DEMO)); return CUENTAS_DEMO; }
      const data: unknown = JSON.parse(guardado);
      return Array.isArray(data) ? data as CuentaLocal[] : [];
    } catch { return []; }
  }

  get sesion(): CuentaLocal | null {
    const id = sessionStorage.getItem(SESION_KEY);
    if (!id) { return null; }
    const cuenta = this.cuentas.find(item => item.id === id && item.estado === 'activo');
    if (!cuenta) { return null; }
    if (cuenta.rol === 'cliente') {
      const cliente = this.datos.clientes.find(item => item.id === cuenta.clienteId);
      return cliente?.estado === 'activo' ? cuenta : null;
    }
    if (cuenta.empleadoId) {
      const empleado = this.datos.empleados.find(item => item.id === cuenta.empleadoId && item.estado === 'activo');
      return empleado ? { ...cuenta, rol: empleado.rol } : null;
    }
    return cuenta.rol === 'administrador' ? cuenta : null;
  }
  get esAdmin(): boolean { return this.sesion?.rol === 'administrador'; }
  get esCliente(): boolean { return this.sesion?.rol === 'cliente'; }
  get existeAdministrador(): boolean { return this.cuentas.some(c => c.rol === 'administrador'); }
  tieneRol(roles: RolAcceso[]): boolean { const rol = this.sesion?.rol; return !!rol && roles.includes(rol); }

  private guardarCuentas(cuentas: CuentaLocal[]): void {
    try { localStorage.setItem(CUENTAS_KEY, JSON.stringify(cuentas)); this.cambio.next(this.cambio.value + 1); }
    catch { throw new Error('No se pudo almacenar la cuenta en este navegador.'); }
  }

  private bytes(size = 24): Uint8Array { const array = new Uint8Array(size); crypto.getRandomValues(array); return array; }
  private codificar(bytes: Uint8Array): string { return Array.from(bytes).map(v => v.toString(16).padStart(2, '0')).join(''); }
  private decodificar(hex: string): Uint8Array { return Uint8Array.from(hex.match(/.{2}/g)?.map(v => parseInt(v, 16)) ?? []); }
  private async huella(valor: string, salt: string): Promise<string> {
    if (!globalThis.crypto?.subtle) { throw new Error('El navegador necesita un contexto seguro (localhost o HTTPS) para gestionar credenciales locales.'); }
    const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(valor), 'PBKDF2', false, ['deriveBits']);
    const bytes = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: this.decodificar(salt) as BufferSource, iterations: 150000, hash: 'SHA-256' }, clave, 256);
    return this.codificar(new Uint8Array(bytes));
  }
  private validarClave(clave: string): void {
    if (clave.length < 10 || !/[a-z]/.test(clave) || !/[A-Z]/.test(clave) || !/[0-9]/.test(clave)) {
      throw new Error('La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula y número.');
    }
  }
  private async cuentaBase(nombre: string, correo: string, clave: string, rol: RolAcceso, vinculo: { clienteId?: string; empleadoId?: string }): Promise<{ cuenta: CuentaLocal; codigo: string }> {
    this.validarClave(clave);
    const email = correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { throw new Error('Escribe un correo electrónico válido.'); }
    if (this.cuentas.some(c => c.correo === email)) { throw new Error('Este correo ya tiene una cuenta registrada.'); }
    const salt = this.codificar(this.bytes());
    const recuperacionSalt = this.codificar(this.bytes());
    const codigo = `${this.codificar(this.bytes(6)).slice(0, 6).toUpperCase()}-${this.codificar(this.bytes(6)).slice(0, 6).toUpperCase()}`;
    const cuenta: CuentaLocal = {
      id: this.datos.nuevoId(), nombre: nombre.trim(), correo: email, rol, ...vinculo,
      salt, claveHash: await this.huella(clave, salt), recuperacionSalt,
      recuperacionHash: await this.huella(codigo, recuperacionSalt), creado: this.datos.fechaActual(), estado: 'activo'
    };
    return { cuenta, codigo };
  }

  async registrarCliente(cliente: Omit<Cliente, 'id' | 'creado'>, clave: string): Promise<string> {
    if (this.datos.clientes.some(c => c.correo.toLowerCase() === cliente.correo.toLowerCase() || c.documento === cliente.documento)) { throw new Error('El correo o documento ya está registrado como cliente.'); }
    if (this.datos.clientes.some(c => c.licencia.numero.toLowerCase() === cliente.licencia.numero.toLowerCase())) { throw new Error('El número de licencia ya existe.'); }
    const nuevo: Cliente = { ...cliente, id: this.datos.nuevoId(), creado: this.datos.fechaActual() };
    const { cuenta, codigo } = await this.cuentaBase(`${cliente.primerNombre} ${cliente.primerApellido}`, cliente.correo, clave, 'cliente', { clienteId: nuevo.id });
    this.datos.guardar('clientes', nuevo);
    try { this.guardarCuentas([...this.cuentas, cuenta]); }
    catch (error) { this.datos.eliminar('clientes', nuevo.id); throw error; }
    this.abrirSesion(cuenta.id);
    return codigo;
  }

  async crearAccesoEmpleado(empleadoId: string, correo: string, clave: string): Promise<string> {
    if (!this.esAdmin) { throw new Error('Esta operación requiere un administrador.'); }
    const e = this.datos.empleados.find(item => item.id === empleadoId && item.estado === 'activo');
    if (!e) { throw new Error('Selecciona un empleado activo.'); }
    if (e.rol === 'administrador') { throw new Error('La cuenta del administrador es única y no se pueden crear más.'); }
    if (this.cuentas.some(c => c.empleadoId === empleadoId)) { throw new Error('Este empleado ya tiene acceso.'); }
    const { cuenta, codigo } = await this.cuentaBase(`${e.primerNombre} ${e.primerApellido}`, correo, clave, e.rol, { empleadoId });
    this.guardarCuentas([...this.cuentas, cuenta]);
    return codigo;
  }

  async iniciarSesion(correo: string, clave: string): Promise<void> {
    const cuenta = this.cuentas.find(c => c.correo === correo.trim().toLowerCase() && c.estado === 'activo');
    if (!cuenta || await this.huella(clave, cuenta.salt) !== cuenta.claveHash) { throw new Error('Correo o contraseña incorrectos.'); }
    this.abrirSesion(cuenta.id);
    if (!this.sesion) { this.cerrarSesion(); throw new Error('La cuenta o su registro asociado está inactivo.'); }
  }

  private abrirSesion(id: string): void { sessionStorage.setItem(SESION_KEY, id); this.cambio.next(this.cambio.value + 1); }
  cerrarSesion(): void { sessionStorage.removeItem(SESION_KEY); this.cambio.next(this.cambio.value + 1); }

  async recuperar(correo: string, codigo: string, nuevaClave: string): Promise<void> {
    this.validarClave(nuevaClave);
    const cuenta = this.cuentas.find(c => c.correo === correo.trim().toLowerCase());
    if (!cuenta || await this.huella(codigo.trim().toUpperCase(), cuenta.recuperacionSalt) !== cuenta.recuperacionHash) { throw new Error('El correo o el código de recuperación no coinciden.'); }
    const salt = this.codificar(this.bytes());
    const nuevoCodigo = this.codificar(this.bytes(12)).toUpperCase();
    const recuperacionSalt = this.codificar(this.bytes());
    const actualizada: CuentaLocal = { ...cuenta, salt, claveHash: await this.huella(nuevaClave, salt), recuperacionSalt, recuperacionHash: await this.huella(nuevoCodigo, recuperacionSalt) };
    this.guardarCuentas(this.cuentas.map(c => c.id === cuenta.id ? actualizada : c));
    this.ultimoCodigo = nuevoCodigo;
  }
  ultimoCodigo = '';

  async cambiarClave(actual: string, nueva: string): Promise<string> {
    const cuenta = this.sesion;
    if (!cuenta || await this.huella(actual, cuenta.salt) !== cuenta.claveHash) { throw new Error('La contraseña actual es incorrecta.'); }
    this.validarClave(nueva);
    const salt = this.codificar(this.bytes());
    const codigo = this.codificar(this.bytes(12)).toUpperCase();
    const recuperacionSalt = this.codificar(this.bytes());
    const actualizada = { ...cuenta, salt, claveHash: await this.huella(nueva, salt), recuperacionSalt, recuperacionHash: await this.huella(codigo, recuperacionSalt) };
    this.guardarCuentas(this.cuentas.map(c => c.id === cuenta.id ? actualizada : c));
    return codigo;
  }
  cambiarEstado(id: string): void {
    if (!this.esAdmin) { throw new Error('Se requiere permiso de administrador.'); }
    const cuenta = this.cuentas.find(c => c.id === id);
    if (!cuenta) { throw new Error('Cuenta inexistente.'); }
    if (cuenta.rol === 'administrador') { throw new Error('La única cuenta de administrador no puede desactivarse.'); }
    if (cuenta.id === this.sesion?.id) { throw new Error('No puedes desactivar tu propia sesión.'); }
    this.guardarCuentas(this.cuentas.map(c => c.id === id ? { ...c, estado: c.estado === 'activo' ? 'inactivo' : 'activo' } : c));
  }
}
