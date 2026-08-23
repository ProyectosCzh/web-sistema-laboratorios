# Documentación Funcional de Interfaz de Usuario (Frontend)
## Sistema de Gestión de Aulas y Laboratorios

---

## 1. Estructura General de Navegación

El sistema se compone de **dos paneles principales** según el rol del usuario autenticado:

- **Panel de Administración** (para el Encargado)
- **Panel Operativo** (para el Ayudante de Laboratorio)

Ambos paneles comparten una **Tabla Semanal de Disponibilidad** como vista central, pero cada rol tiene acceso a funciones y pantallas específicas.

---

## 2. Pantallas de Acceso y Autenticación

### 2.1 Pantalla: Inicio de Sesión
- **Acceso:** Público (sin autenticación).
- **Descripción:** Es la primera pantalla que ve el usuario. Presenta un formulario centralizado para ingresar al sistema.
- **Elementos visuales:**
  - Campo de texto: "Usuario"
  - Campo de texto: "Contraseña" (con máscara de caracteres)
  - Botón: "Iniciar sesión"
  - Enlace (opcional): "¿Olvidaste tu contraseña?"
- **Flujo:**
  1. El usuario ingresa sus credenciales y pulsa "Iniciar sesión".
  2. El sistema valida la autenticación.
     - **Si las credenciales son incorrectas:** se muestra un mensaje de error debajo del formulario ("Usuario o contraseña incorrectos") y el usuario permanece en la misma pantalla.
     - **Si las credenciales son correctas:** el sistema redirige automáticamente al panel correspondiente según el rol asignado (Administración u Operativo).

### 2.2 Pantalla: Acceso Denegado
- **Acceso:** Público.
- **Descripción:** Se muestra cuando un usuario intenta acceder a una sección restringida o cuando el sistema no logra autenticarlo.
- **Elementos visuales:**
  - Icono de advertencia
  - Mensaje: "Acceso denegado. No tienes permisos para entrar a esta sección."
  - Botón: "Volver al inicio de sesión"
- **Flujo:**
  - Al hacer clic en "Volver al inicio", el usuario regresa a la pantalla de Inicio de Sesión (2.1).

---

## 3. Panel de Administración (Encargado)

*Este panel es el centro de control del sistema. Se accede desde el menú lateral izquierdo.*

### 3.1 Pantalla: Dashboard Administrativo (Inicio del Panel)
- **Acceso:** Encargado.
- **Descripción:** Vista principal que resume la actividad del sistema.
- **Elementos visuales:**
  - Tarjetas con indicadores (KPI):
    - Total de aulas registradas.
    - Reservas activas hoy.
    - Mantenimientos en curso.
    - Usuarios registrados.
  - Accesos rápidos a los módulos principales (iconos).
- **Flujo:** El usuario puede hacer clic en cualquier tarjeta para navegar al módulo correspondiente.

### 3.2 Pantalla: Gestión de Usuarios y Permisos
- **Acceso:** Encargado.
- **Descripción:** Permite administrar las cuentas del sistema.
- **Elementos visuales:**
  - Tabla de usuarios con columnas: Nombre, Correo, Rol, Estado (Activo/Inactivo), Acciones.
  - Botón: "+ Crear usuario".
  - Filtros de búsqueda: por nombre o rol.
- **Acciones del usuario (funciones):**
  - **Crear usuario:** Abre un formulario modal con campos: Nombre, Correo, Contraseña, Rol (desplegable: Encargado / Ayudante). Al guardar, la tabla se actualiza.
  - **Modificar usuario:** Abre el mismo formulario con los datos precargados. Permite cambiar nombre, correo y rol.
  - **Desactivar/Activar usuario:** Botón que cambia el estado del usuario (toggle). Si se desactiva, el usuario no podrá iniciar sesión.
  - **Asignar permisos:** Dentro del formulario, se muestra una sección con checkboxes o radio buttons para definir permisos específicos (ej: "Puede gestionar reservas", "Puede gestionar aulas", etc.). Al guardar, se aplican.
- **Flujo de navegación:**
  - Al hacer clic en "Gestionar usuarios", se muestra esta pantalla.
  - Al guardar un usuario, el sistema actualiza la tabla y redirige a la misma pantalla.
  - Los datos se reflejan en la entidad **Datos de Usuarios**.

### 3.3 Pantalla: Gestión de Aulas
- **Acceso:** Encargado.
- **Descripción:** Permite administrar los espacios físicos.
- **Elementos visuales:**
  - Tabla de aulas con columnas: Código, Nombre, Tipo, Estado (Libre/Ocupada/Mantenimiento), Acciones.
  - Botón: "+ Registrar aula".
  - Filtro: por tipo de aula.
- **Acciones del usuario (funciones):**
  - **Registrar aula:** Abre un formulario modal con campos: Código, Nombre, Tipo (desplegable: Aula convencional / Laboratorio con computadoras / Otro tipo), Capacidad, Ubicación. Al guardar, se agrega a la tabla.
  - **Definir tipo de aula:** Durante el registro o edición, el usuario selecciona el tipo. Si selecciona "Laboratorio", se muestran campos adicionales (ej: número de computadoras).
  - **Consultar estado:** Cada fila muestra el estado actual del aula con un indicador de color (verde=Libre, rojo=Ocupada, gris=Mantenimiento).
  - **Registrar mantenimiento:** Botón que abre un formulario para indicar el periodo de mantenimiento (fecha de inicio y fin) y la razón. Al guardar, el estado del aula cambia a "Mantenimiento" y se bloquea para reservas.
- **Flujo:**
  - Al registrar un mantenimiento, el sistema actualiza la **Tabla Semanal de Disponibilidad** (la celda correspondiente se marca como no disponible) y agrega el registro a **Datos de Mantenimiento**.

### 3.4 Pantalla: Configuración de Semestre y Horarios
- **Acceso:** Encargado.
- **Descripción:** Permite definir la estructura temporal del sistema.
- **Elementos visuales:**
  - Asistente de configuración (pasos).
  - Paso 1: **Seleccionar semestre** (desplegable con años/semestres).
  - Paso 2: **Definir días de la semana** (checkboxes: Lunes a Sábado).
  - Paso 3: **Definir bloques horarios** (lista editable de horas; el sistema ofrece los bloques predeterminados: 07:15-08:45, 08:55-10:25, etc., pero el usuario puede modificarlos).
  - Paso 4: **Publicar calendario** (botón para guardar y activar la configuración).
- **Flujo:**
  1. El usuario avanza paso a paso.
  2. Al publicar, la **Tabla Semanal de Disponibilidad** se genera con los días y bloques configurados.
  3. La configuración se guarda en **Datos de Semestres y Horarios**.

### 3.5 Pantalla: Consulta de Disponibilidad y Reportes
- **Acceso:** Encargado.
- **Descripción:** Permite visualizar información consolidada del sistema.
- **Elementos visuales:**
  - Pestañas o submenús: "Ocupación", "Mantenimientos", "Historial de Reservas", "Incidencias y Anotaciones".
  - Tablas con filtros por fecha, aula o usuario.
- **Acciones del usuario (funciones):**
  - **Consultar ocupación:** Muestra una tabla con el estado de todos los aulas en un día/horario específico.
  - **Consultar mantenimientos:** Lista los mantenimientos registrados (inicio, fin, aula, motivo).
  - **Consultar historial de reservas:** Lista todas las reservas (pasadas y futuras) con detalles de aula, día, bloque, usuario que reservó.
  - **Consultar incidencias y anotaciones:** Muestra las anotaciones de uso que fueron marcadas como "requiere atención", junto con su estado de resolución.
  - **Generar reportes:** Botón que permite exportar la información visible en formato PDF/Excel. Al hacer clic, se descarga el archivo.

### 3.6 Pantalla: Supervisión de Reservas y Anotaciones
- **Acceso:** Encargado.
- **Descripción:** Permite revisar, aprobar o modificar lo registrado por el personal operativo.
- **Elementos visuales:**
  - Tabla de reservas pendientes de revisión (con filtros).
  - Tabla de anotaciones de uso.
- **Acciones del usuario (funciones):**
  - **Revisar información registrada:** El Encargado visualiza todas las reservas y anotaciones.
  - **Confirmar/Modificar/Cancelar reservas:** Botones de acción por fila.
    - *Confirmar:* La reserva queda definitiva.
    - *Modificar:* Abre un formulario para cambiar día, bloque o aula. Al guardar, se actualiza la **Tabla Semanal**.
    - *Cancelar:* Elimina la reserva y libera el espacio en la **Tabla Semanal**.
  - **Dar seguimiento a anotaciones:** Botón que abre un detalle de la anotación. Permite marcar la incidencia como "En proceso" o "Resuelta". Si se determina que requiere mantenimiento, se redirige al módulo de Gestión de Aulas (para registrar mantenimiento).

---

## 4. Panel Operativo (Ayudante de Laboratorio)

*Este panel se centra en las tareas diarias de uso de aulas.*

### 4.1 Pantalla: Dashboard Operativo (Inicio del Panel)
- **Acceso:** Ayudante.
- **Descripción:** Vista de bienvenida con información útil para el día.
- **Elementos visuales:**
  - Tarjetas con resumen: "Aulas libres ahora", "Próximas reservas", "Estado de mantenimientos".
  - Accesos rápidos: "Consultar aulas", "Registrar reserva", "Añadir anotación", "Consultar estado".

### 4.2 Pantalla: Consulta de Aulas y Horarios
- **Acceso:** Ayudante.
- **Descripción:** Vista de solo lectura de la **Tabla Semanal de Disponibilidad**.
- **Elementos visuales:**
  - Tabla con filas = bloques horarios y columnas = días de la semana.
  - Cada celda muestra el estado (Libre, Ocupada, Mantenimiento) y el nombre del aula o curso que ocupa.
  - Filtro por aula específica.
  - Leyenda de colores.
- **Flujo:** El usuario puede hacer clic en una celda "Libre" para iniciar el proceso de reserva (redirige a 4.3).

### 4.3 Pantalla: Registro de Reserva
- **Acceso:** Ayudante.
- **Descripción:** Formulario para crear una nueva reserva.
- **Elementos visuales:**
  - Selector de aula (desplegable).
  - Selector de día (Lunes a Sábado).
  - Selector de bloque horario (lista de bloques).
  - Campo adicional: Motivo o materia.
  - Botón: "Verificar disponibilidad".
  - Botón: "Registrar reserva".
- **Flujo:**
  1. El usuario selecciona aula, día y bloque.
  2. Pulsa "Verificar disponibilidad". El sistema consulta la **Tabla Semanal**.
     - **Si la celda está "Ocupada" o "Mantenimiento":** se muestra un mensaje de alerta (toast o modal) informando el conflicto. No se permite continuar.
     - **Si la celda está "Libre":** el botón "Registrar reserva" se habilita.
  3. Al pulsar "Registrar reserva", el sistema guarda la reserva, actualiza la celda a "Ocupada" en la **Tabla Semanal**, y muestra un mensaje de éxito.
  4. Los datos se guardan en **Datos de Reservas**.

### 4.4 Pantalla: Añadir Anotación de Uso
- **Acceso:** Ayudante.
- **Descripción:** Permite registrar observaciones sobre el uso de un aula.
- **Elementos visuales:**
  - Selector de aula.
  - Selector de periodo (día y bloque).
  - Campo de texto: "Observación".
  - Checkbox: "¿Requiere atención?" (opcional).
  - Botón: "Guardar anotación".
- **Flujo:**
  1. El usuario selecciona el aula y el periodo donde ocurrió el uso.
  2. Escribe la observación.
  3. Si marca "Requiere atención", el sistema habilita un campo adicional para describir la urgencia.
  4. Al guardar:
     - Se registra en **Datos de Anotaciones**.
     - Si **No** requiere atención: la anotación queda en el historial y se actualiza la **Tabla Semanal** (si aplica) para reflejar el uso.
     - Si **Sí** requiere atención: se genera una notificación al Encargado (aparece en su pantalla de Supervisión). El flujo de la anotación pasa al estado "Pendiente de revisión".

### 4.5 Pantalla: Consultar Estado del Aula
- **Acceso:** Ayudante.
- **Descripción:** Permite verificar el estado actual de un aula específica en tiempo real.
- **Elementos visuales:**
  - Selector de aula.
  - Botón: "Consultar".
  - Resultado visual con iconos y colores:
    - **Libre:** Icono verde, mensaje "Disponible para reservar".
    - **Ocupada:** Icono rojo, mensaje "En clase o con actividad reservada".
    - **Mantenimiento:** Icono gris, mensaje "No disponible para uso".
- **Flujo:**
  1. El usuario selecciona un aula y pulsa "Consultar".
  2. El sistema muestra el estado actual y, si está "Libre", ofrece un botón "Reservar ahora" que redirige a la pantalla 4.3 con el aula precargada.

---

## 5. Vista Central Compartida: Tabla Semanal de Disponibilidad

*Esta pantalla es visible tanto para el Encargado (en modo administración) como para el Ayudante (en modo operativo).*

- **Elementos visuales:**
  - Cabecera de fila: Bloques horarios (07:15-08:45, 08:55-10:25, 10:30-12:00, 12:20-13:50, 13:55-15:25, 15:30-17:00, 17:05-18:35, 18:40-20:10, 20:15-21:45).
  - Cabecera de columna: Días (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado).
  - Celdas con estado:
    - **Libre:** Fondo verde claro, texto "Disponible".
    - **Ocupada:** Fondo rojo claro, texto con el nombre de la reserva o materia.
    - **Mantenimiento:** Fondo gris, texto "Mantenimiento".
- **Interacción según rol:**
  - **Encargado:** Puede hacer clic en cualquier celda para ver el detalle, modificar reservas, cancelar o registrar mantenimiento.
  - **Ayudante:** Puede hacer clic solo en celdas "Libres" para iniciar una reserva.

---

## 6. Resumen de Rutas de Navegación

### Encargado:
1. Inicio de Sesión -> Dashboard Administrativo
2. Dashboard -> Gestión de Usuarios (Crear/Editar/Desactivar)
3. Dashboard -> Gestión de Aulas (Registrar/Definir tipo/Estado/Mantenimiento)
4. Dashboard -> Configuración Semestre (Asistente)
5. Dashboard -> Consulta y Reportes (Ocupación/Mantenimientos/Historial/Incidencias/Exportar)
6. Dashboard -> Supervisión (Confirmar/Modificar/Cancelar/Seguimiento)

### Ayudante:
1. Inicio de Sesión -> Dashboard Operativo
2. Dashboard -> Consulta Aulas (Tabla)
3. Dashboard -> Registrar Reserva (Formulario con verificación)
4. Dashboard -> Añadir Anotación (Formulario)
5. Dashboard -> Consultar Estado (Consulta individual)

---

## 7. Notificaciones y Mensajes al Usuario

- **Éxito:** Toast verde en la parte superior derecha ("Reserva registrada con éxito", "Usuario creado").
- **Error:** Toast rojo ("No se pudo guardar. Verifique los datos").
- **Advertencia:** Modal o alerta amarilla para conflictos de disponibilidad.
- **Confirmación:** Modales de confirmación para acciones destructivas (ej: "¿Está seguro de cancelar esta reserva?").

---

## 8. Validaciones de Formulario (Resumen)

- **Inicio de Sesión:** Campos obligatorios. Validación de formato de correo.
- **Crear Usuario:** Todos los campos obligatorios. Contraseña mínima 6 caracteres.
- **Registrar Aula:** Código único. Nombre obligatorio.
- **Configuración Semestre:** Debe seleccionar al menos un día. Los bloques no pueden solaparse.
- **Registrar Reserva:** Aula, día y bloque obligatorios. Verificación de disponibilidad antes de guardar.
- **Añadir Anotación:** Aula y periodo obligatorios. Texto de observación obligatorio.
- **Mantenimiento:** Fecha de fin posterior a fecha de inicio.