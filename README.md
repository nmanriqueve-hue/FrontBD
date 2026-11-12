# RutaCar — Frontend (Angular)

Interfaz web del sistema de gestión de alquiler de vehículos **RutaCar** (Bases de Datos 2, Universidad El Bosque).
Consume la API REST del backend Spring Boot, que a su vez trabaja con PostgreSQL (datos relacionales) y MongoDB (inspecciones y fotos).

| Repositorio | Contenido |
|---|---|
| **FrontBD** (este) | Aplicación Angular 20 |
| [alquiler-vehiculos-bd2](https://github.com/Acoss1x/alquiler-vehiculos-bd2) | Backend Spring Boot + scripts SQL (`database/`) |

## Arquitectura

```
Navegador (Angular 20)  ──HTTP/JSON + JWT──▶  Spring Boot (Java 21)  ──▶  PostgreSQL  (reservas, pagos, flota…)
                                                                      └─▶  MongoDB     (inspecciones y fotos, GridFS)
```

## Requisitos

- Node.js 20.19+ o 22.12+ y npm.
- Backend en ejecución (por defecto en `http://localhost:8080`). Ver el README del backend.

## Puesta en marcha

```bash
npm install
npm start          # ng serve --host 0.0.0.0  →  http://localhost:4200
```

La URL de la API está en `src/app/core/api-config.ts` (`API_URL`, por defecto `http://localhost:8080/api`).
Si el backend corre en otra máquina o en la VM, cambia ese valor y agrega el origen del front a `app.cors.allowed-origins` del backend.

## Scripts

| Comando | Acción |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run build` | Compilación de producción (`dist/`) |
| `npm test` | Pruebas unitarias (una sola ejecución) |
| `npm run typecheck` | Verificación de tipos |
| `npm run verificar` | Typecheck + build de producción + pruebas |

## Usuarios de prueba

Los carga el script `database/04_datos_prueba.sql` del backend. Clave de todos: `Clave123*` (solo para desarrollo).

| Rol | Correo |
|---|---|
| Administrador | `marta.rios@alquiler.com` |
| Asesor | `camilo.pardo@alquiler.com`, `valentina.mora@alquiler.com` |
| Técnico | `julian.cortes@alquiler.com`, `sofia.lara@alquiler.com` |
| Cliente | Se crea desde **Crear cuenta** (`/registro`) |

## Módulos y acceso por rol

La sesión usa un JWT que el backend emite en `/api/auth/login`; se guarda en `sessionStorage`. Las rutas se protegen con `RolGuard`, pero **la autorización real la aplica el backend**.

| Ruta | Descripción | Roles |
|---|---|---|
| `/`, `/catalogo` | Portada, búsqueda por sedes y fechas, catálogo, cotización | Público |
| `/acceso`, `/registro`, `/recuperar` | Inicio de sesión, registro y recuperación de clave | Público |
| `/panel`, `/perfil` | Panel y datos de la cuenta | Autenticados |
| `/reservas` | Pre-reservas, confirmación y cancelación | Cliente, asesor, administrador |
| `/pagos` | Registro de pagos (aprobado/rechazado) | Administrador, asesor |
| `/clientes` | Clientes y licencias | Administrador, asesor |
| `/inspecciones` | Inspecciones de entrega/devolución y fotos | Administrador, asesor, técnico |
| `/flota`, `/catalogos` | Vehículos, categorías, sedes y seguros | Administrador |
| `/empleados` | Gestión de empleados | Administrador |
| `/reportes` | Reportes (ingresos por sede, flota por estado, seguros, empleados por sede) | Administrador, técnico |

Los roles por ruta están definidos en `src/app/app-routing.module.ts`.

## Reglas de negocio visibles en la interfaz

La validación definitiva vive en PostgreSQL (funciones, procedimientos y triggers) y en el backend; el front muestra sus mensajes de error.

- Una reserva solo se confirma cuando existe un pago inicial aprobado; un pago rechazado cancela la pre-reserva.
- No se aceptan reservas que se crucen para el mismo vehículo, ni para un mismo cliente.
- Los pagos aprobados no pueden superar el costo pactado.
- Un cliente bloqueado no puede reservar.
- Las devoluciones pueden hacerse en una sede distinta a la de entrega.

## Estructura

```
src/app/
  core/        api.service.ts, auth.service.ts, rol.guard.ts, api-config.ts, utilidades
  pruebas/     pruebas unitarias (auth, guard, formato)
  …            un componente por módulo (standalone: false, archivos independientes)
```

## Integrantes

Felipe Acosta · Santiago Muñoz · Nataly Manrique

## Notas

- Las fotografías de la portada y el catálogo son ilustrativas y requieren conexión a internet.
- Las cotizaciones no incluyen impuestos: el documento de requerimientos (RF-07) los exige pero no define tasa ni régimen.