ID: QA1-003   Título: Tabla hot_click_cupo_emprendedor_tb no existe en staging; /cupos muestra 0 disponibles falso
Rol/cuenta usada: anónimo   Ruta/pantalla: /emprende → GET /api/public/emprende/cupos; registro-empresa
Pasos: 1. GET /api/public/emprende/cupos. 2. Revisar log.
Esperado: Cupos reales desde la tabla (migración V127__cupo_emprendedor.sql).
Obtenido: 200 {"usados":70,"limite":70,"cuposGratisDisponibles":0}, pero log: "bad SQL grammar SELECT … FROM hot_click_cupo_emprendedor_tb" → fallback cupoCerrado(). Además al reservar cupo la transacción queda abortada (25P02) y registro-empresa da 500.
Evidencia: 21:08:09 y 21:08:38 CR; evidencia/http/qa1-http-1.txt, qa1-http-2.txt; evidencia/logs/backend-registro-empresa.txt
Severidad: Crítica (dinero/plan: todos verían US$9 y bloquea registro de negocio)
¿Se pudo hacer desde la UI?: no. Indica migraciones Flyway no aplicadas en staging.


**Estado (21:18 CR):** Por verificar. La tabla ya existe en el staging reconstruido, según Grok Bot. Falta repetir la prueba.

Re-verificación 24/10/2026 00:29 CR (387bab8c, V188): GET /api/public/emprende/cupos → 200 {"usados":1,"limite":70,"cuposGratisDisponibles":69,"mensualidadUsdSinCupo":9}; log del backend actual (stg-cedula-backend.log): 0 líneas "bad SQL grammar … cupo_emprendedor". Estado: RESUELTO (lectura). Pendiente: ver que el contador baje con un alta gratis (E2), no se pudo por falta de cuenta.
Evidencia: evidencia/r2/00-ambiente.txt
