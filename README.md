# LABMANAGE — Frontend Web (`labmanage-web`)

Frontend **web** del sistema de gestión de aulas/laboratorios LABMANAGE. Es una aplicación 100% web: corre en el navegador (HTML/CSS/JS servidos por Astro) y consume la API REST de `labmanage-api`. No hay nada nativo ni instalable.

La interfaz usa el paradigma clásico **WIMP** (*Windows, Icons, Menus, Pointer*): un "escritorio" dentro del navegador con ventanas flotantes arrastrables, íconos, barra de tareas y menú Inicio. Todo eso es solo UI renderizada con React; la carpeta `src/desktop/` debe su nombre únicamente a esa metáfora visual.

> **Fuente de verdad del backend**: `READMIAPI.md` (contrato de endpoints, tipos y errores). `INTERFAZMINIMA.md` describe la especificación de pantallas. Este README documenta cómo está construido este frontend.

---

## Índice

1. [Stack](#1-stack)
2. [Requisitos, setup y comandos](#2-requisitos-setup-y-comandos)
3. [Arquitectura general](#3-arquitectura-general)
4. [Rutas](#4-rutas)
5. [Sesión y autenticación](#5-sesión-y-autenticación)
6. [Capa de API (`src/lib/api.ts`)](#6-capa-de-api-srclibapits)
7. [Tipos (`src/lib/types.ts`)](#7-tipos-srclibtypests)
8. [Errores (`src/lib/errors.ts`)](#8-errores-srcliberrorsts)
9. [Constantes y formato (`constants.ts`, `format.ts`, `validation.ts`, `permissions.ts`)](#9-constantes-y-formato)
10. [Capa de datos (`src/lib/queries/`)](#10-capa-de-datos-srclibqueries)
11. [Proveedores globales (providers stack)](#11-proveedores-globales)
12. [Sistema de ventanas (`src/desktop/system/`)](#12-sistema-de-ventanas)
13. [Kit de UI reutilizable (`src/desktop/ui/`)](#13-kit-de-ui-reutilizable)
14. [Componentes compartidos (`src/desktop/shared/`)](#14-componentes-compartidos)
15. [Registro de módulos (`registry.tsx`)](#15-registro-de-módulos-registrytsx)
16. [Módulos funcionales (`src/desktop/modules/`)](#16-módulos-funcionales)
17. [Matriz de permisos en la UI](#17-matriz-de-permisos-en-la-ui)
18. [Sistema de estilos (`global.css`)](#18-sistema-de-estilos-globalcss)
19. [Guía de debugging](#19-guía-de-debugging)
20. [Cómo extender el proyecto](#20-cómo-extender-el-proyecto)
21. [Despliegue y variables de entorno](#21-despliegue-y-variables-de-entorno)
22. [Funcionalidades pendientes (deferred)](#22-funcionalidades-pendientes)

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 7 — `output: "server"` + adapter `@astrojs/node` modo `standalone` |
| UI | React 19 montado como islands con `client:only="react"` |
| Estilos | Tailwind CSS 4 vía plugin Vite `@tailwindcss/vite` |
| Datos | TanStack Query v5 + axios |
| Iconos | lucide-react |
| Lenguaje | TypeScript estricto (`astro/tsconfigs/strict`) |
| Runtime | Node.js ≥ 22.12 |

**Decisión clave**: todas las islas usan `client:only="react"`, o sea que el servidor NO prerenderiza React; envía HTML casi vacío + un fallback visual, y todo el árbol se monta en el navegador. Toda la lógica de datos vive en el cliente.

## 2. Requisitos, setup y comandos

```sh
# 1. Node.js ≥ 22.12
node -v

# 2. Instalar dependencias
npm install

# 3. Configurar .env (ver §21)
PUBLIC_API_URL="http://localhost:3001/api"

# 4. Levantar la API en el puerto configurado ANTES de usar la app
```

| Comando | Acción |
|---------|--------|
| `npm run dev` | Dev server en `http://localhost:4321` |
| `astro dev --background` | Dev server en segundo plano (`astro dev status/logs/stop`) |
| `npm run build` | Genera el build en `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run check` | Chequeo de tipos completo (`astro check`) |

**Regla de oro antes de commit**: `npm run check` debe dar `0 errors` y `npm run build` debe terminar en `Complete!`.

## 3. Arquitectura general

```
Navegador
 └─ Astro page (.astro)  ← shell mínimo, solo <head>/<body> + fallback
     └─ Island React (client:only="react")   ← TODO el comportamiento
         └─ Providers (Query → Toast → Dialog → Auth → WindowManager)
             └─ Shell: DesktopIcons + ventanas flotantes + Taskbar
                 └─ Módulos (cada ventana monta un módulo del registry)
                     └─ TanStack Query hooks ──axios──► labmanage-api :3001
                                                          └── Prisma ──► PostgreSQL/Neon
```

Puntos importantes:

- Astro **no conoce** la sesión ni hace fetch: es solo el contenedor HTML.
- La sesión vive en `localStorage`; el gate de `/escritorio` se evalúa en el cliente.
- Cada módulo se abre como "ventana"; las ventanas son componentes React normales posicionados absolutamente sobre el escritorio.
- El estado de servidor lo maneja exclusivamente TanStack Query; los módulos nunca guardan copias locales de listados (solo estado de formulario/filtros).
- Los módulos se fusionaron para reducir fragmentación: un solo módulo puede contener múltiples vistas (tabs) que antes eran ventanas separadas.

## 4. Rutas

Solo existen **4 rutas**, todas en `src/pages/`:

| Ruta | Archivo | Island montado | Descripción |
|------|---------|----------------|-------------|
| `/` | `index.astro` | `screens/LoginScreen.tsx` | Login. Si ya hay sesión válida en localStorage, redirige a `/escritorio`. |
| `/login` | `login.astro` | `screens/LoginScreen.tsx` | Igual que `/` (alias). |
| `/escritorio` | `escritorio.astro` | `desktop/DesktopApp.tsx` | Aplicación completa (escritorio WIMP). Sin sesión → redirige a `/`. |
| `/acceso-denegado` | `acceso-denegado.astro` | `screens/AccessDeniedScreen.tsx` | Pantalla informativa con botón "Volver al inicio". |

Cada página pasa un `<div slot="fallback">` que se muestra mientras carga el JS de la isla ("Cargando LABMANAGE…", spinner "Iniciando escritorio…", etc.).

## 5. Sesión y autenticación

Archivo: `src/lib/session.ts`

- Key de localStorage: **`labmanage.session`**
- Payload: `{ token: string, user: User }`
- Funciones (todas SSR-safe con guard `typeof window === "undefined"`):
  - `getSession(): Session | null` — parsea y valida estructura mínima.
  - `setSession(payload: AuthPayload)` — guarda token+user tras el login.
  - `updateUserInSession(user)` — reemplaza solo el user (perfil editado).
  - `clearSession()`
  - `redirectToLogin()` → `window.location.replace("/")`
  - `redirectToDesktop()` → `window.location.replace("/escritorio")`

Flujo:

1. `LoginForm` → `POST /auth/login` → respuesta `{ token, user }`.
2. `setSession(...)` persiste en localStorage → `redirectToDesktop()`.
3. `DesktopApp` lee la sesión con `useState(() => getSession())`; si es `null` redirige a `/`.
4. El token NO se revalida contra el servidor al montar: la validación real ocurre en el primer request (un `401` dispara el interceptor que limpia y saca al usuario). `useMeQuery` existe en `queries/auth.ts` para futuras validaciones de perfil pero hoy no se usa en el arranque.
5. Cada request axios inyecta `Authorization: Bearer <token>` (ver §6).
6. Un `401` fuera del login → `clearSession()` + redirect a `/`.
7. Logout (Taskbar/StartMenu): `clearSession()` + redirect a `/`.

## 6. Capa de API (`src/lib/api.ts`)

```ts
export const http = axios.create({ baseURL: PUBLIC_API_URL ?? "http://localhost:3001/api", timeout: 25000 });
```

- **Request interceptor**: inyecta `Authorization: Bearer <token>` si hay sesión.
- **Response interceptor** (manejo de errores):
  - `401` en cualquier endpoint excepto `/auth/login` → `clearSession()`; si había sesión, `window.location.replace("/")`.
  - Normaliza TODO error a `ApiErrorPayload { code, message }`:
    - Si la API mandó body `{ error: {...} }` → usa ese payload tal cual.
    - Sin response (API caída / timeout) → `{ code: "NETWORK_ERROR", message: "No hay conexión con el servidor de la API." }`
    - Con response sin formato esperado → `{ code: "INTERNAL_ERROR" }`.
  - Rechaza la promesa con ese objeto plano (los módulos llaman `apiErrorToMessage(err)`).
- Helpers de unwrap (la API envuelve siempre en `data`):
  - `unwrap<T>(promise)` → devuelve `T` de respuestas `{ data: T }`.
  - `unwrapPage<T>(promise)` → devuelve `Paginated<T>` completo (`{ data, meta }`).
  - `PageParams { page?, pageSize? }`.

## 7. Tipos (`src/lib/types.ts`)

Refleja **exactamente** el contrato de `READMIAPI.md` §tipos. Al cambiar la API, sincronizar aquí primero. Principales:

- **Enums** (uniones de literales):
  - `UserRole = "ENCARGADO" | "AYUDANTE"`
  - `ClassroomType = "LAB_COMPUTACION" | "LAB_GENERAL" | "AULA"`
  - `ClassroomStatus = "ACTIVA" | "INACTIVA" | "EN_MANTENIMIENTO" | "FUERA_SERVICIO"`
  - `ReservationType = "RECURRENTE" | "PUNTUAL"`
  - `ReservationStatus = "PENDIENTE" | "CONFIRMADA" | "CANCELADA"`
  - `MaintenanceStatus = "REPORTADO" | "EN_PROGRESO" | "COMPLETADO"`
  - `ClassroomAvailabilityState = "LIBRE" | "OCUPADA" | "MANTENIMIENTO"`
- **Entidades**: `User`, `Teacher`, `Subject`, `Classroom`, `TimeSlot`, `Semester`, `Schedule`, `Reservation`, `Annotation`, `MaintenanceLog`.
- **Refs livianas**: `NamedRef { id, name }`, `CatalogRef { id, code, name }` (las respuestas anidan refs, no objetos completos).
- **Estado puntual**: `ClassroomStateResult { classroomId, classroom, date, dayOfWeek, timeSlotId, state, reason?, occupiedBy? }` donde `occupiedBy` es `{ kind:"SCHEDULE", schedule } | { kind:"RESERVATION", reservation }`.
- **Grilla**: `AvailabilityGrid { semester{workingDays,...}, timeSlots[], classrooms[{ classroom, maintenance[], cells[] }] }` y `AvailabilityGridCell { dayOfWeek, timeSlotId, entry: null | {kind:"SCHEDULE"...} | {kind:"RESERVATION"...} }`.
- **Stats**: `StatsOverview { totalClassrooms, classroomsByType[], activeSemester, occupancyByClassroom[], ... }`.
- **Paginación**: `Paginated<T> = { data: T[]; meta: { page, pageSize, total, totalPages } }`.
- **Auth**: `AuthPayload { token, user }`; errores: `ApiErrorDetail`, `ApiErrorPayload`.

Convenciones de la API que afectan al frontend:

- `dayOfWeek`: `1=Lunes … 6=Sábado` (nunca 0 ni 7).
- Fechas en `"YYYY-MM-DD"`, horas en `"HH:mm:ss"`.
- Endpoints paginados: `GET /users`, `/subjects`, `/teachers`, `/classrooms`, `/semesters`, `/reservations`, `/annotations`, `/maintenance`. No paginados: `/time-slots`, `/schedules`.

## 8. Errores (`src/lib/errors.ts`)

- `ERROR_MESSAGES`: catálogo completo código→mensaje en español. Códigos cubiertos:

  `VALIDATION_ERROR, CANNOT_DELETE_SELF, CURRENT_PASSWORD_INVALID, INACTIVE_CATALOG_ITEM, NON_WORKING_DAY, DATE_OUTSIDE_SEMESTER, AUTH_INVALID_CREDENTIALS, TOKEN_INVALID, TOKEN_EXPIRED, USER_INACTIVE, FORBIDDEN, NOT_FOUND, RESERVATION_CONFLICT, TEACHER_CONFLICT, CLASSROOM_UNAVAILABLE, INVALID_RESERVATION_TRANSITION, RESERVATION_NOT_EDITABLE, EMAIL_IN_USE, CLASSROOM_CODE_IN_USE, SUBJECT_CODE_IN_USE, TEACHER_CODE_IN_USE, TEACHER_EMAIL_IN_USE, TIME_SLOT_ORDER_IN_USE, SEMESTER_HAS_DEPENDENCIES, SEMESTER_ACTIVE, TIME_SLOT_IN_USE, USER_HAS_DEPENDENCIES, CONFLICT, RATE_LIMIT_EXCEEDED, SERVICE_UNAVAILABLE, INTERNAL_ERROR` (+ `NETWORK_ERROR` generado localmente).

- `apiErrorToMessage(err)`: extrae `err.code/message` (acepta el payload plano del interceptor o un AxiosError crudo); para `VALIDATION_ERROR` agrega los `details` separados por `" · "`; cae en `INTERNAL_ERROR` si no reconoce el shape.
- `reservationErrorToMessage(err)`: wrapper específico para operaciones de reserva, con mensajes más descriptivos para `RESERVATION_CONFLICT`, `INVALID_RESERVATION_TRANSITION`, `RESERVATION_NOT_EDITABLE` y `DATE_OUTSIDE_SEMESTER`.
- `isApiError(x)`: type-guard.

**Patrón de uso en módulos**: `catch (err) { toast.error(apiErrorToMessage(err)) }` (o `reservationErrorToMessage` en flujos de reserva). Nunca mostrar `err.message` crudo sin pasar por esta función.

## 9. Constantes y formato

### `src/lib/constants.ts`

- `APP_NAME` = "LABMANAGE".
- `DAY_NAMES` (1→Lunes … 6→Sábado), `DAY_SHORT` (Lun…Sáb), `WORKING_DAYS_ALL = [1..6]`.
- Maps label/tone para badges: `ROLE_LABELS`, `CLASSROOM_TYPE_LABELS`, `CLASSROOM_STATUS_LABELS/_TONES`, `RESERVATION_TYPE_LABELS`, `RESERVATION_STATUS_LABELS/_TONES`, `MAINTENANCE_STATUS_LABELS/_TONES`.
- `AVAILABILITY_STATE_META`: por cada estado (`LIBRE/OCUPADA/MANTENIMIENTO`) da `label`, `description` y color, usado en la vista inline de estado del aula dentro de la Tabla Semanal.
- Tipo `Tone = "success"|"warning"|"danger"|"info"|"neutral"`.

### `src/lib/format.ts`

- `todayISO()` — fecha local de hoy en `YYYY-MM-DD` (sin UTC-shift).
- `fmtDate(iso)` / `fmtDateTime(iso)` — formato `es-ES`.
- `slotRange(slot)` — `"HH:mm–HH:mm"`; `slotLabel(slot)` — `"Bloque N"`.
- `weekdayOfISO(dateISO)` — mapea fecha ISO a día 1–6.
- `sortByDayAndSlot` — ordena schedules por día y orden de turno.

### `src/lib/validation.ts`

Validaciones de formulario puras (devuelven `string | null`):

`requiredText(v)`, `emailValid(v)`, `emailError(v)`, `minLengthError(v,min)`, `parseCapacity(v)`, `capacityError(v)`, `dateOrderError(a,b)`, `timeOrderError(a,b)`, `firstError({...})`.

### `src/lib/permissions.ts`

- `isEncargado(role)`
- `canAccess(role, roles[])` — ¿el rol puede ver el módulo?

Las reglas de negocio las refuerza la API; la UI solo oculta controles (ver §17).

## 10. Capa de datos (`src/lib/queries/`)

Un archivo por recurso. Patrón uniforme en todos:

```ts
export async function fetchX(params): Promise<Paginated<X>> { return unwrapPage(http.get("/x", { params })); }
export async function createX(input): Promise<X>            { return unwrap(http.post<{data:X}>("/x", input)); }
// update (PATCH) / remove (DELETE) ...
export function useXQuery(params)        { return useQuery({ queryKey: [...], queryFn, placeholderData: prev => prev }); }
export function useXMutations()          { const invalidate = useInvalidateXGraph(); return { create, update, remove }; }
```

Archivos y claves de query:

| Archivo | Recurso/endpoints | Query keys | Invalidación tras mutación |
|---------|-------------------|-----------|----------------------------|
| `auth.ts` | `/auth/login`, `/auth/me`, PATCH perfil/password | `["me"]` | — (usa `updateUserInSession`) |
| `users.ts` | CRUD `/users` | `["users", params]` | `users`, `stats` |
| `subjects.ts` | CRUD `/subjects` | `["subjects", params]` | `subjects`, `availability-grid` |
| `teachers.ts` | CRUD `/teachers` | `["teachers", params]` | `teachers`, `availability-grid` |
| `timeSlots.ts` | CRUD `/time-slots` (no paginado) | `["time-slots"]` | `time-slots`, `availability-grid` |
| `classrooms.ts` | CRUD `/classrooms`; `GET /classrooms/:id/state` | `["classrooms", params]`, `["classrooms","pick"]`, `["classroom-state", id, q]` | `classrooms`, `classroom-state`, `availability-grid`, `stats` |
| `semesters.ts` | CRUD `/semesters` + `POST /:id/activate` | `["semesters", params]` (+ activo derivado) | `semesters`, `availability-grid`, `stats`, `schedules` |
| `schedules.ts` | CRUD `/schedules` (filtra por `classroomId`+`semesterId`, no paginado) | `["schedules", params]` | `schedules`, `availability-grid`, `classroom-state`, `stats` |
| `reservations.ts` | CRUD `/reservations` + `PATCH /:id/status` | `["reservations", filters]` | `reservations`, `availability-grid`, `classroom-state`, `stats` |
| `annotations.ts` | CRUD `/annotations` | `["annotations", params]` | `annotations` |
| `maintenance.ts` | CRUD `/maintenance` + cambio estado | `["maintenance", params]` | `maintenance`, `classrooms`, `classroom-state`, `availability-grid`, `stats` |
| `dashboard.ts` | `GET /stats/overview`, `GET /availability/grid` | `["stats"]`, `["availability-grid", params]` | — |

Hooks especiales:

- `useActiveSemester()` — deriva el semestre activo del listado.
- `useClassroomListForPick(enabled=true)` — lista chica (`pageSize:200`, `staleTime 60s`) para selects de aulas.
- `useTimeSlotsQuery(enabled)` — `staleTime 10 min` (catálogo estable).
- `useAvailabilityGridQuery(params | null)` — `null` deshabilita la query (patrón usado cuando faltan selects).
- `useInvalidateReservationGraph()` exportado para flujos combinados.

Convención: **toda mutación exitosa invalida por familia** (el prefijo basta: invalidar `["classrooms"]` pega a `["classrooms","pick"]` también). Si agregás un recurso nuevo que afecte la grilla, sumá `availability-grid`, `classroom-state` y `stats` a su invalidación.

## 11. Proveedores globales

### `src/providers/QueryProvider.tsx`

Crea UN `QueryClient` por island (con `useRef`, no por render):

```ts
defaultOptions: {
  queries:  { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
  mutations:{ retry: false },
}
```

> **Lección aprendida (bug histórico)**: sin este provider, TanStack lanza *"No QueryClient set"* en el primer render, React desmonta el árbol completo y queda una **pantalla blanca** sin llamadas a la API. Cualquier isla nueva DEBE estar envuelta en `<QueryProvider>`.

### Stack completo en `DesktopApp` (de afuera hacia adentro)

1. `QueryProvider` — cliente de TanStack.
2. `ToastProvider` (`system/ToastProvider.tsx`) — `useToast()` → `{ push, success, error, warning, info }`. Renderiza toasts apilados abajo a la derecha; autocierre a los **4200 ms** (6500 ms para `error`).
3. `DialogProvider` (`system/DialogHost.tsx`) — `const ok = await confirm({ title, message, confirmText?, danger? }): Promise<boolean>`. Diálogo modal promisificado.
4. `AuthProvider user={session.user}` — `useAuth()` → `{ user, logout }`. `logout` = clear session + redirect `/`.
5. `WindowManagerProvider getDefaults={getModuleDefaults}` — motor de ventanas (§12).

`LoginScreen` solo necesita `QueryProvider` (no usa toast/diálogo/ventanas).

## 12. Sistema de ventanas (`src/desktop/system/`)

### `windowTypes.ts`

- Constantes: `TASKBAR_HEIGHT = 48`, `WINDOW_MIN_WIDTH = 380`, `WINDOW_MIN_HEIGHT = 260`.
- `Rect { x, y, width, height }`, `WindowInstance { id, moduleId, title, x, y, width, height, z, minimized, maximized, restoreRect, params }`.
- `computeResize(dir, startRect, dx, dy)` — matemática de resize por dirección (n/s/e/w/ne/nw/se/sw) respetando mínimos.

### `WindowManager.tsx` — el motor

Hook público: `useWindowManager()` →

```ts
{
  windows: WindowInstance[],
  focusedId: string | null,          // ventana visible con mayor z
  openWindow(moduleId, params?),     // singleton por moduleId
  closeWindow(id),
  focusWindow(id),
  minimizeWindow(id),
  toggleMaximize(id),
  updateRect(id, partialRect),
}
```

Comportamientos clave:

- **Ventanas singleton por `moduleId`**: abrir un módulo ya existente lo trae al frente (y opcionalmente actualiza sus `params`). No hay duplicados.
- Posición inicial en cascada: `48+step / 28+step` con `step = (secuencial % 8) * 26px`.
- En viewport `< 768px` las ventanas abren directamente **maximizadas**.
- Los tamaños se clampean al viewport disponible (`innerWidth - 24`, `innerHeight - TASKBAR_HEIGHT - 24`).
- El z-index máximo se recalcula en cada focus/open.
- `params` es `Record<string, unknown>` libre; los módulos leen lo que necesitan (p.ej. `{ classroomId, dayOfWeek, timeSlotId }` desde la Tabla Semanal → Nueva Reserva).

### `WindowFrame.tsx`

Chrome de cada ventana: barra de título (icono + título + botones minimizar/maximizar/cerrar), cuerpo, 8 manijas de resize.

- **Drag**: pointer events sobre el titlebar (guarda offset, escucha `pointermove/up` en `window`, clampea dentro del área del escritorio).
- **Resize**: manijas absolutas de 8 direcciones usando `computeResize`.
- **Doble clic** en titlebar ↔ maximizar/restaurar.
- Ventana enfocada: titlebar activa (clase `wimp-titlebar-active`), clic en cualquier parte hace `focusWindow`.

### `Taskbar.tsx` + `StartMenu.tsx`

Barra inferior fija (`height: TASKBAR_HEIGHT`):

- Botón Inicio (grilla) que abre/cierra `StartMenu`.
- Botones por ventana abierta (clic = foco/restaurar; indicador activo según `focusedId`).
- Reloj (`toLocaleTimeString("es-ES")`, refresh cada 30 s).
- Usuario + rol + botón logout.
- `StartMenu`: módulos permitidos para el rol agrupados por `def.group` (Panel / Operación / Catálogos / Administración), footer con usuario y "Cerrar sesión".

### `DesktopIcons.tsx`

Íconos de escritorio (columna izquierda, wrap vertical):

- Filtrado: `modulesForRole(role)` + `showOnDesktop === true`.
- Orden: definido por `DESKTOP_ICON_ORDER_ENC` / `DESKTOP_ICON_ORDER_AYU` en `registry.tsx`.
- Interacción: **un clic selecciona**, **doble clic (o Enter)** abre la ventana. Tooltip con título+descripción.

### `moduleTypes.ts`

```ts
export interface ModuleProps { params: Record<string, unknown>; winId: string }
```

Todo componente de módulo recibe estas props.

## 13. Kit de UI reutilizable (`src/desktop/ui/`)

Componentes presentes en TODAS las ventanas; ante dudas mirar estos primero:

| Componente | Props principales | Notas |
|------------|-------------------|-------|
| `Badge.tsx` | `tone: Tone`, `dot?: boolean` | Chip de estado. Tonos definidos en constants. |
| `Field.tsx` | `label`, `required?`, `hint?`, `error?: string \| null` | Wrapper de campo con label/hint/error. Exporta también `TextInput`, `TextArea`, `SelectInput({ options, placeholder, ...selectProps })`. `SelectInput` NO acepta `hint` — el hint va en el `Field`. |
| `States.tsx` | — | `LoadingBlock({label})`, `EmptyBlock({message, icon?})`, `ErrorBlock({message, onRetry})`. Usar SIEMPRE estos tres estados en queries. |
| `Modal.tsx` | `open, onClose, title, footer?, widthClass?` | Modal genérico con overlay; cierra con Escape/backdrop. |
| `DataTable.tsx` | `columns: Column<T>[]`, `data`, `rowKey`, `loading`, `error`, `onRetry`, `emptyIcon`, `emptyMessage` | Tabla genérica. `Column<T> = { key, header, render?(row), headerClass?, cellClass? }`. Maneja internamente loading/error/empty. |
| `Pagination.tsx` | `page`, `totalPages`, `total`, `onPage` | Controles ‹ › + "N registros". Solo renderiza si hay >1 página (lo decide el caller). |

Clases utilitarias que consumen (`btn btn-primary btn-sm`, `input-base`, `badge badge-success`, etc.) están en `global.css` (§18).

## 14. Componentes compartidos (`src/desktop/shared/`)

### `WeeklyGrid.tsx` — matriz semanal reutilizable

Props:

```ts
{
  workingDays: number[];                  // ej [1..6], viene del semestre
  timeSlots: TimeSlot[];                  // filas, ordenadas por `order`
  entries: Record<string, GridEntryVM>;   // mapa por celda
  onCellClick?: (key: string, entry: GridEntryVM | null) => void;
  banner?: ReactNode;
  legend?: boolean;
}
```

- Clave de celda: **`cellKey(dayOfWeek, slotId)` = `"${day}|${slotId}"`** (parser inverso: `parseCellKey`).
- `GridEntryVM { kind: "SCHEDULE"|"RESERVATION"|"BLOCKED", tone: "schedule"|"pending"|"confirmed"|"blocked", title, subtitle?, raw? }`.
- Builders incluidos: `vmFromSchedule(schedule)`, `vmFromGridEntry(entry)`, `buildEntriesFromClassroom(gridClassroom)` (arma el mapa completo desde `AvailabilityGrid`).
- Celdas libres muestran "Disponible" (verde) y son clicables si hay `onCellClick`; ocupadas muestran chip coloreado según tone (azul planilla / ámbar pendiente / rojo confirmada).
- `GridLegend` exporta la leyenda de colores.

Consumidor principal: `WeeklyScheduleModule` (entries desde `/schedules` en modo edición, o desde `/availability/grid` en modo vista).

### `useCurrentTimeSlot.ts`

`findCurrentSlot(slots)` compara hora actual vs `startTime/endTime` (con tolerancia ±5 min); `useCurrentTimeSlot(slots)` lo expone como hook. Se usa para preseleccionar el bloque actual en el panel inline de estado del aula (dentro de la Tabla Semanal) y en Nueva Reserva.

## 15. Registro de módulos (`registry.tsx`)

Único punto donde se declara qué existe, quién lo ve, dónde aparece y de qué tamaño es:

```ts
interface ModuleDef {
  id: string;                    // clave para openWindow()
  title: string; description: string;
  group: "Panel" | "Operación" | "Catálogos" | "Administración";
  icon: LucideIcon;
  roles: UserRole[];
  showOnDesktop: boolean;        // ¿aparece como ícono?
  width: number; height: number; // tamaño inicial de ventana
  component: ComponentType<ModuleProps>;
}
```

Helpers: `getModule(id)`, `modulesForRole(role)`, `getModuleDefaults(id)` (usada por WindowManagerProvider), `MODULES`.

Tabla completa de los **9 módulos**:

| id | Título | Grupo | Roles | Escritorio | Tamaño | Archivo |
|----|--------|-------|-------|-----------|--------|---------|
| `dashboard-admin` | Panel Encargado | Panel | ENC | ✅ | 860×600 | `modules/dashboard/DashboardAdmin.tsx` |
| `dashboard-op` | Panel operativo | Panel | AYU | ✅ | 780×560 | `modules/dashboard/DashboardOperativo.tsx` |
| `tabla-semanal` | Tabla Semanal | Operación | ambos | ✅ | 960×640 | `modules/tabla/WeeklyScheduleModule.tsx` |
| `nueva-reserva` | Nueva reserva | Operación | ambos | ❌ (se abre por flujo/botón) | 560×640 | `modules/ayudante/NewReservationModule.tsx` |
| `reservas` | Reservas y anotaciones | Operación | ambos | ✅ | 960×600 | `modules/reservas/ReservationsModule.tsx` |
| `usuarios` | Usuarios | Administración | ENC | ✅ | 900×580 | `modules/usuarios/UsersModule.tsx` |
| `aulas` | Aulas y mantenimientos | Administración | ENC | ✅ | 940×600 | `modules/aulas/ClassroomsModule.tsx` |
| `catalogos` | Catálogos | Catálogos | ENC | ✅ | 820×580 | `modules/catalogos/CatalogosModule.tsx` |
| `semestres` | Semestres | Administración | ENC | ✅ | 860×600 | `modules/semestres/SemestersModule.tsx` |

ENC = ENCARGADO, AYU = AYUDANTE.

**Módulos eliminados** (fusionados en los actuales):

| Módulo eliminado | Fusionado en |
|------------------|-------------|
| `MyReservationsModule` | `reservas` (tab "Mis Reservas" para AYUDANTE) |
| `SupervisionReservasModule` | `reservas` (vista directa para ENCARGADO) |
| `AnnotationsModule` | `reservas` (tab "Anotaciones" para AYUDANTE) |
| `SchedulesModule` (Planilla) | `tabla-semanal` (modo edición) |
| `WeeklyTableModule` (Tabla) | `tabla-semanal` (modo vista) |
| `ClassroomStateModule` (Estado) | `tabla-semanal` (panel inline al clickear celda) |
| `ReportsModule` | `dashboard-admin` (sección "Consultas y reportes" con tabs) |

## 16. Módulos funcionales

Detalles de comportamiento que NO se deducen del código a simple vista:

### Dashboards

- **DashboardAdmin** (ENC): KPIs clicables (aulas, reservas activas, mantenimientos, ocupación promedio) que abren su ventana correspondiente o navegan a la sección de reportes; barras de ocupación por aula (clic → abre Tabla Semanal preseleccionando el aula); accesos rápidos (Tabla semanal, Semestres, Catálogos); sección "Consultas y reportes" integrada con 4 tabs:
  - **Ocupación**: semestre activo, aulas por tipo, stats del sistema.
  - **Mantenimientos**: lista reutilizada de `MaintenanceList` (paginada, con cambio de estado).
  - **Reservas**: panel reutilizado de `ReservationsPanel` (filtros, paginación, CRUD).
  - **Anotaciones**: lista reutilizada de `AnnotationsList` (filtros, borrado).
- **DashboardOperativo** (AYU): calcula "aulas libres AHORA" cruzando `GET /availability/grid` con `useCurrentTimeSlot`; próximas reservas del usuario (hasta 5, ordenadas por cercanía); mantenimientos abiertos; acciones rápidas (nueva reserva, tabla semanal, mis reservas).

### Tabla Semanal (`WeeklyScheduleModule`, ambos roles)

Módulo unificado que reemplaza las tres ventanas anteriores (Tabla Semanal, Planilla Semestral y Estado del Aula):

**Modo vista** (default): selectores aula + semestre (default activo) → `GET /availability/grid`. Al hacer clic en una celda se abre un **panel lateral derecho** con el estado en tiempo real de esa celda (`GET /classrooms/:id/state`), mostrando:
- Tarjeta grande LIBRE / OCUPADA / MANTENIMIENTO con ícono y color.
- Detalle del motivo y "ocupado por" (bloque de planilla o reserva).
- Si está LIBRE: acción contextual según rol (AYUDANTE → "Reservar ahora" abre Nueva Reserva; ENCARGADO → "Asignar en planilla" activa modo edición prellenando esa celda).

**Modo edición** (solo ENCARGADO, botón toggle): cambia la fuente de datos a `GET /schedules` filtrado por aula+semestre. Clic en celda libre → modal para asignar bloque de planilla (materia requerida, docente opcional, nota). Clic en bloque existente → modal para editar o eliminar. Valida solapes en cliente; la API refuerza con `RESERVATION_CONFLICT` y `TEACHER_CONFLICT`.

Aviso visible cuando se edita un semestre no activo (útil para planificar el próximo).

### Nueva reserva (`NewReservationModule`)

- Tipo RECURRENTE (día de semana) o PUNTUAL (fecha, `min=hoy`).
- **Verificación obligatoria**: consulta `GET /classrooms/:id/state` con día|fecha + bloque; el botón "Registrar" solo se habilita si el resultado es LIBRE.
- Tras crear → toast éxito y la reserva queda PENDIENTE.
- Recibe `params` prefills desde Tabla Semanal: `{ classroomId, dayOfWeek, date, timeSlotId }`.

### Reservas y anotaciones (`ReservationsModule`, ambos roles)

Módulo unificado con comportamiento según rol:

**Para ENCARGADO**: muestra directamente `ReservationsPanel` (panel de supervisión de reservas) con:
- Filtros: estado, tipo, aula, semestre.
- Acciones por fila: Confirmar / Editar / Cancelar / Eliminar registro (ver tabla en §17).
- Modal de edición que nunca cambia el `type`; RECURRENTE edita día, PUNTUAL edita fecha.

**Para AYUDANTE**: muestra **tabs** con dos vistas:
- **Tab "Mis Reservas"**: mismo `ReservationsPanel` filtrado naturalmente a las propias, con botón "Nueva reserva" que abre la ventana correspondiente.
- **Tab "Anotaciones"**: formulario alta (aula + observación) + historial filtrable (aula/rango fechas). Borrado: AYUD solo propias (`userId === me.id`), ENC cualquiera.

### Catálogos (`CatalogosModule`, ENC)

Módulo unificado con **3 tabs** internos:
- **Materias** (`SubjectsModule`): CRUD estándar con búsqueda, paginación, modal crear/editar, borrado con validación de código único.
- **Docentes** (`TeachersModule`): CRUD idéntico, valida código y email únicos.
- **Horarios** (`TimeSlotsModule`): CRUD con inputs `type=time`, valida `timeOrderError` y `TIME_SLOT_IN_USE`.

Cada tab es un componente independiente que puede usarse embebido (recibe `params={}` y `winId=""` desde el tab contenedor).

### Usuarios (`UsersModule`, ENC)

CRUD estándar: búsqueda, paginación, modal crear/editar, borrado con `confirm()` mostrando el mensaje exacto de la API si hay dependencias (p.ej. `USER_HAS_DEPENDENCIES`). Permite desactivar/reactivar (toggle) y bloquea auto-eliminación (`CANNOT_DELETE_SELF`).

### Aulas (`ClassroomsModule`, ENC)

Tabs "Aulas" / "Mantenimientos". CRUD de aulas con validación de código único (`CLASSROOM_CODE_IN_USE`) y capacidad. Acción rápida "Reportar mantenimiento" que abre `MaintenanceFormModal` (compartido con `MaintenanceList.tsx`). Estados visibles con Badge (Activa/En mantenimiento/Fuera de servicio...).

### Semestres (`SemestersModule`, ENC)

Tabla + asistente de creación en 3 pasos (Datos → Días hábiles → Publicar), edición modal, **activar** semestre (`POST /activate`, único activo a la vez) y eliminación bloqueada si tiene dependencias (`SEMESTER_HAS_DEPENDENCIES`, `SEMESTER_ACTIVE`). El semestre activo alimenta workingDays/turnos de toda la app.

## 17. Matriz de permisos en la UI

La API **refuerza** todo esto con `FORBIDDEN`; la UI solo oculta/deshabilita:

| Acción | ENCARGADO | AYUDANTE |
|--------|-----------|----------|
| Ver dashboards, tablas semanales | Sí | Sí |
| CRUD usuarios, aulas, materias, docentes, turnos, semestres | Sí | No (ni aparecen en menú) |
| Editar planilla (asignar/editar/eliminar bloques) | Sí | No |
| Ver estado del aula (panel inline) | Sí | Sí |
| Crear reserva | Sí (desde flujo de planilla) | Sí |
| Confirmar/cancelar reservas ajenas, eliminar canceladas | Sí | Solo sus PENDIENTES (editar/cancelar) |
| Registrar anotaciones | Sí | Sí (tab Anotaciones) |
| Borrar anotaciones | Cualquiera | Solo propias |
| Ver/reportar mantenimientos | Sí | Sí (reportar desde Panel operativo) |
| Cambiar estado/eliminar mantenimiento | Sí | No |
| Ver reportes (ocupación, mantenimientos, reservas, anotaciones) | Sí (sección integrada en Panel Encargado) | No |

## 18. Sistema de estilos (`global.css`)

Tailwind 4 (`@import "tailwindcss"`) + clases propias en `@layer components` — el "design system WIMP":

- Escritorio/ventanas: `.wimp-desktop-bg`, `.wimp-window`, `.wimp-titlebar`, `.wimp-titlebar-active/-inactive`, `.wimp-title-btn`, `.taskbar`, `.taskbar-item(-active)`, `.start-menu`, animaciones `window-in/menu-in/toast-in`.
- Botones: `.btn` base + variantes `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost` + tamaño `.btn-sm`.
- Formularios: `.label-base`, `.input-base`, `.field-error`.
- Badges: `.badge` + tonos `.badge-success/warning/danger/info/neutral`.
- Tabla: `.data-table` (+ th/td internos).
- Grilla: `.grid-cell`, `.grid-cell-free/-blocked`, chips `.chip-schedule`, `.chip-reservation-pending/-confirmed`.
- Scrollbars finos: `.scroll-thin`.

Reglas: los colores nuevos entran por Tailwind inline o extendiendo estas clases; no hardcodear hex salvo casos puntuales documentados.

## 19. Guía de debugging

Síntoma → causa probable → acción:

| Síntoma | Causa probable | Qué revisar / hacer |
|---------|---------------|---------------------|
| Pantalla blanca después del fallback "Cargando…" | Excepción JS al montar la isla (histórico: falta de `QueryClientProvider` → "No QueryClient set") | F12 → Console: leer el primer error rojo. Toda isla nueva debe ir envuelta en `<QueryProvider>` (§11). |
| Cero llamadas a la API en Network | El crash ocurre ANTES de cualquier fetch | Mismo paso anterior: es un error de render, no de red. |
| `NETWORK_ERROR` en todos los paneles | API caída o `PUBLIC_API_URL` incorrecta | Levantar `labmanage-api` en el puerto del `.env`; probar `curl http://localhost:3001/api/time-slots`. |
| Error CORS | Origen de la web no permitido por la API | Agregar origen en la config CORS de `labmanage-api`. |
| Vuelve al login solo (loop a `/`) | Token expirado/inválido → interceptor 401 limpia sesión | Normal. Si pasa con token fresco: verificar reloj del sistema y secreto JWT de la API. |
| Datos viejos tras crear/editar | Falta invalidar una familia de queries | Ver tabla de invalidaciones §10; agregar la familia que falte. |
| Grilla semanal vacía con bloques existentes | `workingDays` del semestre no incluye esos días, o semestre mal seleccionado | Revisar `GET /availability/grid` response y `semester.workingDays`. |
| Select de bloques vacío | No hay turnos cargados | Crear turnos en Catálogos → Horarios. |
| No puedo registrar reserva (botón gris) | La verificación de disponibilidad no dio LIBRE | Leer el texto bajo "Verificación de disponibilidad": indica OCUPADA/MANTENIMIENTO y por qué. |
| Estado del aula no aparece en Tabla Semanal | No se hizo clic en una celda en modo vista | Haga clic en cualquier celda de la grilla; el panel lateral derecho se despliega con el estado en tiempo real. |
| Modo edición no disponible | Rol AYUDANTE no tiene acceso | Solo ENCARGADO puede alternar a modo edición; el botón no se renderiza para otros roles. |
| Toast rojo con mensaje raro | Código de error nuevo de la API no mapeado | Agregarlo a `ERROR_MESSAGES` (§8) y a `READMIAPI.md`. |
| Tipos rotos tras cambiar la API | `types.ts` desincronizado | Actualizar `types.ts` (§7) y correr `npm run check`. |
| Build falla en CI pero no local | Node version | Requiere Node ≥ 22.12 (`engines` en package.json). |

Herramientas:

- `npm run check` — types + Astro AST (debe dar 0 errors).
- React Query Devtools no está instalado; para inspeccionar el cache rápido: consola → `__REACT_QUERY__` no expuesto; usar la pestaña Network filtrando `/api/`.
- Logs del dev server en background: `astro dev logs`.

## 20. Cómo extender el proyecto

### Nuevo módulo (ventana)

1. Crear componente en `src/desktop/modules/<carpeta>/MiModulo.tsx`:
   ```tsx
   import type { ModuleProps } from "../../system/moduleTypes";
   export default function MiModulo(_props: ModuleProps) { return <div className="p-4">…</div>; }
   ```
2. Registrarlo en `src/desktop/system/registry.tsx` (import + entrada en `MODULES` con id/grupo/icono/roles/showOnDesktop/tamaño). Elegir ids únicos en kebab-case.
3. Si necesita leer `params` (prefills), tiparlo defensivamente: `typeof params.x === "string" ? params.x : ""`.
4. Para consultas nuevas, seguir el patrón §10 (fetch + mutations + invalidación coherente).
5. Envolver estados con `LoadingBlock/EmptyBlock/ErrorBlock` y errores con `apiErrorToMessage`.
6. Verificar: `npm run check` && `npm run build`, y probar manualmente ambos roles.

### Fusionar módulos existentes en uno nuevo

Cuando dos o más módulos comparten contexto natural (p.ej. reservas y anotaciones):

1. Crear un módulo contenedor con tabs internos (ver `ReservationsModule.tsx` o `CatalogosModule.tsx` como plantilla).
2. Los componentes de cada vista se embeben con `params={}` y `winId=""` (patrón de CatalogosModule).
3. Eliminar los módulos viejos del registry y borrar sus archivos.
4. Actualizar el README (§15 tabla, §16 descripciones, §17 permisos).
5. Verificar que el `StartMenu` y `DesktopIcons` agrupen correctamente.

### Nuevo endpoint de la API

1. Agregar/actualizar tipos en `src/lib/types.ts` (fiel a READMIAPI.md).
2. Funciones fetch/mutations en `src/lib/queries/<recurso>.ts` con su familia de keys.
3. Sumar códigos de error nuevos a `ERROR_MESSAGES`.
4. Si afecta grilla/estado/stats, agregar esas familias a la invalidación.

### Nueva pantalla pública (fuera del escritorio)

Crear `src/pages/ruta.astro` montando un screen de `src/screens/` con `client:only="react"` + fallback, y envolver el screen en `QueryProvider` si consume datos (ver `LoginScreen` como plantilla).

## 21. Despliegue y variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PUBLIC_API_URL` | Sí | URL base de la API, sin barra final. Local: `http://localhost:3001/api`. Prod: URL pública de la API. Prefijo `PUBLIC_` = Astro la inyecta en el bundle del cliente. |

Build: `output: "server"` + adapter Node standalone → `dist/server/entry.mjs` es una app Node (no es un sitio estático).

```sh
npm run build
node dist/server/entry.mjs   # respeta PORT/HOST del entorno
```

Notas:

- CORS de la API debe permitir el dominio de la web (las llamadas salen del navegador).
- No hay secretos en este repo: la auth es el JWT que emite la API.

## 22. Funcionalidades pendientes

Decidido fuera de alcance por ahora (no confundir con bugs):

- [ ] Anotaciones con marca "¿requiere atención?" + notificaciones para el Encargado.
- [ ] Exportación PDF/Excel en Reportes (hoy es solo consulta en pantalla).
