# RutaCar — Backend y base de datos

API REST y scripts de base de datos del sistema de gestión de alquiler de vehículos **RutaCar** (Bases de Datos 2, Universidad El Bosque).

| Repositorio | Contenido |
|---|---|
| **alquiler-vehiculos-bd2** (este) | Spring Boot + scripts SQL (`database/`) |
| [FrontBD](https://github.com/nmanriqueve-hue/FrontBD) | Frontend Angular 20 |

## Tecnologías

- Java 21, Spring Boot (Web MVC, Data JPA, Security, Validation).
- **PostgreSQL**: modelo relacional de 15 tablas, con funciones, procedimientos, triggers, restricciones de exclusión para cruces de reservas y roles de base de datos.
- **MongoDB**: inspecciones de vehículos (documentos) y fotografías (GridFS).
- Autenticación con JWT (HS256) y contraseñas con BCrypt.
- Empaquetado `war` (Maven Wrapper incluido).

## 1. Base de datos PostgreSQL

Requiere PostgreSQL con las extensiones `pgcrypto` y `btree_gist`. La base debe existir y estar **vacía**:

```bash
createdb alquiler_vehiculos
cd database
PGHOST=localhost PGUSER=<usuario> PGDATABASE=alquiler_vehiculos ./ejecutar_todo.sh
```

El script ejecuta, en este orden (importa), y se detiene ante cualquier error:

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `01_creacion.sql` | Tablas, claves, restricciones |
| 2 | `02_funciones_procedimientos.sql` | Lógica de reservas, pagos, entregas y devoluciones |
| 3 | `03_triggers.sql` | Auditoría, límites de pago, especialización de empleados |
| 4 | `07_cambios_fase2.sql` | Credenciales, estado `BLOQUEADO`, `BAJA`/`VENDIDO`, penalizaciones |
| 5 | `04_datos_prueba.sql` | Sedes, categorías, vehículos y empleados de prueba |
| 6 | `05_seguridad.sql` | Roles `rol_administrador`, `rol_asesor`, `rol_tecnico`, etc. |
| 7 | `09_cambios_backend.sql` | Ajustes para el backend (procedimiento de cambio de clave, etc.) |
| 8–9 | `06_pruebas.sql`, `08_pruebas_fase2.sql` | Pruebas de reglas de negocio |

> `04` y `05` dependen de lo que agrega `07`, por eso el orden no es numérico.

## 2. MongoDB

El backend se conecta con `spring.data.mongodb.uri` (ver sección 3; sin ese valor usa `localhost:27017`). Crea las colecciones e índices al arrancar (`auto-index-creation=true`).

## 3. Configuración del backend

`src/main/resources/application.properties` apunta a PostgreSQL en `192.168.56.10:5432` (la VM) con el usuario `admindb`.
Los secretos **no están en Git**: créalos en `src/main/resources/application-local.properties` (ignorado por Git):

```properties
# Ajusta el host si no usas la VM
spring.datasource.url=jdbc:postgresql://localhost:5432/alquiler_vehiculos
spring.datasource.username=<usuario>
spring.datasource.password=<contraseña>

spring.data.mongodb.uri=mongodb://localhost:27017/<nombre_base>

# Mínimo 32 caracteres (también puede venir de la variable APP_JWT_SECRET)
app.jwt.secret=<cadena-aleatoria-de-32-o-más-caracteres>
app.jwt.expiracion-minutos=120

# Orígenes permitidos para el frontend (por defecto 3000, 5173 y 4200 en localhost)
app.cors.allowed-origins=http://localhost:4200
```

Sin `app.jwt.secret` la aplicación no arranca.

## 4. Ejecutar

```bash
./mvnw spring-boot:run        # API en http://localhost:8080
./mvnw test                   # pruebas
./mvnw -DskipTests package    # genera el .war en target/
```

Luego levanta el frontend (repositorio FrontBD) y entra con un usuario de prueba.

## Usuarios de prueba

Cargados por `04_datos_prueba.sql`. Clave: `Clave123*` (solo desarrollo; cámbiala en cualquier otro entorno).

| Rol | Correo |
|---|---|
| Administrador | `marta.rios@alquiler.com` |
| Asesor | `camilo.pardo@alquiler.com`, `valentina.mora@alquiler.com` |
| Técnico | `julian.cortes@alquiler.com`, `sofia.lara@alquiler.com` |

Los clientes se registran con `POST /api/auth/registro`.

## API (`/api`)

| Recurso | Descripción |
|---|---|
| `/auth` | `login`, `registro`, `me`, `cambiar-clave`, `recuperar-clave` |
| `/clientes`, `/clientes/{id}/licencia` | Clientes y licencias |
| `/empleados` | Empleados por rol y sede |
| `/vehiculos`, `/categorias`, `/sedes`, `/seguros` | Flota y catálogos |
| `/reservas` | Cotización, pre-reserva, confirmación, pagos, entrega, devolución y penalizaciones |
| `/vehiculos/{id}/inspecciones`, `/inspecciones` | Inspecciones y fotos (MongoDB) |
| `/reportes` | Ingresos por sede, flota por estado, seguros más contratados, empleados por sede, historial por vehículo |

Públicos (sin token): login, registro, recuperación de clave, catálogos, `vehiculos/disponibles` y `reservas/cotizacion`. El resto exige JWT y rol.

## Reglas de negocio principales

Se aplican en la base de datos (funciones, procedimientos, triggers y restricciones), no solo en la API:

- Sin cruces de reservas para un mismo vehículo ni para un mismo cliente.
- La reserva se confirma solo con un pago inicial aprobado; un pago rechazado cancela la pre-reserva.
- Pagos aprobados ≤ costo pactado.
- Cliente `BLOQUEADO` no puede reservar; la entrega la registra un asesor activo.
- Devolución posible en otra sede; penalizaciones ligadas a la reserva y a la inspección.
- Auditoría de cambios de estado de la reserva.

> Consistencia entre bases: PostgreSQL y MongoDB no comparten transacción. El registro de inspecciones aplica una compensación manual si una de las dos escrituras falla.

## Estructura

```
database/                 scripts SQL y ejecutar_todo.sh
src/main/java/co/edu/unbosque/alquiler/
  config/  controller/  dto/  document/  entity/  repository/  security/  service/
```

## Integrantes

Felipe Acosta · Santiago Muñoz · Nataly Manrique