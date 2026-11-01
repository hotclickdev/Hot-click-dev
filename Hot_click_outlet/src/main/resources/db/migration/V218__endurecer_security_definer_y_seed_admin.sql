-- V218 (31-oct-2026): BAJOs de Seguridad sobre #484.
-- 1) fn_crear_pago y fn_obtener_pago_por_token son SECURITY DEFINER sin search_path fijo: un rol con CREATE
--    en algún esquema del search_path podría sombrear hot_click_pago_tb y compañía. Se fija el search_path
--    (pg_temp al final para que no se busque primero). Sus cuerpos solo usan tablas de public y funciones de
--    pg_catalog. Condicional: prod arrancó con V1 como baseline y puede no tener estas funciones.
-- 2) El seed legado admin@hotclick.com usa un dominio que no es nuestro: pasa a admin@hotclick.lat
--    (Constants.CORREO_ADMIN cambia igual). Idempotente y sin chocar con una fila que ya use el correo nuevo.
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN
        SELECT p.oid::regprocedure AS firma
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN ('fn_crear_pago', 'fn_obtener_pago_por_token')
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp', f.firma);
    END LOOP;
END
$$;

UPDATE hot_click_usuario_tb
   SET correo = 'admin@hotclick.lat'
 WHERE lower(correo) = 'admin@hotclick.com'
   AND NOT EXISTS (SELECT 1 FROM hot_click_usuario_tb u2 WHERE lower(u2.correo) = 'admin@hotclick.lat');

UPDATE hot_click_empresa_tb
   SET correo_empresa = 'admin@hotclick.lat'
 WHERE lower(correo_empresa) = 'admin@hotclick.com'
   AND NOT EXISTS (SELECT 1 FROM hot_click_empresa_tb e2 WHERE lower(e2.correo_empresa) = 'admin@hotclick.lat');
