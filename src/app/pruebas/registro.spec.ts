import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RegistroComponent } from '../components/registro/registro.component';
import { API, configurar, responder } from './ayudas';

const VALIDO = { documento: 'A12345', primerNombre: 'Ana', segundoNombre: '', primerApellido: 'Perez', segundoApellido: '', correo: 'ana@correo.com', telefono: '3001234567', numeroLicencia: 'L123', categoriaLicencia: 'B1', expedicion: '2020-01-15', vencimiento: '2032-01-15', clave: 'ClavePrueba2026', confirmar: 'ClavePrueba2026' };

function preparar() {
  const http = configurar();
  const fixture = TestBed.createComponent(RegistroComponent); fixture.detectChanges();
  return { c: fixture.componentInstance, http, alerta: vi.spyOn(window, 'alert').mockImplementation(() => undefined), navegar: vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true) };
}

describe('Registro de clientes', () => {
  beforeEach(() => sessionStorage.clear());

  it('registro exitoso: manda cliente y licencia, avisa y lleva al panel', async () => {
    const { c, http, alerta, navegar } = preparar();
    c.form.setValue(VALIDO);
    const p = c.registrar();
    const req = http.expectOne(`${API}/auth/registro`);
    expect(req.request.body.cliente).toMatchObject({ numeroDocumento: 'A12345', correo: 'ana@correo.com', clave: 'ClavePrueba2026' });
    expect(req.request.body.licencia).toEqual({ numeroLicencia: 'L123', categoriaLicencia: 'B1', fechaExpedicion: '2020-01-15', fechaVencimiento: '2032-01-15' });
    req.flush({ token: 'abc', tipoToken: 'Bearer', expiraEnSegundos: 7200, usuario: { id: 5, tipo: 'CLIENTE', rol: 'CLIENTE', nombre: 'Ana Perez', correo: 'ana@correo.com', estado: 'ACTIVO', debeCambiarClave: false } });
    await p;
    expect(alerta).toHaveBeenCalledWith(expect.stringContaining('Registro exitoso'));
    expect(navegar).toHaveBeenCalledWith('/panel');
  });

  it('formulario incompleto: indica los campos que faltan, sin ventanas emergentes y sin llamar al backend', async () => {
    const { c, http, alerta, navegar } = preparar();
    await c.registrar();
    expect(c.error).toContain('N\u00famero de documento');
    expect(c.error).toContain('Correo electr\u00f3nico');
    expect(alerta).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled(); http.expectNone(`${API}/auth/registro`);
  });

  it('error del backend: muestra el mensaje, se\u00f1ala el campo y no navega', async () => {
    const { c, http, alerta, navegar } = preparar();
    c.form.setValue(VALIDO);
    const p = c.registrar();
    http.expectOne(`${API}/auth/registro`).flush({ status: 409, mensaje: 'El correo ya est\u00e1 registrado', detalles: null }, { status: 409, statusText: 'Conflict' });
    await p;
    expect(c.error).toContain('El correo ya est\u00e1 registrado');
    expect(c.validar(c.form, 'correo')).toContain('ya est\u00e1 registrado');
    expect(alerta).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled(); expect(c.cargando).toBe(false);
  });

  it('rechaza contrasenas distintas, claves debiles y licencias vencidas sin llamar al backend', async () => {
    const { c, http, alerta } = preparar();
    c.form.setValue({ ...VALIDO, confirmar: 'OtraClave2026' }); await c.registrar();
    expect(c.error).toContain('no coinciden');
    c.form.setValue({ ...VALIDO, clave: 'corta', confirmar: 'corta' }); await c.registrar();
    expect(c.error).toContain('Contrase\u00f1a');
    expect(c.validar(c.form, 'clave')).toContain('10 y 72 caracteres');
    c.form.setValue({ ...VALIDO, vencimiento: '2020-02-01' }); await c.registrar();
    expect(c.error).toContain('licencia');
    c.form.setValue({ ...VALIDO, vencimiento: '2019-01-01' }); await c.registrar();
    expect(c.error).toContain('posterior a la de expedici\u00f3n');
    expect(alerta).not.toHaveBeenCalled();
    http.expectNone(`${API}/auth/registro`);
  });

  it('valida cada campo con un mensaje claro: espacios, documento, telefono y correo', async () => {
    const { c } = preparar();
    c.form.markAllAsTouched();
    c.form.patchValue({ primerNombre: '   ', documento: 'ab', telefono: '12', correo: 'ana@correo' });
    expect(c.validar(c.form, 'primerNombre')).toContain('obligatorio');
    expect(c.validar(c.form, 'documento')).toContain('entre 4 y 20');
    expect(c.validar(c.form, 'telefono')).toContain('tel\u00e9fono v\u00e1lido');
    expect(c.validar(c.form, 'correo')).toContain('correo electr\u00f3nico v\u00e1lido');
  });
});
