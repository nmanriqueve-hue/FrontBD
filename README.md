# RutaCar — Sistema de gestión de alquiler de vehículos

Proyecto académico de Bases de Datos 2 de la Universidad El Bosque.

## Inicio

Requisitos: Node.js 20.19+ o 22.12+ compatible con Angular 20 y npm.

1. Descomprimir el ZIP. El archivo `package.json` está directamente en la carpeta raíz.
2. Abrir la carpeta en VS Code y abrir su terminal integrada.
3. Ejecutar `npm install`.
4. Ejecutar `npm start`.
5. Visitar `http://localhost:4200`.

El proyecto usa `AppModule` y componentes de tipo `standalone: false`, con archivos independientes `.component.ts`, `.component.html` y `.component.css`. No se requiere Bootstrap ni una librería visual.

## Accesos preconfigurados

| Rol | Correo | Contraseña | Código local de recuperación |
| --- | --- | --- | --- |
| Administrador único | admin@rutacar.test | Admin2026! | RUTA-ADMIN-2026 |
| Asesor | asesor@rutacar.test | Asesor2026! | RUTA-ASESOR-2026 |
| Técnico | tecnico@rutacar.test | Tecnico2026! | RUTA-TECNICO-2026 |
| Cliente | cliente@rutacar.test | Cliente2026! | RUTA-CLIENTE-2026 |

Los cuatro accesos están precargados y sus contraseñas se verifican con PBKDF2-SHA256 en el navegador. No es necesario registrarlos previamente. La única cuenta de administrador se entrega preconfigurada, no existe una pantalla para crearla, no se puede crear otro administrador desde los formularios y no se puede desactivar la cuenta administrativa. El administrador puede crear múltiples asesores y técnicos, y los clientes pueden registrarse libremente.

## Datos iniciales de demostración

Para facilitar la evaluación de los flujos, el navegador inicia con un cliente de prueba, dos empleados de prueba, dos sedes ficticias, tres categorías, tres vehículos ficticios y dos seguros de ejemplo. Los registros `DEMO` son datos académicos: no corresponden a inventario real ni a tarifas verificadas. Pueden modificarse desde los módulos de administración.

## Módulos

- Portada y búsqueda pública, catálogo con filtros y tarifas COP.
- Registro e inicio de sesión de clientes; recuperación de contraseñas con código local.
- Cuentas y accesos de personal, rol único de administrador, acceso por rutas y menús.
- Gestión de clientes y licencias, inventario, categorías, sedes y seguros.
- Cotizaciones y pre-reservas en borrador, control local de cruces, gestión de pagos informativa.
- Inspecciones de entrega y devolución; historial y reportes exportables.
- Diseño corporativo responsive en rojo, gris, blanco y negro y footer con los tres autores.

## Persistencia y seguridad

Esta entrega implementa un **prototipo frontend local**, no un servicio de autenticación listo para producción. Las cuentas y registros se almacenan en `localStorage` y la sesión en `sessionStorage`; borrar los datos del sitio elimina los registros y restaura los usuarios de prueba al recargar. El almacenamiento del navegador puede modificarse manualmente, de modo que la restricción de un solo administrador y las autorizaciones **deben garantizarse también en el backend** antes de su despliegue. Los códigos de recuperación demostrativos están documentados solo para pruebas. No uses contraseñas reales en esta versión.

La confirmación de reservas, aprobación de pagos, persistencia transaccional de MySQL/PostgreSQL, gestión documental de MongoDB, permisos reales del servidor y despliegue Linux/VM están pendientes de implementación backend. La interfaz no presenta una pre-reserva como pago aprobado.

## Integrantes

Felipe Acosta · Santiago Muñoz · Nataly Manrique

## Diseño comercial

La portada, el buscador y el catálogo emplean una composición corporativa sencilla, con tipografía Arial, campos rectos, tablas limpias y navegación convencional. Las fotografías de Unsplash son ilustrativas y requieren conexión a internet; no representan necesariamente los vehículos registrados.

## Alcance según la gestión de requerimientos

Los requisitos RF-01 a RF-09 son Must Have y RF-10 es Should Have en la matriz MoSCoW. Se conserva el frontend de clientes, flota, disponibilidad, pre-reservas, cotizaciones, pagos informativos, inspecciones e historial. La búsqueda permite indicar sede de recogida y sede de devolución. La sede de devolución se transfiere a la pre-reserva y se valida que esté activa. La disponibilidad y los cruces solo se comprueban contra los datos locales del navegador.

El documento exige impuestos aplicables en RF-07, pero no especifica tasa ni régimen tributario. Por tanto, las cotizaciones locales incluyen tarifa por categoría y seguros, sin inventar una tasa de impuestos. El cálculo definitivo, la aprobación bancaria, las penalizaciones automáticas, los procedimientos almacenados, los triggers, las transacciones, MongoDB y el despliegue en máquinas virtuales siguen pendientes de backend.

No se modificaron los nombres de rutas, los contratos de servicios ni los modelos existentes. Los componentes mantienen `standalone: false` y archivos independientes.
