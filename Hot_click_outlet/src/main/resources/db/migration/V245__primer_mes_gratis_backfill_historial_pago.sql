-- V245 (26-nov-2026): backfill del primer mes gratis (V244). Idempotente (solo toca filas con la marca en NULL).
-- Regla del dueno: el mes gratis es SOLO para negocios que nunca pagaron PYME / NEGOCIO_PLUS. Se marca como usado a
-- todo negocio con historial de plan de pago:
--   * plan actual PYME o NEGOCIO_PLUS (plan_saas), o
--   * alguna suscripcion de PYME / NEGOCIO_PLUS que llego a activarse (ACTIVO, PAST_DUE, CANCELADO o VENCIDO). La fila
--     conserva el plan aunque despues se degrade el negocio, y es la fuente mas fiable (las filas de ledger
--     COBRO_OK / PLAN_ACTIVADO cuelgan de esa misma suscripcion).
-- Una suscripcion solo en TRIAL (sin activar) o de Emprendedor NO cuenta.
UPDATE hot_click_empresa_tb e
   SET primer_mes_gratis_usado_en = NOW()
 WHERE e.primer_mes_gratis_usado_en IS NULL
   AND (
        e.plan_saas IN ('PYME', 'NEGOCIO_PLUS')
        OR EXISTS (
            SELECT 1
              FROM hot_click_suscripcion_tb s
              JOIN hot_click_plan_tb p ON p.id_plan = s.fk_id_plan
             WHERE s.fk_id_empresa = e.id_empresa
               AND p.nombre IN ('PYME', 'NEGOCIO_PLUS')
               AND s.estado IN ('ACTIVO', 'PAST_DUE', 'CANCELADO', 'VENCIDO')
        )
   );
