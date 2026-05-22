# BAMX Nuevo Laredo Planner — Documentación del Proyecto

> **Versión:** 1.0.0 | **Autor:** Christian Ramses Reyero Garcia  
> **Stack:** Electron + Vite + React + TypeScript + SQLite (better-sqlite3)

---

## Archivos y Páginas Principales del Sistema

Este proyecto es una aplicación de escritorio multiplataforma. Su estructura principal de archivos y las páginas del sistema se organizan de la siguiente manera:

### Páginas y Vistas Principales (React)

Las vistas del frontend se encuentran en [components/](./src/renderer/src/components) y se mapean en las rutas definidas en [App.tsx](./src/renderer/src/App.tsx):

*   **Panel de Control (`/`)** - [Dashboard.tsx](./src/renderer/src/components/Dashboard.tsx): Vista general de resumen y accesos rápidos.
*   **Planeación (`/planeacion`)** - [PlanningView.tsx](./src/renderer/src/components/PlanningView.tsx): Pantalla central del sistema donde se gestiona la planeación de rutas de distribución de alimentos y asignación de beneficiarios.
*   **Gestión de Catálogos**:
    *   **Colonias (`/colonias`)** - [ColoniasView.tsx](./src/renderer/src/components/ColoniasView.tsx): Administración de zonas y colonias.
    *   **Instituciones (`/instituciones`)** - [InstitutionsView.tsx](./src/renderer/src/components/InstitutionsView.tsx): Gestión de instituciones receptoras.
    *   **Supermercados (`/supermercados`)** - [SupermarketsView.tsx](./src/renderer/src/components/SupermarketsView.tsx): Control de tiendas de autoservicio donantes.
    *   **Almacén (`/almacen`)** - [WarehouseView.tsx](./src/renderer/src/components/WarehouseView.tsx): Vista de inventario y estado del almacén.
*   **Gestión de Flota y Logística**:
    *   **Unidades (`/unidades`)** - [TrucksView.tsx](./src/renderer/src/components/TrucksView.tsx): Control de camiones y transporte.
    *   **Choferes (`/choferes`)** - [DriversView.tsx](./src/renderer/src/components/DriversView.tsx): Registro y asignación de personal de conducción.
*   **Vistas de Apoyo**:
    *   **Caridad (`/caridad`)** - [CaridadView.tsx](./src/renderer/src/components/CaridadView.tsx): Distribución de apoyo asistencial.
    *   **Historial (`/historial`)** - [MonthlyHistoryView.tsx](./src/renderer/src/components/MonthlyHistoryView.tsx): Registro histórico de planeaciones mensuales.
    *   **Configuración (`/configuracion`)** - [SettingsView.tsx](./src/renderer/src/components/SettingsView.tsx): Ajustes generales de la aplicación.

### Proceso Principal (Backend y BD)

*   **Punto de entrada de Electron** - [index.ts](./src/main/index.ts): Inicializa y configura la ventana del sistema.
*   **Manejadores de comunicación IPC** - [planningHandlers.ts](./src/main/ipc/planningHandlers.ts): Comunicación y lógica del algoritmo de planeación.
*   **Esquema de Base de Datos** - [schema.ts](./src/main/database/schema.ts): DDL e inicialización de SQLite.

---


## 1. ¿Qué es este proyecto?

**BAMX Nuevo Laredo Planner** es una aplicación de escritorio desarrollada para el **Banco de Alimentos de México (BAMX) – sucursal Nuevo Laredo**. Su propósito es digitalizar y optimizar la **logística de distribución y recolección de alimentos**, reemplazando hojas de cálculo manuales con un sistema inteligente de planificación de rutas.

### Problema que resuelve

El banco de alimentos coordina diariamente múltiples camiones que:
- **Recolectan** donaciones en supermercados de la ciudad.
- **Distribuyen** despensas a colonias (urbanas y rurales) en situación de vulnerabilidad.
- **Entregan** alimentos a instituciones sociales (asilos, comedores, etc.).
- **Atienden** a beneficiarios individuales de la "Ruta de la Caridad".

Sin un sistema, planificar estas rutas manualmente consume mucho tiempo y produce rutas subóptimas (mayor kilometraje, combustible y tiempo). El planner resuelve esto generando automáticamente un **plan mensual optimizado** para dos unidades vehiculares.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                  PROCESO RENDERER                   │
│  (React + TypeScript + TailwindCSS + React Router)  │
│                                                     │
│  Dashboard | Catálogos | Vista Planeación           │
│                                                     │
│  Utilidades: geneticRouting.ts | monthlyScheduler.ts│
│              jsPDFRouteExport.ts                    │
└───────────────────┬─────────────────────────────────┘
                    │  IPC (contextBridge / preload)
┌───────────────────▼─────────────────────────────────┐
│                  PROCESO MAIN (Node.js)              │
│                                                     │
│  ipc/dbHandlers.ts        ← CRUD catálogos          │
│  ipc/planningHandlers.ts  ← Rutas & planes          │
│  ipc/settingsHandlers.ts  ← Configuración CEDIS     │
│  ipc/windowHandlers.ts    ← Minimizar/Cerrar        │
│                                                     │
│  database/schema.ts       ← Definición de tablas    │
│  database/index.ts        ← Inicialización SQLite   │
└───────────────────┬─────────────────────────────────┘
                    │
                ┌───▼──────────────┐
                │  SQLite (local)  │
                │  bamx.db         │
                └──────────────────┘
```

La app usa el patrón **Electron + Vite** (via `electron-vite`). El **proceso renderer** es una SPA React que se comunica con el **proceso main** (Node.js) únicamente a través de canales IPC seguros definidos en el preload. El main accede a la base de datos SQLite de forma sincrónica con `better-sqlite3`.

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework desktop | Electron | ^33.x |
| Bundler | electron-vite / Vite | ^5 / ^7 |
| UI | React | ^19 |
| Lenguaje | TypeScript | ^5.9 |
| Estilos | TailwindCSS | ^4 |
| Base de datos | SQLite (better-sqlite3) | ^12 |
| Mapas | Leaflet + react-leaflet | ^1.9 / ^5 |
| Exportación PDF | jsPDF + jspdf-autotable | ^4 / ^5 |
| Iconos | lucide-react | ^0.574 |
| Router | react-router-dom | ^7 |
| Fechas | date-fns | ^4 |

---

## 4. Estructura de Carpetas

```
src/
├── main/                        # Proceso Node.js de Electron
│   ├── index.ts                 # Punto de entrada, crea BrowserWindow
│   ├── database/
│   │   ├── schema.ts            # DDL de todas las tablas SQLite
│   │   └── index.ts             # Inicializa y retorna la instancia DB
│   └── ipc/
│       ├── dbHandlers.ts        # CRUD: colonias, instituciones, etc.
│       ├── planningHandlers.ts  # Lógica de rutas y planes mensuales
│       ├── settingsHandlers.ts  # Configuración CEDIS
│       └── windowHandlers.ts   # Control de ventana (frame custom)
│
├── preload/                     # Bridge seguro Renderer ↔ Main
│
├── renderer/src/                # Proceso React
│   ├── App.tsx                  # Router principal (HashRouter)
│   ├── types/index.ts           # Interfaces TypeScript compartidas
│   ├── utils/
│   │   ├── geneticRouting.ts    #  Algoritmo Genético de optimización
│   │   ├── monthlyScheduler.ts  #  Generador de plan mensual
│   │   └── jsPDFRouteExport.ts  # Exportación de rutas a PDF
│   └── components/
│       ├── Dashboard.tsx
│       ├── PlanningView.tsx     # Vista de planeación (la más compleja)
│       ├── ColoniasView.tsx
│       ├── InstitutionsView.tsx
│       ├── SupermarketsView.tsx
│       ├── TrucksView.tsx
│       ├── DriversView.tsx
│       ├── CaridadView.tsx
│       ├── WarehouseView.tsx
│       ├── MonthlyHistoryView.tsx
│       ├── MapVisualizer.tsx
│       └── planning/
│           ├── CalendarGrid.tsx
│           ├── MonthlyPlanModal.tsx
│           ├── SimulationModal.tsx
│           └── modals/StopAdditionModal.tsx
```

---

## 5. Base de Datos (SQLite)

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `colonies` | Colonias (zonas) a las que se entregan despensas. Tipo: Urbana/Rural. |
| `beneficiaries` | Beneficiarios individuales de la Ruta de la Caridad. |
| `institutions` | Instituciones sociales (asilos, comedores). |
| `supermarkets` | Supermercados que donan alimentos. |
| `trucks` | Unidades vehiculares (camión grande / camioneta). |
| `drivers` | Choferes registrados. |
| `warehouse` | Configuración única del CEDIS (almacén central). |
| `routes` | Rutas guardadas (una por camión por día). |
| `route_stops` | Paradas en secuencia de cada ruta. |
| `settings` | Pares clave-valor para configuración general. |

### Relaciones

```
trucks ──────┐
             ├──→ routes ──→ route_stops ──→ colonies
drivers ─────┘                           ──→ institutions
                                         ──→ supermarkets
                                         ──→ beneficiaries
```

### Campos Clave

**`colonies`**: `type` (Urbana/Rural), `pantry_count` (cantidad de despensas), `preferred_day`, `lat`, `lng`.

**`routes`**: `status` (Pendiente/Completada/Cancelada), `type` (Entrega/Recolección/Institucional/Caridad).

**`route_stops`**: `stop_type` (Colonia/Institución/Supermercado/Beneficiario), `sequence_order` (resultado del AG).

---

## 6. Módulo de Planeación — El Corazón del Sistema

La generación de un plan mensual involucra **dos fases secuenciales**:

```
[Datos de BD]
     │
     ▼
MonthlyScheduler.generate()
     │
     ├─ Fase 1: Asignación Heurística
     │    ├─ scheduleSupermarkets()    → Lunes a sábado, diario alternado
     │    ├─ scheduleColonies()        → Urbanas 2x/mes, Rurales 1x/mes
     │    ├─ scheduleCaridad()         → 2º y 4º miércoles del mes
     │    ├─ scheduleInstitutions()    → Día fijo por institución
     │    └─ assignDriversAndTrucks()  → Asignación fija de recursos
     │
     └─ Fase 2: Optimización Genética
          └─ optimizeAllRoutes()
               └─ GeneticRouting.run()  ← Optimiza la secuencia por cada camión y día
```

---

## 7. Algoritmo Genético de Optimización de Rutas (TSP / VRP)

**Archivo:** `src/renderer/src/utils/geneticRouting.ts`

El sistema implementa un **Algoritmo Genético (AG)** para resolver una variante del **Problema de Enrutamiento de Vehículos (VRP)** y del **Viajante de Comercio (TSP)**. Dado un conjunto de paradas asignadas a un camión en un día, encuentra el orden óptimo de visitas para minimizar la distancia total recorrida y cumplir con las limitaciones de capacidad de carga.

### Representación del Cromosoma (Individuo)
Cada **individuo** de la población representa una secuencia o ruta completa de visitas:
- El primer elemento y el último elemento corresponden siempre al **CEDIS** (punto de inicio y fin).
- Las posiciones intermedias representan las paradas en los puntos de recolección y entrega.
```
[CEDIS (Inicio)] ──→ [Parada A] ──→ [Parada B] ──→ [Parada C] ──→ [CEDIS (Fin)]
```

### Modelo de Carga y Restricciones
A lo largo de la ruta, la carga acumulada del vehículo fluctúa de acuerdo con la naturaleza de cada parada:
- **Supermercados (Recolección):** La carga del camión **incrementa** en `+avg_volume` kg.
- **Colonias (Entrega):** La carga **disminuye** en `-(pantry_count * 15)` kg.
- **Instituciones (Entrega):** La carga **disminuye** en `-estimated_kg` (o `-80` kg por defecto).
- **Ruta de la Caridad (Entrega):** La carga **disminuye** en `-15` kg por beneficiario.

### Función de Aptitud (Fitness)
El algoritmo busca maximizar el valor de aptitud, que es inversamente proporcional al costo total de la ruta:
$$\text{Fitness} = \frac{1}{\text{Distancia Total} + \text{Penalizaciones} + 1}$$

- **Penalizaciones:** Si en cualquier parada intermedia la carga del vehículo excede la capacidad máxima (**3,000 kg**) o si la carga es negativa (se intenta entregar mercancía que aún no ha sido recolectada), se añade una penalización muy severa de **5,000** al costo de la ruta por cada infracción. Esto elimina de manera efectiva las rutas inviables durante la selección.

### Operadores Genéticos Utilizados
1. **Selección por Torneo (Tamaño 3):**
   Para elegir a cada padre, se seleccionan 3 individuales al azar de la población y el que tenga el mayor valor de fitness (menor costo) es elegido. Este proceso se repite dos veces para obtener los dos padres.
2. **Cruce de Orden (Order Crossover - OX):**
   - Mantiene la coherencia de las permutaciones (evitando duplicar o perder paradas).
   - Se eligen dos puntos de corte aleatorios (excluyendo los extremos del CEDIS).
   - El hijo hereda el segmento entre cortes directamente del Padre 1.
   - El resto de las posiciones vacías se rellenan secuencialmente con los elementos del Padre 2 en el orden en que aparecen, omitiendo los que ya están en el hijo.
3. **Mutación por Inversión de Segmento:**
   - Con una tasa de mutación del **5%**, se seleccionan dos índices aleatorios en la ruta y se invierte el orden del segmento intermedio.
4. **Elitismo:**
   - En cada ciclo generacional, el mejor individuo con el mayor fitness de la generación anterior se copia de forma intacta a la nueva población, garantizando que el algoritmo nunca pierda la mejor solución encontrada.

### Matriz de Distancias y Parámetros
Las distancias entre todos los puntos (incluyendo el CEDIS) se calculan antes de iniciar el AG mediante una matriz de distancias basada en coordenadas geográficas:
$$\text{Distancia} = \sqrt{(\text{lat}_1 - \text{lat}_2)^2 + (\text{lng}_1 - \text{lng}_2)^2} \times 111$$
*(1 grado de latitud/longitud equivale aproximadamente a 111 km).*

**Parámetros de ejecución:**
- Tamaño de Población (`popSize`): **200**
- Número de Generaciones (`numGenerations`): **1000**
- Tasa de Mutación (`mutationRate`): **5% (0.05)**

---

## 8. Planificador Mensual (`monthlyScheduler.ts`)

**Archivo:** `src/renderer/src/utils/monthlyScheduler.ts`

Este módulo se encarga de realizar la **Fase 1 (Asignación Heurística)**, distribuyendo de forma lógica todas las necesidades operativas del mes en días específicos según las reglas de negocio del banco de alimentos.

### Reglas de Distribución Heurística

1. **Supermercados (Recolecciones):**
   - Se programan de lunes a sábado de forma diaria.
   - Para no sobrecargar un solo vehículo, las tiendas se alternan alternativamente entre el **Camión A** y el **Camión B** según su índice de base de datos (`index % 2 === 0`).
2. **Colonias Urbanas (Entregas):**
   - Deben visitarse **dos veces al mes** (una por quincena).
   - Se distribuyen usando la fórmula de desfase `(index * 2) % 12` para esparcir los arranques a lo largo de las semanas, programando la primera visita en el día `startDayOffset` y la segunda en `startDayOffset + 14`.
   - Se asignan al camión que tenga menos paradas programadas para ese día con el fin de balancear la carga de trabajo.
3. **Colonias Rurales (Entregas):**
   - Se programan **una vez al mes**, fijas en el sábado de la segunda semana (día 14 del mes, índice 13).
   - Se asignan al camión con menos paradas ese día.
4. **Ruta de la Caridad:**
   - Se programa los **miércoles de la segunda y cuarta semana del mes**.
   - Los beneficiarios registrados se dividen alternadamente entre el Camión A y el Camión B.
5. **Instituciones:**
   - Se asignan en base a su día fijo preferente (`fixed_day`) guardado en el catálogo.
   - El camión con menos paradas en ese día recibe la entrega.

### Asignación de Recursos Fijos
Una vez asignadas las paradas por día, el planificador aplica la asignación de recursos logísticos:
- **Camión A (Unidad Grande):** Se identifica de forma automática buscando el vehículo con mayor capacidad en kilogramos de la base de datos. Se le asigna de forma fija al chofer principal **Juan**.
- **Camión B (Unidad de Apoyo):** Se asigna el vehículo complementario y el otro chofer disponible en el sistema.
- **Días no laborables:** Los domingos y los días marcados como inhábiles (`nonWorkingDays`) se excluyen de la planeación y no se les asigna ninguna parada.

---

## 9. Vistas de la Aplicación

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | Dashboard | KPIs generales y actividad reciente |
| `/colonias` | ColoniasView | CRUD de colonias con mapa |
| `/instituciones` | InstitutionsView | CRUD de instituciones |
| `/supermercados` | SupermarketsView | CRUD de supermercados |
| `/unidades` | TrucksView | CRUD de camiones y camionetas |
| `/choferes` | DriversView | CRUD de choferes |
| `/caridad` | CaridadView | CRUD beneficiarios Ruta de la Caridad |
| `/almacen` | WarehouseView | Configuración del CEDIS |
| `/planeacion` | PlanningView | Generación y gestión del plan mensual |
| `/historial` | MonthlyHistoryView | Planes guardados por mes |
| `/configuracion` | SettingsView | Ajustes generales |

**PlanningView** (~77KB) es la vista más compleja: combina `CalendarGrid` (rejilla del mes), `MonthlyPlanModal` (detalle editable del plan), `SimulationModal` (lanzador del AG) y `StopAdditionModal`.

---

## 10. Exportación PDF (`jsPDFRouteExport.ts`)

### `exportRouteToPDF(route)`
Genera un **manifiesto de ruta** individual con encabezado (fecha, camión, chofer) y tabla de paradas (tipo, destino, volumen, cuota de recuperación, espacio para firma).

### `exportMonthlyPlanToPDF(plan, monthName, year)`
Genera el **plan mensual completo** con portada y una página por día activo, listando paradas de Unidad A y Unidad B.

---

## 11. Canales IPC Principales

| Canal | Descripción |
|-------|-------------|
| `planning:seed-data` | Carga datos de prueba reales de Nuevo Laredo |
| `planning:save-monthly-plan` | Persiste el plan mensual en BD |
| `planning:get-month-plan` | Recupera plan de un mes guardado |
| `planning:get-month-summary` | Resumen estadístico por día |
| `planning:get-routes` | Rutas de una fecha específica |
| `planning:get-suggestions` | Paradas sugeridas para un día |
| `planning:get-available-months` | Lista de meses con datos guardados |

---

## 12. Flujo de Uso Típico

```
1. Primera ejecución:
   └─ Configuración → "Cargar datos de prueba"
      (inserta colonias, supermercados, choferes reales de NL)

2. Enriquecer catálogos:
   └─ Editar Colonias, Supermercados, Instituciones, Choferes, Unidades

3. Generar plan mensual:
   └─ Planeación → Seleccionar mes → "Generar Plan"
      └─ MonthlyScheduler: asignación heurística
      └─ GeneticRouting: optimización del orden
      └─ Revisar en CalendarGrid

4. Ajustar manualmente:
   └─ Click en un día → Agregar/quitar paradas

5. Guardar y exportar:
   └─ "Guardar Plan" → SQLite
   └─ "Exportar PDF" → manifiesto imprimible

6. Ejecutar rutas:
   └─ El chofer lleva el PDF impreso
   └─ Marcar paradas completadas en la app
```

---

## 13. Configuración del Entorno

### Prerequisitos
- Node.js >= 18 | npm >= 9 | Windows 10/11

### Instalación y Ejecución

```bash
npm install    # Instala dependencias (compila better-sqlite3)
npm run dev    # Inicia en modo desarrollo con HMR
```

### Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con HMR |
| `npm run build:win` | Genera instalador `.exe` |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run lint` | Análisis estático ESLint |
| `npm run format` | Formateo con Prettier |

---

## 14. Notas para Nuevos Desarrolladores

> [!IMPORTANT]
> La base de datos SQLite se crea automáticamente en el directorio `userData` de Electron al primer arranque. No es un archivo del repositorio.

> [!NOTE]
> El algoritmo genético corre en el **proceso renderer** (hilo UI). Para planes grandes puede bloquear la interfaz brevemente. Mejora futura: moverlo a un **Web Worker**.

> [!WARNING]
> `planning:seed-data` **borra todos los datos existentes** antes de insertar los de prueba. Solo usar en desarrollo.

> [!TIP]
> `test-genetic.ts` en la raíz permite probar el AG de forma aislada con `ts-node test-genetic.ts`.

### Archivos Clave (por orden de importancia)

1. `utils/geneticRouting.ts` — Núcleo algorítmico
2. `utils/monthlyScheduler.ts` — Lógica de negocio logístico
3. `ipc/planningHandlers.ts` — Persistencia y consultas de planes
4. `database/schema.ts` — Modelo de datos
5. `components/PlanningView.tsx` — Interfaz principal

---

## 15. Glosario

| Término | Significado |
|---------|-------------|
| **CEDIS** | Centro de Distribución → almacén central en C. Iturbide 1407 |
| **Colonia** | Zona urbana o rural donde viven familias beneficiarias |
| **Despensa** | Paquete de alimentos (~15kg: 8kg abarrotes + 7kg fruta) |
| **Ruta de la Caridad** | Entrega individual a beneficiarios específicos (cada 15 días) |
| **Cuota de recuperación** | Pago simbólico que algunas colonias realizan |
| **Institución** | Asilo, comedor u organización que recibe alimentos regularmente |
| **Demanda** | Kg que se cargan (+recolección) o descargan (-entrega) en cada parada |
| **Fitness** | Calidad de una ruta en el AG; mayor = menor distancia total |
| **Individuo** | En el AG: una secuencia candidata completa de paradas |
| **Generación** | En el AG: una iteración evolutiva completa de la población |
| **OX** | Order Crossover — operador de cruce que preserva el orden relativo |
| **Elitismo** | Preservar al mejor individuo sin modificar entre generaciones |
