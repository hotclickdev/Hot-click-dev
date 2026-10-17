-- SOLO LECTURA. Negocios con frecuencia_payout = 'QUINCENAL' que no la eligieron.
-- Para que la corra DevOps y Seguridad (no la corre Backend contra prod).
--
-- Criterio (16-oct-2026):
--  * V168 (merge #149, 12-oct-2026 14:13 hora CR) creó la columna con DEFAULT 'QUINCENAL' y lo aplicó a todas
--    las filas que ya existían.
--  * En prod ningún alta pidió la frecuencia: el registro no la manda y #170 (elección en el alta) no está mergeado.
--  * El único camino para elegirla es PUT /api/negocio/billing-preferencias, que no deja marca ni auditoría.
--  => No hay forma de distinguir "eligió QUINCENAL" de "quedó por defecto". La cifra de abajo es una COTA SUPERIOR:
--     todos los QUINCENAL se cuentan como "sin elegir". Los MENSUAL sí los eligió alguien (no había otro camino).
--  * Cuando V183 esté aplicada, una fila en hot_click_negocio_onvo_cuenta_tb con frecuencia_liquidacion no nula
--    sí cuenta como elección explícita (ver la segunda consulta, comentada).
BEGIN TRANSACTION READ ONLY;

SELECT
    COUNT(*) FILTER (WHERE frecuencia_payout = 'QUINCENAL')                                       AS quincenal_sin_elegir_cota,
    COUNT(*) FILTER (WHERE frecuencia_payout = 'QUINCENAL' AND fecha_registro <  TIMESTAMP '2026-10-12 14:13:45') AS quincenal_antes_v168,
    COUNT(*) FILTER (WHERE frecuencia_payout = 'QUINCENAL' AND fecha_registro >= TIMESTAMP '2026-10-12 14:13:45') AS quincenal_despues_v168,
    COUNT(*) FILTER (WHERE frecuencia_payout = 'MENSUAL')                                         AS mensual_elegido,
    COUNT(*) FILTER (WHERE frecuencia_payout IS NULL)                                             AS sin_frecuencia
FROM hot_click_empresa_tb;

-- Después de aplicar V183:
-- SELECT COUNT(*) AS quincenal_sin_elegir
-- FROM hot_click_empresa_tb e
-- WHERE e.frecuencia_payout = 'QUINCENAL'
--   AND NOT EXISTS (SELECT 1 FROM hot_click_negocio_onvo_cuenta_tb c
--                   WHERE c.fk_id_empresa = e.id_empresa AND c.frecuencia_liquidacion IS NOT NULL);

ROLLBACK;
