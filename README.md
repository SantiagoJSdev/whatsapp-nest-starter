# whatsapp-nest-starter

Plantilla reutilizable de automatización conversacional construida con
**NestJS**, **TypeScript**, **TypeORM** y **PostgreSQL** local vía
**Docker Compose**.

Estado actual: Etapa 2 completada y verificada manualmente
(`GET /health` respondió el ciclo 200 → 503 → 200 al detener y
reactivar PostgreSQL sin reiniciar NestJS).

> Esta versión NO incluye catálogo, demo de ventas, WhatsApp ni
> OpenRouter. Son etapas posteriores.

## Tecnologías

- NestJS 10 + TypeScript.
- TypeORM para el acceso a datos (PostgreSQL), con `synchronize: false`.
  Los cambios de esquema deben aplicarse con migraciones versionadas.
- PostgreSQL 16 en un contenedor Docker Compose, con volumen nombrado.
- `GET /health` ejecuta `SELECT 1` real a través de la conexión de la app:
  devuelve HTTP 200 si funciona y HTTP 503 si falla o excede un límite
  de tiempo (2 s). No expone credenciales ni detalles internos.

## Requisitos

- Node.js 20 o superior (probado con v20).
- Docker + Docker Compose (`docker compose`).

## Puesta en marcha desde cero (Windows CMD)

Ejecuta todos los comandos desde la raíz del proyecto.

1. Crear `.env` desde `.env.example`, solo si no existe:

   ```
   if not exist .env (copy .env.example .env)
   ```

2. Levantar PostgreSQL (usa `--env-file .env` para las variables):

   ```
   docker compose --env-file .env up -d postgres
   ```

3. Instalar dependencias con `npm ci` (usa `package-lock.json`):

   ```
   npm ci
   ```

4. Compilar:

   ```
   npm run build
   ```

5. Arrancar NestJS:

   ```
   npm run start:dev
   ```

   Debe aparecer: `API escuchando en http://localhost:3000`.

## Verificar la conexión

Disponibilidad de PostgreSQL (dentro del contenedor, sin instalar
`psql` en Windows):

```
docker compose --env-file .env exec postgres pg_isready -U wapp_user -d whatsapp_nest
```

Probar la API (otra ventana de CMD):

```
curl -i http://localhost:3000/health
```

Esperado: `HTTP/1.1 200` con cuerpo `{"status":"ok"}`.

## Probar resiliencia de la conexión: ciclo 200 → 503 → 200

Con NestJS corriendo, sin reiniciarlo:

1. Detener solo PostgreSQL:

   ```
   docker compose --env-file .env stop postgres
   ```

2. Consultar: `curl -i http://localhost:3000/health` →
   `HTTP/1.1 503` con cuerpo `{"status":"error"}` (puede tardar hasta
   el límite de 2 s).

3. Reactivar PostgreSQL:

   ```
   docker compose --env-file .env start postgres
   ```

4. Esperar a que responda (`pg_isready`) y volver a consultar
   `curl -i http://localhost:3000/health` → `HTTP/1.1 200`.
   El pool de la app reconecta solo; no hace falta reiniciar NestJS.

> El ciclo de verificación se repite desde un CLON LIMPIO después de
> confirmar los cambios (no se ejecuta en este turno).

## Cambiar el puerto local de PostgreSQL

Si `5432` ya está en uso, edita tu `.env` local y ajusta AMBAS variables
para que queden coherentes:

- `POSTGRES_PORT` (puerto local publicado por Docker).
- El puerto dentro de `DATABASE_URL` (debe coincidir con `POSTGRES_PORT`).

Después recrea el contenedor:

```
docker compose --env-file .env up -d --force-recreate postgres
```

`POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` deben coincidir en
`.env`, en el `DATABASE_URL` y en los comandos de ejemplo.

## Estructura

```
src/
  conversation/   # (etapa futura)
  catalog/        # (etapa futura)
  leads/          # (etapa futura)
  channels/       # (etapa futura)
  persistence/
    migrations/   # (etapa futura)
  config/
    validate-env.ts
  health/
    health.module.ts
    health.controller.ts
  app.module.ts
  main.ts
test/
compose.yaml
.env.example
```

## Notas de configuración

- `DATABASE_URL` se valida al arrancar; si falta o es inválida la app
  lanza un error genérico sin exponer su valor.
- `.env` está en `.gitignore`; `.env.example` se conserva versionado.
- TypeORM usa `synchronize: false`. No hay entidades ni tablas creadas
  en esta etapa.
