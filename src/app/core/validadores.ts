import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function fechasCoherentes(inicio: string, fin: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const desde = String(grupo.get(inicio)?.value ?? '');
    const hasta = String(grupo.get(fin)?.value ?? '');
    return desde && hasta && desde >= hasta ? { fechas: true } : null;
  };
}

export function validarControl(formulario: AbstractControl, nombre: string): string {
  const control = formulario.get(nombre);
  if (!control || (!control.touched && !control.dirty) || !control.invalid) { return ''; }
  if (control.hasError('required')) { return 'Este campo es obligatorio.'; }
  if (control.hasError('email')) { return 'Ingresa un correo electrónico válido.'; }
  if (control.hasError('min')) { return 'El valor no puede ser inferior al mínimo permitido.'; }
  if (control.hasError('max')) { return 'El valor supera el máximo permitido.'; }
  if (control.hasError('maxlength')) { return 'El texto supera la longitud permitida.'; }
  if (control.hasError('pattern')) { return 'El formato ingresado no es válido.'; }
  return 'Revisa el valor ingresado.';
}
