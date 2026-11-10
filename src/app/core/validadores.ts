import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { fechaIso } from './formato';

/** Nombre legible de cada campo, usado en los mensajes y res\u00famenes de error (tambi\u00e9n para los campos que devuelve el servidor). */
export const ETIQUETAS: Record<string, string> = {
  documento: 'N\u00famero de documento', numeroDocumento: 'N\u00famero de documento',
  primerNombre: 'Primer nombre', segundoNombre: 'Segundo nombre',
  primerApellido: 'Primer apellido', segundoApellido: 'Segundo apellido',
  correo: 'Correo electr\u00f3nico', telefono: 'Tel\u00e9fono',
  numeroLicencia: 'N\u00famero de licencia', categoriaLicencia: 'Categor\u00eda de la licencia',
  expedicion: 'Fecha de expedici\u00f3n', fechaExpedicion: 'Fecha de expedici\u00f3n',
  vencimiento: 'Fecha de vencimiento', fechaVencimiento: 'Fecha de vencimiento',
  clave: 'Contrase\u00f1a', claveActual: 'Contrase\u00f1a actual', claveNueva: 'Nueva contrase\u00f1a',
  actual: 'Contrase\u00f1a actual', nueva: 'Nueva contrase\u00f1a', confirmar: 'Confirmaci\u00f3n de la contrase\u00f1a',
  fechaContratacion: 'Fecha de contrataci\u00f3n', idSede: 'Sede', tipo: 'Tipo',
  mostradorAsignado: 'Mostrador asignado', especialidad: 'Especialidad',
  placa: 'Placa', marca: 'Marca', modeloAnio: 'Modelo (a\u00f1o)', kilometraje: 'Kilometraje', color: 'Color', idCategoria: 'Categor\u00eda',
  nombre: 'Nombre', nombreCategoria: 'Nombre de la categor\u00eda', nombreSede: 'Nombre de la sede', nombreSeguro: 'Nombre del seguro',
  tarifaDiaria: 'Tarifa diaria', capacidadPasajeros: 'Capacidad de pasajeros', tipoTransmision: 'Transmisi\u00f3n',
  ciudad: 'Ciudad', direccion: 'Direcci\u00f3n', capacidadEstacionamiento: 'Capacidad de estacionamiento',
  descripcion: 'Descripci\u00f3n', costoDiario: 'Costo diario',
  combustible: 'Nivel de combustible', observacionesGenerales: 'Observaciones', idReserva: 'Reserva',
  clienteId: 'Cliente', vehiculoId: 'Veh\u00edculo', fechaInicio: 'Fecha de recogida', fechaFin: 'Fecha de devoluci\u00f3n', sedeRecibeId: 'Sede de devoluci\u00f3n'
};

/** Convierte el nombre t\u00e9cnico de un campo (por ejemplo "cliente.numeroDocumento") en un texto para personas. */
export function etiquetaCampo(campo: string): string {
  const ultimo = campo.split('.').pop() ?? campo;
  const limpio = ultimo.replace(/\[\d+\]/g, '');
  if (ETIQUETAS[limpio]) { return ETIQUETAS[limpio]; }
  const texto = limpio.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const MSG_CLAVE = 'La contrase\u00f1a debe tener entre 10 y 72 caracteres, con al menos una may\u00fascula, una min\u00fascula y un n\u00famero.';
const CAMPOS_CLAVE = ['clave', 'nueva', 'claveNueva'];
const MENSAJES_PATRON: Record<string, string> = {
  documento: 'El documento debe tener entre 4 y 20 caracteres: solo letras, n\u00fameros o guion.',
  numeroDocumento: 'El documento debe tener entre 4 y 20 caracteres: solo letras, n\u00fameros o guion.',
  telefono: 'Ingresa un tel\u00e9fono v\u00e1lido: entre 7 y 20 caracteres con n\u00fameros, +, par\u00e9ntesis, espacios o guion.',
  correo: 'Ingresa un correo electr\u00f3nico v\u00e1lido, por ejemplo nombre@correo.com.',
  placa: 'La placa debe tener entre 5 y 10 caracteres: solo letras, n\u00fameros o guion.',
  clave: MSG_CLAVE, nueva: MSG_CLAVE, claveNueva: MSG_CLAVE
};

export function fechasCoherentes(inicio: string, fin: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const desde = String(grupo.get(inicio)?.value ?? '');
    const hasta = String(grupo.get(fin)?.value ?? '');
    return desde && hasta && desde >= hasta ? { fechas: true } : null;
  };
}

/** Validators.required acepta textos de solo espacios; este validador los rechaza. */
export function sinSoloEspacios(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0 ? { vacio: true } : null;
}

/** El valor debe ser igual al de otro campo del mismo formulario (por ejemplo, la confirmaci\u00f3n de la contrase\u00f1a). */
export function coincideCon(otro: string, mensaje = 'Los valores no coinciden.'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    const referencia = control.parent?.get(otro)?.value;
    return valor && valor !== referencia ? { mensaje } : null;
  };
}

/** La fecha (AAAA-MM-DD) no puede ser posterior a hoy. */
export function fechaNoFutura(mensaje: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    return valor && valor > fechaIso() ? { mensaje } : null;
  };
}

/** La fecha (AAAA-MM-DD) no puede ser anterior a hoy. */
export function fechaNoPasada(mensaje: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    return valor && valor < fechaIso() ? { mensaje } : null;
  };
}

/** Mensaje de error para un campo, o cadena vac\u00eda si el campo es v\u00e1lido o la persona a\u00fan no lo ha tocado. */
export function validarControl(formulario: AbstractControl, nombre: string): string {
  const control = formulario.get(nombre);
  if (!control || (!control.touched && !control.dirty) || !control.invalid) { return ''; }
  const e: ValidationErrors = control.errors ?? {};
  if (typeof e['mensaje'] === 'string') { return e['mensaje']; }
  if (e['required'] || e['vacio']) { return 'Este campo es obligatorio.'; }
  if (e['email']) { return 'Ingresa un correo electr\u00f3nico v\u00e1lido, por ejemplo nombre@correo.com.'; }
  if (e['minlength']) {
    return CAMPOS_CLAVE.includes(nombre) ? MSG_CLAVE : `Escribe al menos ${e['minlength'].requiredLength} caracteres.`;
  }
  if (e['maxlength']) { return `M\u00e1ximo ${e['maxlength'].requiredLength} caracteres (ahora tiene ${e['maxlength'].actualLength}).`; }
  if (e['min']) { return `El valor m\u00ednimo permitido es ${e['min'].min}.`; }
  if (e['max']) { return `El valor m\u00e1ximo permitido es ${e['max'].max}.`; }
  if (e['pattern']) { return MENSAJES_PATRON[nombre] ?? 'El formato ingresado no es v\u00e1lido.'; }
  return 'Revisa el valor ingresado.';
}

/** Texto para el aviso general del formulario: nombra los campos con problemas en lugar de un mensaje gen\u00e9rico. */
export function resumenInvalidos(formulario: FormGroup): string {
  const campos: string[] = [];
  const avisos: string[] = [];
  Object.keys(formulario.controls).forEach(nombre => {
    const control = formulario.controls[nombre];
    if (!control.invalid) { return; }
    campos.push(etiquetaCampo(nombre));
    const aviso = control.errors?.['mensaje'];
    if (typeof aviso === 'string' && !avisos.includes(aviso)) { avisos.push(aviso); }
  });
  if (!campos.length) { return 'Revisa los datos ingresados.'; }
  return ['Revisa los campos marcados: ' + campos.join(', ') + '.', ...avisos].join(' ');
}

/** Lleva el cursor al primer campo con error del formulario que se acaba de enviar. */
export function enfocarPrimerInvalido(): void {
  setTimeout(() => {
    const campo = document.querySelector('form.ng-submitted input.ng-invalid, form.ng-submitted select.ng-invalid, form.ng-submitted textarea.ng-invalid') as HTMLElement | null;
    campo?.focus();
  }, 0);
}
