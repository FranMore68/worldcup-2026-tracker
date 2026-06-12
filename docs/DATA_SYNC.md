# Estrategia de actualización de datos

Define cómo se mantienen actualizados los datos de la aplicación durante el Mundial 2026
(11 de junio – 19 de julio de 2026).

## Fuentes de datos (ambas gratuitas, sin clave)

| Fuente                                                                | Datos                                                                                                                                    | Rol                                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **OpenLigaDB** (`wm26/2026`)                                  | Partidos, estados, resultados (con descanso), goles básicos, rondas                                                                     | **Principal**: el marcador y el calendario siempre vienen de aquí            |
| **API pública de FIFA.com** (`api.fifa.com`, no documentada) | Plantillas (26 jugadores con dorsal y posición), entrenador, tarjetas 🟨🟥, cambios, goles con asistente, estadio, árbitro, asistencia | **Enriquecimiento**: si fallara, la app sigue funcionando solo con OpenLigaDB |

El enriquecimiento FIFA se guarda dentro del JSONB `raw_payload` (clave `fifa`) de
`teams` y `fixtures`, y los eventos en `fixture_events` — **sin migraciones de esquema**.
Las sincronizaciones de OpenLigaDB preservan la clave `fifa` al actualizar.

Reglas de convivencia:

- Los eventos FIFA (goles+tarjetas+cambios) **reemplazan** a los goles de OpenLigaDB del
  mismo partido (son los mismos goles con más detalle).
- Si un partido tiene eventos FIFA, la sync de OpenLigaDB ya no reescribe sus goles.
- Lesiones: descartado — no existe fuente gratuita estructurada.

Supabase es la fuente de verdad para la web: las páginas nunca llaman a APIs externas.

## Endpoints de sincronización

Ambos GET o POST, protegidos con `?secret=...` o `Authorization: Bearer <SYNC_SECRET>`.

### `/api/sync-openligadb`

- `?type=all` — equipos + partidos + clasificación de grupos.
- `?type=live` — solo partidos en la ventana horaria actual.
- `?type=standings` — recalcula la clasificación.

### `/api/sync-fifa`

- `?type=live` (por defecto) — enriquece los partidos en ventana (-30 min, +4 h respecto
  al inicio): info del partido + plantillas/entrenador + eventos.
- `?type=all` — recorre todos los partidos: estadio/árbitro para los pendientes y
  enriquecimiento completo para los ya empezados o acabados.

El cruce OpenLigaDB↔FIFA se hace por hora de inicio y, si hay empate, por código de
selección (mapa ISO3→FIFA en el código: DEU→GER, CHE→SUI, etc.).

## Calendario recomendado (cron del VPS o Coolify Scheduled Tasks)

```cron

# Marcadores en directo (OpenLigaDB): cada 3 min en franjas de partidos (hora España)
*/3 17-23,0-6 * * * curl -s "https://TU-DOMINIO/api/sync-openligadb?type=live&secret=$SYNC_SECRET" > /dev/null

# Tarjetas, cambios y plantillas en directo (FIFA): cada 5 min en las mismas franjas
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

## Notas

- Las plantillas aparecen cuando cada selección juega su primer partido (la API de FIFA
  publica los 26 convocados en el detalle del partido). En la primera semana quedan
  cubiertas las 48.
- La API de FIFA no está documentada oficialmente: si cambiara, revisar `lib/fifaApi.ts`
  (ids de competición/temporada y rutas) — el resto de la app no se ve afectado.
- API-Football fue descartada: su plan gratuito no cubre la temporada 2026.
