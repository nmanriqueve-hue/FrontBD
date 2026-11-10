import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { fechaIso, imagenCategoria } from '../core/formato';
import { RolGuard } from '../core/rol.guard';
import { API, configurar, sesionComo } from './ayudas';

const LOGIN = { token: 'tok', tipoToken: 'Bearer', expiraEnSegundos: 7200, usuario: { id: 1, tipo: 'EMPLEADO', rol: 'ADMINISTRADOR', nombre: 'Marta Rios', correo: 'marta.rios@alquiler.com', estado: 'ACTIVO', debeCambiarClave: false } };

describe('AuthService', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

  it('el login guarda el token y el perfil, recorta el correo y convierte el rol', async () => {
    const http = configurar(); const auth = TestBed.inject(AuthService);
    const p = auth.iniciarSesion('  marta.rios@alquiler.com ', 'Clave123*');
    const req = http.expectOne(`${API}/auth/login`);
    expect(req.request.body).toEqual({ correo: 'marta.rios@alquiler.com', clave: 'Clave123*' });
    req.flush(LOGIN);
    const sesion = await p;
    expect(sesion.rol).toBe('administrador');
    expect(auth.esAdmin).toBe(true); expect(auth.esCliente).toBe(false);
    expect(auth.token).toBe('tok');
    expect(sessionStorage.getItem('rutacar.token')).toBe('tok');
    expect(auth.tieneRol(['asesor', 'administrador'])).toBe(true); expect(auth.tieneRol(['tecnico'])).toBe(false);
  });

  it('un login rechazado lanza el mensaje del backend y no deja sesion', async () => {
    const http = configurar(); const auth = TestBed.inject(AuthService);
    const p = auth.iniciarSesion('x@x.com', 'mala');
    http.expectOne(`${API}/auth/login`).flush({ status: 401, mensaje: 'Credenciales inválidas', detalles: null }, { status: 401, statusText: 'Unauthorized' });
    await expect(p).rejects.toThrow('Credenciales inválidas');
    expect(auth.sesion).toBeNull(); expect(sessionStorage.getItem('rutacar.token')).toBeNull();
  });

  it('restaura la sesion al recargar la pagina si el token sigue vigente', () => {
    sesionComo('asesor', 'EMPLEADO', 2); configurar();
    const auth = TestBed.inject(AuthService);
    expect(auth.sesion?.rol).toBe('asesor'); expect(auth.sesion?.empleadoId).toBe('2'); expect(auth.esAsesor).toBe(true);
  });

  it('descarta una sesion vencida y limpia el almacenamiento', () => {
    sesionComo('asesor', 'EMPLEADO', 2); sessionStorage.setItem('rutacar.expira', String(Date.now() - 1000)); configurar();
    const auth = TestBed.inject(AuthService);
    expect(auth.sesion).toBeNull(); expect(auth.token).toBeNull();
    expect(sessionStorage.getItem('rutacar.token')).toBeNull(); expect(sessionStorage.getItem('rutacar.perfil')).toBeNull();
  });

  it('cerrarSesion borra todo y avisa a los suscriptores', () => {
    sesionComo('cliente', 'CLIENTE', 9); configurar();
    const auth = TestBed.inject(AuthService); let avisos = 0; auth.cambios.subscribe(() => avisos++);
    const antes = avisos; auth.cerrarSesion();
    expect(auth.sesion).toBeNull(); expect(avisos).toBe(antes + 1);
    ['rutacar.token', 'rutacar.perfil', 'rutacar.expira'].forEach(k => expect(sessionStorage.getItem(k)).toBeNull());
  });

  it('elimina los datos locales de versiones anteriores del navegador', () => {
    ['alquiler-bd2-cuentas-locales-v3', 'bd2-rutacar-demo-v3', 'rutacar-datos-locales-v4'].forEach(k => localStorage.setItem(k, '{"demo":true}'));
    configurar(); TestBed.inject(AuthService);
    ['alquiler-bd2-cuentas-locales-v3', 'bd2-rutacar-demo-v3', 'rutacar-datos-locales-v4'].forEach(k => expect(localStorage.getItem(k)).toBeNull());
  });

  it('restablecerClave devuelve la clave temporal que genera el backend', async () => {
    sesionComo('administrador', 'EMPLEADO', 1); const http = configurar(); const auth = TestBed.inject(AuthService);
    const p = auth.restablecerClave('CLIENTE', 9);
    const req = http.expectOne(`${API}/auth/restablecer-clave`);
    expect(req.request.body).toEqual({ tipo: 'CLIENTE', id: 9 });
    req.flush({ claveTemporal: 'Tmp-Abc123xyz' });
    expect(await p).toBe('Tmp-Abc123xyz');
  });
});

describe('Interceptor de autenticacion', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

  it('agrega el JWT solo a las peticiones del backend', () => {
    sesionComo('cliente', 'CLIENTE', 9); const http = configurar(); const cliente = TestBed.inject(HttpClient);
    cliente.get(`${API}/vehiculos`).subscribe();
    expect(http.expectOne(`${API}/vehiculos`).request.headers.get('Authorization')).toBe('Bearer tok');
    cliente.get('https://otro-sitio.com/datos').subscribe();
    expect(http.expectOne('https://otro-sitio.com/datos').request.headers.has('Authorization')).toBe(false);
  });

  it('sin sesion no manda Authorization y un 401 no redirige', () => {
    const http = configurar(); const cliente = TestBed.inject(HttpClient); const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    cliente.get(`${API}/sedes`).subscribe({ error: () => undefined });
    const req = http.expectOne(`${API}/sedes`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush('', { status: 401, statusText: 'Unauthorized' });
    expect(navegar).not.toHaveBeenCalled();
  });

  it('un 401 con sesion abierta cierra la sesion y lleva a /acceso', () => {
    sesionComo('cliente', 'CLIENTE', 9); const http = configurar(); const auth = TestBed.inject(AuthService);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(HttpClient).get(`${API}/reservas`).subscribe({ error: () => undefined });
    http.expectOne(`${API}/reservas`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(auth.token).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/acceso'], expect.objectContaining({ queryParams: expect.any(Object) }));
  });

  it('un 401 del propio login no cierra nada y un 403 conserva la sesion', () => {
    sesionComo('cliente', 'CLIENTE', 9); const http = configurar(); const auth = TestBed.inject(AuthService); const cliente = TestBed.inject(HttpClient);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    cliente.post(`${API}/auth/login`, {}).subscribe({ error: () => undefined });
    http.expectOne(`${API}/auth/login`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(auth.token).toBe('tok');
    cliente.get(`${API}/empleados`).subscribe({ error: () => undefined });
    http.expectOne(`${API}/empleados`).flush('', { status: 403, statusText: 'Forbidden' });
    expect(auth.token).toBe('tok');
  });
});

describe('RolGuard', () => {
  beforeEach(() => { sessionStorage.clear(); });
  const ruta = (roles?: string[]) => ({ data: { roles } }) as unknown as ActivatedRouteSnapshot;
  const estado = (url: string) => ({ url }) as RouterStateSnapshot;
  const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as never);

  it('sin sesion lleva a /acceso recordando la ruta pedida', () => {
    configurar(); const r = TestBed.inject(RolGuard).canActivate(ruta(['administrador']), estado('/clientes'));
    expect(url(r)).toBe('/acceso?volver=%2Fclientes');
  });
  it('con clave temporal solo deja entrar al perfil', () => {
    sesionComo('cliente', 'CLIENTE', 9, { debeCambiarClave: true }); configurar(); const guardia = TestBed.inject(RolGuard);
    expect(url(guardia.canActivate(ruta(['cliente']), estado('/reservas')))).toBe('/perfil');
    expect(guardia.canActivate(ruta(['cliente']), estado('/perfil'))).toBe(true);
  });
  it('un rol no autorizado va a /sin-permiso y uno autorizado entra', () => {
    sesionComo('asesor', 'EMPLEADO', 2); configurar(); const guardia = TestBed.inject(RolGuard);
    expect(url(guardia.canActivate(ruta(['administrador']), estado('/empleados')))).toBe('/sin-permiso');
    expect(guardia.canActivate(ruta(['administrador', 'asesor']), estado('/reservas'))).toBe(true);
    expect(guardia.canActivate(ruta(undefined), estado('/perfil'))).toBe(true);
  });
});

describe('utilidades', () => {
  it('mensajeError traduce los errores del backend y de red', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 0 }))).toContain('conexión');
    expect(mensajeError(new HttpErrorResponse({ status: 400, error: { mensaje: 'Datos de entrada inválidos', detalles: { kilometraje: 'no debe ser nulo' } } }))).toBe('Revisa los datos ingresados \u00b7 Kilometraje: no debe ser nulo');
    expect(mensajeError(new HttpErrorResponse({ status: 500, error: null }), 'Falló')).toBe('Falló');
    expect(mensajeError(new Error('texto'))).toBe('texto');
    expect(mensajeError('raro', 'por defecto')).toBe('por defecto');
  });
  it('fechaIso usa la fecha local con formato yyyy-MM-dd', () => {
    const f = new Date(); const esperado = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    expect(fechaIso()).toBe(esperado);
    expect(fechaIso(1) > fechaIso()).toBe(true);
    expect(fechaIso(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('imagenCategoria elige la imagen por tipo de categoria', () => {
    expect(imagenCategoria('SUV')).not.toBe(imagenCategoria('Sedán'));
    expect(imagenCategoria('Compacto')).toContain('http');
  });
});
