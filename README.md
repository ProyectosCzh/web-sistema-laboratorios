# LABMANAGE — Frontend (`labmanage-web`)

Frontend del sistema de gestión de aulas/laboratorios **LABMANAGE**. Consume únicamente la API REST de `labmanage-api` (Express + TypeScript + Prisma + PostgreSQL/Neon).

> **Contrato**: el contrato de la API (tipos, endpoints, errores) es la **fuente de verdad** y está documentado en `PLAN.md` (sección 8) en la raíz del repositorio. Este README documenta cómo está construido el frontend y cómo se integra con ese contrato.

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 7 (`output: "server"` + adapter `@astrojs/node` standalone) |
| UI | React 19 + React islands (`client:only="react"`) |
| Estilos | Tailwind CSS 4 (vía `@tailwindcss/vite`) |
| Datos | TanStack Query 5 + axios |
| Lenguaje | TypeScript estricto (`astro/tsconfigs/strict`) |
| Runtime | Node.js ≥ 22.12 |

## 2. Requisitos y setup

1. **Node.js ≥ 22.12** instalado.
2. Instalar dependencias:
   ```sh
   npm install
   ```
3. Crear `.env` a partir de `.env.example`:
   ```env
   PUBLIC_API_URL="http://localhost:3001/api"
   ```
   `PUBLIC_API_URL` es la URL base de la API (sin barra final). Al ser prefijo `PUBLIC_`, Astro la expone al cliente. En producción apunta a la API desplegada.
4. Levantar la API (`labmanage-api`) antes de usar la web. Sin API, la web mostrará los estados de error de cada consulta.

## 3. Comandos

| Comando | Acción |
|---------|--------|
| `npm run dev` | Dev server en `http://localhost:4321` |
| `astro dev --background` | Dev server en segundo plano (ver `astro dev status` / `astro dev logs` / `astro dev stop`) |
| `npm run build` | Compila TypeScript y genera el build en `dist/` |
| `npm run preview` | Sirve el build generado localmente |
| `npm run astro check` | Chequeo de tipos y AST de Astro |

## 4. Arquitectura

Astro actúa como **shell** que renderiza cada ruta y monta componentes React como **islands** (hidratación por página). Todos los islands interactivos se montan con `client:only="react"`, es decir: **no se renderizan en el servidor**; el servidor envía el HTML vacío y React se encarga de todo en el navegador. Por eso toda la lógica de datos (TanStack Query) corre del lado del cliente.

```
Navegador ──(fetch a PUBLIC_API_URL)──► labmanage-api ──(Prisma)──► Neon PostgreSQL
     ▲
  React islands (TanStack Query + axios con Bearer token)
     ▲
  Astro pages (.astro) montando cada island
```

Patrón de composición de una página (ej. `/aulas`):

1. `src/pages/aulas/index.astro` importa el island wrapper y lo monta con `client:only="react"`.
2. El island wrapper (`ClassroomsPage.tsx`) envuelve todo en `AppProviders`.
3. `AppProviders` crea el `QueryClient` (retry 1, sin refetch al enfocar ventana) y monta `AuthProvider`.
4. `RequireAuth` redirige a `/login` si no hay token; `RequireRole` muestra "Sin permisos" si el rol no aplica.
5. Se renderiza `Navbar` + el panel de contenido.

## 5. Estructura de archivos

```
labmanage-web/
├── astro.config.mjs        # output:"server", React, Tailwind vía Vite, adapter Node standalone
├── tsconfig.json           # estricto (astro/tsconfigs/strict) + JSX React
├── .env.example            # PUBLIC_API_URL
├── public/
│   ├── favicon.ico
│   └── favicon.svg
└── src/
    ├── layouts/
    │   └── Layout.astro    # HTML base: lang="es", <title>, favicon, importa global.css
    ├── styles/
    │   └── global.css      # @import "tailwindcss";
    ├── pages/              # Rutas (ver tabla en §7)
    │   ├── index.astro            → DashboardPage
    │   ├── login.astro            → LoginForm
    │   ├── mantenimiento.astro    → MaintenancePage
    │   ├── usuarios.astro         → UsersPage
    │   ├── semestres.astro        → SemestersPage
    │   └── aulas/
    │       ├── index.astro        → ClassroomsPage
    │       └── [id].astro         → ClassroomDetailPage (pasa `classroomId` por params)
    ├── lib/                 # Capa de cliente (ver §6)
    │   ├── api.ts          # axios instance + interceptores + apiErrorToMessage
    │   ├── auth.tsx        # AuthProvider, useAuth, RequireAuth, RequireRole
    │   ├── constants.ts    # días, colores, labels, ERROR_MESSAGES
    │   ├── permissions.ts  # helpers de permisos en UI
    │   ├── session.ts      # sesión en localStorage (key "labmanage_session")
    │   └── types.ts        # reflejo EXACTO de api/src/types (PLAN.md §8.2)
    └── islands/            # Componentes React (cada uno con su rol)
        ├── AppProviders.tsx        # QueryClient + AuthProvider
        ├── LoginForm.tsx           # login
        ├── Navbar.tsx              # barra de navegación
        ├── Modal.tsx               # modal reutilizable
        ├── DashboardPage.tsx       # wrapper de "/"
        ├── StatsDashboard.tsx      # KPIs de /stats/overview
        ├── ClassroomsPage.tsx      # wrapper de /aulas
        ├── ClassroomGrid.tsx       # tarjetas de aulas + CRUD + filtros
        ├── ClassroomDetailPage.tsx # wrapper de /aulas/[id]
        ├── TimetableGrid.tsx       # matriz 9 turnos × 6 días (núcleo)
        ├── ReservationModal.tsx    # crear/editar/eliminar bloque
        ├── AnnotationPanel.tsx     # bitácora de anotaciones
        ├── MaintenancePage.tsx     # wrapper de /mantenimiento
        ├── MaintenancePanel.tsx    # reportes + cambio de estado
        ├── UsersPage.tsx           # wrapper de /usuarios (solo ENCARGADO)
        ├── UsersTable.tsx          # CRUD usuarios
        ├── SemestersPage.tsx       # wrapper de /semestres (solo ENCARGADO)
        └── SemestersPanel.tsx      # CRUD + activación de semestre
```

## 6. Capa `src/lib/`

### `types.ts`

Replica **exactamente** los tipos de `api/src/types/` (PLAN.md §8.2): `User`, `Classroom`, `TimeSlot`, `Semester`, `Schedule`, `Annotation`, `MaintenanceLog`, `StatsOverview`, `AuthResponse`. Los enums son uniones de literales:

```ts
export type UserRole = "ENCARGADO" | "AYUDANTE";
export type ScheduleType = "CLASE" | "ACTIVIDAD" | "MANTENIMIENTO";
```

**Regla**: al cambiar un tipo en la API, sincronizarlo aquí (mismos nombres y campos).

### `session.ts`

Maneja la sesión en `localStorage` bajo la key `labmanage_session` (`{ token, user }`). Expone `getSession`, `setSession`, `clearSession`. Todas las funciones son seguras en SSR (guardan `typeof window === "undefined"`).

### `api.ts`

- `api` = instancia axios con `baseURL: import.meta.env.PUBLIC_API_URL`.
- **Interceptor de request**: si hay sesión, inyecta `Authorization: Bearer <token>`.
- **Interceptor de response**:
  - Si `401` (y no es `/auth/login`): limpia la sesión y redirige a `/login` (solo si hay sesión previa).
  - Cualquier error se rechaza con el payload tipado `ApiErrorPayload` (`{ code, message, details? }`) de la API; si la API no devuelve ese formato, se usa `INTERNAL_ERROR`.
- `apiErrorToMessage(err): string`: traduce el `code` a un mensaje en español usando `ERROR_MESSAGES` (PLAN.md §9.5). En `VALIDATION_ERROR` agrega los `details` separados por " · ".

### `constants.ts`

- `DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]` (índice 0 → `dayOfWeek` 1).
- `CELL_STATUS_COLORS` / `CELL_STATUS_LABELS`: clases Tailwind y textos por estado de celda (`LIBRE`, `OCUPADA`, `MANTENIMIENTO`).
- `SCHEDULE_TYPE_LABELS`, `MAINTENANCE_STATUS_LABELS`, `MAINTENANCE_STATUS_COLORS`, `CLASSROOM_TYPE_LABELS`, `CLASSROOM_TYPES`, `USER_ROLE_LABELS`, `USER_ROLES`.
- `ERROR_MESSAGES`: mapeo de códigos de error de la API a mensajes en español.

### `permissions.ts`

Helpers de permisos para la UI (la API **refuerza** estas reglas):

- `isEncargado(user)` → `user.role === "ENCARGADO"`.
- `canModifySchedule(user, schedule)` → true si ENCARGADO, o si es el autor **y** el schedule no es `MANTENIMIENTO` (mantenimiento solo encargado).
- `canModifyAnnotation(user, annotationUserId)` → true si ENCARGADO o es el autor.

### `auth.tsx`

- `AuthProvider`: lee la sesión inicial de `localStorage` (vía `getSession`) y expone `{ user, token, login, logout }`.
- `useAuth()`: hook de acceso al contexto (lanza error fuera del provider).
- `RequireAuth`: si no hay token, redirige a `/login` (no renderiza el contenido).
- `RequireRole role="ENCARGADO"`: si el rol no coincide, renderiza la pantalla "Sin permisos" con enlace "Volver al inicio".

## 7. Rutas, islands y endpoints

| Ruta | Página `.astro` | Island | Endpoints consumidos | Rol |
|------|-----------------|--------|----------------------|-----|
| `/login` | `login.astro` | `LoginForm` | `POST /auth/login` | Público |
| `/` | `index.astro` | `DashboardPage` → `StatsDashboard` | `GET /stats/overview` | Autenticado |
| `/aulas` | `aulas/index.astro` | `ClassroomsPage` → `ClassroomGrid` | `GET /classrooms` (+`includeInactive`), `POST`/`PATCH`/`DELETE /classrooms` | Autenticado; CRUD solo ENCARGADO |
| `/aulas/[id]` | `aulas/[id].astro` | `ClassroomDetailPage` → `TimetableGrid` + `AnnotationPanel` + `ReservationModal` | `GET /classrooms`, `GET /semesters`, `GET /time-slots`, `GET/POST/PATCH/DELETE /schedules`, `GET/POST/DELETE /annotations` | Autenticado |
| `/mantenimiento` | `mantenimiento.astro` | `MaintenancePage` → `MaintenancePanel` | `GET/POST /maintenance`, `PATCH/DELETE /maintenance/:id`, `GET /classrooms` | Autenticado; cambio de estado/eliminar solo ENCARGADO |
| `/usuarios` | `usuarios.astro` | `UsersPage` → `UsersTable` | `GET/POST /users`, `PATCH/DELETE /users/:id` | ENCARGADO |
| `/semestres` | `semestres.astro` | `SemestersPage` → `SemestersPanel` | `GET/POST /semesters`, `PATCH /semesters/:id`, `POST /semesters/:id/activate` | ENCARGADO |

## 8. Patrón de datos con TanStack Query

### Claves de query usadas

| Clave | Datos |
|-------|-------|
| `["timeSlots"]` | Turnos (compartida por `TimetableGrid` y `ReservationModal`) |
| `["schedules", classroomId, semesterId]` | Bloques del grid |
| `["stats"]` | KPIs del dashboard |
| `["classrooms"]` | Aulas |
| `["annotations", classroomId]` | Bitácora por aula |
| `["maintenance"]` | Reportes de mantenimiento |
| `["users"]` | Usuarios |
| `["semesters"]` | Semestres |

### Invalidación

Tras cada mutación exitosa se invalidan las claves afectadas para refrescar la UI:

- `TimetableGrid.handleMutated` → invalida `schedules` y `stats`.
- `ClassroomGrid.invalidate` → `classrooms` y `stats`.
- `AnnotationPanel.invalidate` → `annotations`.
- `MaintenancePanel.invalidate` → `maintenance` y `stats`.
- `SemestersPanel.invalidate` → `semesters` y `stats`.

`QueryClient` global (en `AppProviders`): `retry: 1`, `refetchOnWindowFocus: false`.

### Estados de UI por consulta

Patrón repetido en todos los paneles: `isLoading` → skeleton o "Cargando..."; `isError` → caja roja con `apiErrorToMessage(error)` + botón "Reintentar" (`refetch`); vacío → mensaje descriptivo.

## 9. Flujo de autenticación

1. `LoginForm` hace `POST /auth/login` con email+contraseña.
2. Con la respuesta `AuthResponse` (`{ token, user }`) llama `login(token, user)` del `AuthProvider`.
3. `AuthProvider` persiste en `localStorage` (key `labmanage_session`) y actualiza el estado.
4. Cada request del `api` axios inyecta `Authorization: Bearer <token>`.
5. Si la API responde `401` (token expirado/inválido) y no es el login, el interceptor limpia la sesión y redirige a `/login`.
6. `logout()` limpia la sesión y navega a `/login` (botón "Salir" en `Navbar`).

## 10. Matriz de permisos (UI)

| Acción | ENCARGADO | AYUDANTE |
|--------|-----------|----------|
| Ver dashboard, aulas, horarios, anotaciones, mantenimiento | Sí | Sí |
| Crear/editar/eliminar aula | Sí | No (botones ocultos) |
| Crear/editar/eliminar bloque `CLASE`/`ACTIVIDAD` | Sí (cualquiera) | Sí (solo los suyos) |
| Crear/editar/eliminar bloque `MANTENIMIENTO` | Sí | No (opción oculta en el modal; la API responde 403) |
| Ver/crear anotaciones | Sí | Sí |
| Eliminar anotación | Sí (cualquiera) | Solo las suyas |
| Crear reporte de mantenimiento | Sí | Sí |
| Cambiar estado / eliminar reporte de mantenimiento | Sí | No (controles ocultos) |
| CRUD usuarios | Sí | No (`RequireRole`) |
| CRUD + activar semestres | Sí | No (`RequireRole`) |

La API **refuerza** todas estas reglas (permisos de autor, `MANTENIMIENTO` solo encargado, etc.). La UI solo las refleja ocultando/mostrando controles.

## 11. El núcleo: `TimetableGrid`

1. Carga `["timeSlots"]` y `["schedules", classroomId, semesterId]`.
2. Construye una tabla de 9 filas (turnos, ordenados por `order`) × 6 columnas (`DAYS`). El header de fila muestra `label` y `startTime - endTime`.
3. Estado de celda derivado (regla de negocio PLAN.md §7.2):
   - sin schedule → `LIBRE` (verde)
   - schedule `MANTENIMIENTO` → `MANTENIMIENTO` (ámbar)
   - schedule `CLASE`/`ACTIVIDAD` → `OCUPADA` (rojo)
4. Tooltip (`title`) con tipo, título, docente, nota y autor.
5. Click en celda libre → `ReservationModal` con `cell` (crear). Click en celda ocupada → modal con `schedule` (detalle/editar/eliminar).
6. `ReservationModal` decide permisos con `canModifySchedule`; el tipo `MANTENIMIENTO` solo aparece si `isEncargado`.
7. Mutaciones con `useMutation` → `POST`/`PATCH`/`DELETE /schedules/:id` → invalidar `schedules` y `stats`.

> Nota: el detalle de aula (`/aulas/[id]`) obtiene el semestre activo de `["semesters"]` y solo renderiza el grid si existe; si no, muestra el aviso "No hay un semestre activo".

## 12. Cómo extender el proyecto

### Nueva página

1. Crear el panel: `src/islands/MiPanel.tsx` (usa `useQuery`/`useMutation` con `api`).
2. Crear el wrapper: `src/islands/MiPagina.tsx` con `AppProviders` → `RequireAuth` → `Navbar` → `<main>` + panel (mira `DashboardPage.tsx` como plantilla).
3. Crear la ruta `src/pages/mi-ruta.astro`:
   ```astro
   ---
   import Layout from "../layouts/Layout.astro";
   import MiPagina from "../islands/MiPagina.tsx";
   ---
   <Layout title="Mi ruta | LABMANAGE">
     <MiPagina client:only="react" />
   </Layout>
   ```
4. Si es solo para ENCARGADO, envuelve el contenido con `RequireRole role="ENCARGADO"` (ver `UsersPage.tsx`) y agrega el enlace en `Navbar` (`ADMIN_LINKS`).

### Nueva sección solo-encargado en un panel

Usa `isEncargado(user)` para condicionar la renderización de botones/controles (patrón en `ClassroomGrid`, `MaintenancePanel`, `UsersTable`).

### Nuevo endpoint de la API

1. Agrega el tipo en `src/lib/types.ts` (reflejo de `api/src/types/`).
2. Consúltalo con `api.get<...>("/ruta")` dentro de un `useQuery`, o muta con `api.post/patch/delete`.
3. Agrega el `code` de error nuevo (si existe) a `ERROR_MESSAGES` en `constants.ts`.
4. Define una query key y agrega su invalidación donde corresponda.

## 13. Despliegue

- `npm run build` genera el build en `dist/`. Como `astro.config.mjs` usa `output: "server"` con el adapter `@astrojs/node` en modo `standalone`, el resultado es una **aplicación Node** (no estático): se sirve con el entrypoint generado en `dist/server/entry.mjs` (o `npm run preview` en local).
- Configurar `PUBLIC_API_URL` en el entorno de producción apuntando a la URL de la API desplegada (debe ser accesible desde el navegador; CORS está restringido al origen de la web en la API).
- Para despliegue estático se debería cambiar `output: "server"` → `"static"` y quitar el adapter Node (los islands con `client:only` funcionan igual; toda la data se carga en el cliente).

## 14. Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PUBLIC_API_URL` | Sí | URL base de la API, ej. `http://localhost:3001/api` |

Ver `.env.example`. No se usan más variables: no hay secretos en el frontend (la autenticación se hace con el token JWT que la API emite).