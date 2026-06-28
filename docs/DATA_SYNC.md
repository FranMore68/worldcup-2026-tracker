# Estrategia de actualización de datos

Define cómo se mantienen actualizados los datos de la aplicación durante el Mundial 2026
(11 de junio – 19 de julio de 2026).

## Fuentes de datos (ambas gratuitas, sin clave)

| Fuente                                                                | Datos                                                                                                                                    | Rol                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **OpenLigaDB** (`wm26/2026`)                                  | Calendario, rondas, descanso, goles básicos. Marcador/estado de respaldo                                                                | **Base**: estructura del torneo; marcador cuando FIFA no cubre el partido     |
| **API pública de FIFA.com** (`api.fifa.com`, no documentada) | Marcador y estado en vivo, plantillas (26 jugadores con dorsal y posición), entrenador, tarjetas 🟨🟥, cambios, goles con asistente, estadio, árbitro, asistencia | **Principal en directo**: marcador/estado y eventos; si fallara, la app sigue con OpenLigaDB |

El enriquecimiento FIFA se guarda dentro del JSONB `raw_payload` (clave `fifa`) de
`teams` y `fixtures`, y los eventos en `fixture_events` — **sin migraciones de esquema**.
Las sincronizaciones de OpenLigaDB preservan la clave `fifa` al actualizar.

Reglas de convivencia:

- **Marcador y estado**: FIFA es la fuente autoritativa en directo (su feed va en
  tiempo real; OpenLigaDB es comunitario y se retrasa de madrugada). FIFA escribe
  `status_short`/`home_goals`/`away_goals` directamente desde su calendario
  (`MatchStatus` 0 = finalizado, 1 = no empezado, 3 = en directo).
- **Nunca degradar**: `statusRank()` (`lib/utils.ts`) ordena los estados
  `NS < LIV < FT`. Ninguna sync revierte un partido a un estado anterior, así que
  OpenLigaDB no puede pisar lo que FIFA ya avanzó (ni al revés). OpenLigaDB tampoco
  vuelve nunca a "No començat" un partido ya empezado: pasada la ventana en directo
  (210 min) lo asume finalizado con el último marcador conocido.
- **Eventos**: los eventos FIFA (goles+tarjetas+cambios) **reemplazan** a los goles de
  OpenLigaDB del mismo partido (mismos goles con más detalle). Si un partido tiene
  eventos FIFA, la sync de OpenLigaDB ya no reescribe sus goles.
- **Goles en propia puerta**: FIFA los emite como `Type=34` (no `Type=0`) y atribuidos
  al equipo del jugador que lo marca; la sync los acredita al rival (el que suma al
  marcador) con `detail = "Own Goal"`. La página de equipo los excluye del cómputo de
  goles por jugador.
- **Comprobación de consistencia**: tras montar los eventos FIFA, se cuentan los goles
  por bando y se comparan con el marcador. Si no cuadran (a FIFA le falta algún gol en
  la cronología), los goles se reconstruyen desde OpenLigaDB —que lleva el flag de
  autogol— conservando las tarjetas y cambios de FIFA. La cronología nunca contradice
  el resultado.
- Lesiones: descartado — no existe fuente gratuita estructurada.

Supabase es la fuente de verdad para la web: las páginas nunca llaman a APIs externas.

## Endpoints de sincronización

Todos GET o POST, protegidos con `?secret=...` o `Authorization: Bearer <SYNC_SECRET>`.
Sin el secreto devuelven `401`; si `SYNC_SECRET` no está configurado, `500` (fallo
seguro: no ejecutan nada).

### `/api/sync-openligadb`

- `?type=all` — equipos + partidos + clasificación de grupos.
- `?type=live` — solo partidos en la ventana horaria actual. **También recalcula la
  clasificación** si hay partidos en ventana (en directo o recién acabados), para que
  un partido nocturno no deje el grupo obsoleto hasta el sync diario.
- `?type=standings` — recalcula solo la clasificación.

La clasificación se computa desde los partidos de grupo finalizados (`status_short = FT`,
`round` que empieza por `Grup `). Como FIFA puede ser quien marca el partido como FT, el
recálculo en `live` se dispara por la ventana horaria, no por si esta sync cambió algo.

### `/api/sync-fifa`

- `?type=live` (por defecto) — enriquece los partidos en ventana (-30 min, +4 h respecto
  al inicio): marcador/estado + info del partido + plantillas/entrenador + eventos.
- `?type=all` — recorre todos los partidos: estadio/árbitro para los pendientes y
  enriquecimiento completo (marcador/estado/eventos) para los ya empezados o acabados.
  Es también el que corrige hacia atrás los partidos ya guardados cuando cambia la lógica.

**Importante:** `/api/sync-fifa` nunca crea nuevos partidos de eliminatòries
(R16, QF, SF, TP, F). La estructura del bracket (api_id, ronda, equipos, hora)
proviene exclusivamente de OpenLigaDB. FIFA solo enriquece las filas que ya
existen. Esto evita duplicados cuando una API publica una ronda antes que la otra
(como ocurrió con els vuitens de final: OpenLigaDB ids 82127-82134 y FIFA ids
400021528-400021535).

## Identidad de un partido y propietario (`owner`)

Cada fila de `fixtures` tiene un `owner`: `openligadb` (defecto) o `fifa`.

- **OpenLigaDB** es el propietario estructural: define el `api_id`, la ronda, los
  equipos y la hora del partido. Sus ids son estables (ej. 82099-82114 para los
  setzens de final).
- **FIFA** enriquece: marcador, estado, eventos, plantillas, árbitro, estadio,
  asistencia. FIFA nunca pisa el `api_id` ni los equipos de una fila propiedad
  de OpenLigaDB.

Para evitar duplicados entre ambas fuentes, un partido se identifica por
**`(round, match_date_utc)`**:

- OpenLigaDB es la única fuente estructural: crea las filas iniciales con
  `api_id`, ronda, equipos y hora.
- `/api/sync-fifa` enriquece las filas existentes (escribe `raw_payload.fifa`
  y, con permiso de `statusRank`, actualiza marcador/estado).
- Para partidos de fase de grupos, FIFA podía haber creado filas en el pasado
  cuando OpenLigaDB aún no había publicado el calendario completo. Cuando
  OpenLigaDB publica después un partido en una ronda + hora donde FIFA ya había
  creado una fila, el `upsert` por `api_id` convierte esa fila en propiedad de
  OpenLigaDB (`owner = 'openligadb'`) y le asigna el `api_id` estable.
- Para eliminatòries (R16+), FIFA **nunca** crea filas: el bracket entero
  proviene de OpenLigaDB.

La liga OpenLigaDB↔FIFA se hace por hora de inicio + ronda; cuando varios
partidos comparten hora, el código de selección (mapa ISO3→FIFA: DEU→GER,
CHE→SUI, etc.) desambigua.

## Eliminatòries: no adivinamos el bracket

OpenLigaDB publica los cruces de R32 con ids de equipo "placeholder"
(ej. `7706 = 3 C/E/F/H/I`). La aplicación **no calcula la matriz de mejores
terceros**: simplemente espera a que OpenLigaDB/FIFA reemplacen ese placeholder
por el `teamId` real. Cuando eso ocurre, la sync actualiza automáticamente el
fixture y los nombres del equipo. Esto evita mostrar un rival incorrecto mientras
FIFA no haya anunciado oficialmente el cruce.

### `/api/seed`

Reconstruye desde cero equipos, partidos y clasificaciones. Operación destructiva,
**protegida con `SYNC_SECRET`** igual que las syncs. Uso puntual (primer arranque o
reset), no programado. El antiguo `/api/debug` (sin auth) fue eliminado.

## Calendario recomendado (cron del VPS o Coolify Scheduled Tasks)

> **Horas en UTC.** Las franjas (`17-23,0-6`) cubren las sedes de Norteamérica
> (un partido empieza como muy tarde a las 03:00 UTC y acaba sobre las 05:00 UTC).
> El cron corre en la zona horaria del contenedor; la imagen no fija `TZ`, así que
> es UTC. Si algún día el contenedor corriera en otra zona, ajustar estas horas.

```cron

# Marcador en directo (OpenLigaDB, de respaldo): cada 3 min en franjas de partidos (UTC)
*/3 17-23,0-6 * * * curl -s "https://TU-DOMINIO/api/sync-openligadb?type=live&secret=$SYNC_SECRET" > /dev/null

# Marcador/estado + tarjetas/cambios/plantillas en directo (FIFA, principal): cada 5 min (UTC)
*/5 17-23,0-6 * * * curl -s "https://TU-DOMINIO/api/sync-fifa?type=live&secret=$SYNC_SECRET" > /dev/null

# Sincronización completa diaria (correcciones + nuevos cruces de eliminatorias + estadios)
30 8 * * * curl -s "https://TU-DOMINIO/api/sync-openligadb?type=all&secret=$SYNC_SECRET" > /dev/null
35 8 * * * curl -s "https://TU-DOMINIO/api/sync-fifa?type=all&secret=$SYNC_SECRET" > /dev/null
```

En Coolify: *Project → Scheduled Tasks*, una tarea por línea con el mismo comando `curl`.

## Frescura en el navegador

Las páginas con partidos en directo incluyen un componente `AutoRefresh` que refresca los
datos del servidor cada 45-60 s sin recargar la página. Todas las páginas y rutas API son
`force-dynamic` y el cliente Supabase usa `cache: "no-store"`.

## Horas mostradas al usuario

Los partidos se guardan en `match_date_utc` (UTC). Las funciones de `lib/utils.ts`
(`formatDate`, `formatTime`, `formatDateTime`) formatean **siempre** con
`timeZone: "Europe/Madrid"`, así que la web muestra la hora peninsular española
(CET/CEST) sin depender de la zona del servidor. Al añadir un nuevo formateador de
fechas, incluir ese `timeZone` o la hora saldrá en UTC.

## Notas

- Las plantillas aparecen cuando cada selección juega su primer partido (la API de FIFA
  publica los 26 convocados en el detalle del partido). En la primera semana quedan
  cubiertas las 48.
- La API de FIFA no está documentada oficialmente: si cambiara, revisar `lib/fifaApi.ts`
  (ids de competición/temporada y rutas) — el resto de la app no se ve afectado.
- API-Football fue descartada: su plan gratuito no cubre la temporada 2026.
