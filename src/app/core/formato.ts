const dos = (n: number): string => String(n).padStart(2, '0');

/** Fecha local en formato yyyy-MM-dd, con días opcionales de desplazamiento (evita el desfase UTC de toISOString). */
export function fechaIso(desplazarDias = 0): string {
  const f = new Date();
  f.setDate(f.getDate() + desplazarDias);
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

/** Imagen ilustrativa según el nombre de la categoría. */
export function imagenCategoria(nombre: string): string {
  const tipo = nombre.toLowerCase();
  if (tipo.includes('suv') || tipo.includes('camioneta')) { return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=760&q=80'; }
  if (tipo.includes('sed')) { return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=760&q=80'; }
  return 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=760&q=80';
}

/** Métodos de pago que acepta el formulario (el backend guarda el texto tal cual). */
export const METODOS_PAGO = ['TARJETA', 'PSE', 'EFECTIVO'] as const;

/** Descarga un archivo CSV (separado por punto y coma, con BOM para que Excel respete los acentos). */
export function descargarCsv(nombre: string, columnas: string[], filas: Array<Array<string | number>>): void {
  const escapar = (campo: string | number): string => `"${String(campo).replace(/"/g, '""')}"`;
  const contenido = [columnas, ...filas].map(fila => fila.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', contenido], { type: 'text/csv;charset=utf-8;' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export const CLAVE_POLITICA = '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,72}';
