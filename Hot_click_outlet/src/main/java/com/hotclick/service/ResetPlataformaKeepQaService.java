package com.hotclick.service;

import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Borra productos, tiendas y usuarios registrados.
 * Conserva admin, 3 cuentas QA y el usuario de mostrador del POS.
 */
@Service
public class ResetPlataformaKeepQaService {

    public static final String CLAVE_ONE_SHOT = "reset-keep-qa-2026-09-17";
    public static final String CONFIRMACION = "ELIMINAR PLATAFORMA";
    public static final String CORREO_MOSTRADOR = "mostrador@hotclick.internal";

    private static final Logger LOG = LoggerFactory.getLogger(ResetPlataformaKeepQaService.class);

    private final JdbcTemplate jdbc;

    public ResetPlataformaKeepQaService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public static List<String> correosConservados() {
        return List.of(
            Constants.CORREO_ADMIN.toLowerCase(),
            Constants.CORREO_QA_EMPRENDEDOR.toLowerCase(),
            Constants.CORREO_QA_PYME.toLowerCase(),
            Constants.CORREO_QA_NEGOCIO_PLUS.toLowerCase(),
            CORREO_MOSTRADOR.toLowerCase()
        );
    }

    @Transactional
    public Map<String, Object> ejecutarSiPendiente() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS hot_click_one_shot_tb (
                clave VARCHAR(80) PRIMARY KEY,
                ejecutado_en TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """);
        int insertados = jdbc.update(
            "INSERT INTO hot_click_one_shot_tb (clave) VALUES (?) ON CONFLICT DO NOTHING",
            CLAVE_ONE_SHOT);
        if (insertados == 0) {
            LOG.info("Reset plataforma QA ya corrido ({})", CLAVE_ONE_SHOT);
            return Map.of("omitido", true);
        }
        try {
            Map<String, Object> resultado = ejecutar();
            resultado.put("omitido", false);
            return resultado;
        } catch (RuntimeException e) {
            jdbc.update("DELETE FROM hot_click_one_shot_tb WHERE clave = ?", CLAVE_ONE_SHOT);
            throw e;
        }
    }

    @Transactional
    public Map<String, Object> ejecutar() {
        prepararKeep();
        borrarProductosYHijos();
        borrarPedidosPagosCarritos();
        borrarNegociosAjenos();
        borrarUsuariosAjenos();
        resetSecuenciaProducto();
        Map<String, Object> resumen = contarRestantes();
        LOG.info("Reset plataforma QA listo: {}", resumen);
        return resumen;
    }

    private void prepararKeep() {
        jdbc.execute("DROP TABLE IF EXISTS tmp_keep_correo");
        jdbc.execute("DROP TABLE IF EXISTS tmp_keep_usuario");
        jdbc.execute("DROP TABLE IF EXISTS tmp_keep_empresa");
        jdbc.execute("CREATE TEMP TABLE tmp_keep_correo (correo TEXT PRIMARY KEY)");
        for (String correo : correosConservados()) {
            jdbc.update("INSERT INTO tmp_keep_correo (correo) VALUES (?)", correo);
        }
        String adminExtra = System.getenv("ADMIN_EMAIL");
        if (adminExtra != null && !adminExtra.isBlank()) {
            jdbc.update(
                "INSERT INTO tmp_keep_correo (correo) VALUES (?) ON CONFLICT DO NOTHING",
                adminExtra.trim().toLowerCase());
        }
        jdbc.execute("""
            CREATE TEMP TABLE tmp_keep_usuario AS
            SELECT u.id_usuario
              FROM hot_click_usuario_tb u
             WHERE lower(u.correo) IN (SELECT correo FROM tmp_keep_correo)
            UNION
            SELECT ur.fk_id_usuario
              FROM hot_click_usuario_rol_tb ur
              JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol
             WHERE r.nombre_rol = 'ADMIN'
            """);
        jdbc.execute("""
            CREATE TEMP TABLE tmp_keep_empresa AS
            SELECT DISTINCT e.id_empresa
              FROM hot_click_empresa_tb e
             WHERE lower(e.correo_empresa) IN (SELECT correo FROM tmp_keep_correo)
                OR e.id_empresa IN (
                    SELECT u.fk_id_empresa
                      FROM hot_click_usuario_tb u
                     WHERE u.id_usuario IN (SELECT id_usuario FROM tmp_keep_usuario)
                       AND u.fk_id_empresa IS NOT NULL
                )
            """);
    }

    private void borrarProductosYHijos() {
        exec("DELETE FROM hot_click_pedido_item_tb");
        exec("DELETE FROM hot_click_carrito_item_tb");
        exec("DELETE FROM hot_click_cotizacion_item_tb");
        exec("DELETE FROM hot_click_orden_compra_item_tb");
        exec("DELETE FROM hot_click_producto_imagen_tb");
        exec("DELETE FROM hot_click_producto_video_tb");
        exec("DELETE FROM hot_click_producto_etiqueta_tb");
        exec("DELETE FROM hot_click_producto_atributo_asignacion_tb");
        exec("DELETE FROM hot_click_producto_variante_atributo_tb");
        exec("DELETE FROM hot_click_producto_variante_tb");
        exec("DELETE FROM hot_click_producto_embedding_tb");
        exec("DELETE FROM hot_click_movimiento_stock_tb");
        exec("DELETE FROM hot_click_publicacion_fb_tb");
        exec("DELETE FROM hot_click_reporte_producto_tb");
        exec("DELETE FROM hot_click_solicitud_garantia_tb");
        exec("DELETE FROM hot_click_precio_sugerido_tb");
        exec("DELETE FROM hot_click_testimonio_tb");
        exec("DELETE FROM hot_click_premio_tb");
        exec("DELETE FROM hot_click_producto_tb");
    }

    private void borrarPedidosPagosCarritos() {
        exec("DELETE FROM hot_click_split_pago_tb");
        exec("DELETE FROM hot_click_pago_tb");
        exec("DELETE FROM hot_click_transaccion_pago_tb");
        exec("DELETE FROM hot_click_comprobante_sinpe_tb");
        exec("DELETE FROM hot_click_comprobante_fiscal_tb");
        exec("DELETE FROM hot_click_pedido_historial_estado_tb");
        exec("DELETE FROM hot_click_factura_detalle_tb");
        exec("DELETE FROM hot_click_factura_tb");
        exec("DELETE FROM hot_click_giro_ruleta_tb");
        exec("DELETE FROM hot_click_resultado_ruleta_tb");
        exec("DELETE FROM hot_click_pedido_tb");
        exec("DELETE FROM hot_click_carrito_tb");
        exec("DELETE FROM hot_click_carrito_abandonado_tb");
        exec("DELETE FROM hot_click_pos_qr_sesion_tb");
        exec("DELETE FROM hot_click_turno_caja_tb");
        exec("DELETE FROM hot_click_encargo_evento_tb");
        exec("DELETE FROM hot_click_wallet_transaccion_tb");
        exec("DELETE FROM hot_click_referido_detalle_tb");
        exec("DELETE FROM hot_click_referido_tb");
    }

    private void borrarNegociosAjenos() {
        execNotKeepEmpresa("hot_click_cotizacion_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_cotizacion_tb", "empresa_id");
        exec("DELETE FROM hot_click_cotizacion_cliente_tb WHERE empresa_id IS NULL OR empresa_id NOT IN (SELECT id_empresa FROM tmp_keep_empresa)");
        execNotKeepEmpresa("hot_click_encargo_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_solicitud_servicio_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_solicitud_recoleccion_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_solicitud_aprobacion_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_solicitud_especial_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_ticket_soporte_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_gift_card_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_metodo_cobro_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_sucursal_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_marca_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_proveedor_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_gasto_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_orden_compra_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_factura_saas_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_billing_ledger_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_payout_request_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_wallet_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_suscripcion_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_forecast_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_reporte_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_mesa_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_cupon_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_ai_mensaje_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_ai_uso_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_chat_mensaje_shopping_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_chat_sesion_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_telegram_vinculacion_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_empresa_config_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_empresa_feature_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_cupo_emprendedor_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_api_key_tb", "fk_id_empresa");
        execNotKeepEmpresa("hot_click_categoria_tb", "fk_id_empresa");
        exec("DELETE FROM hot_click_miembro_empresa_tb WHERE fk_id_empresa NOT IN (SELECT id_empresa FROM tmp_keep_empresa) OR fk_id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("UPDATE hot_click_wa_log_tb SET fk_id_empresa = NULL WHERE fk_id_empresa NOT IN (SELECT id_empresa FROM tmp_keep_empresa)");
        exec("UPDATE hot_click_empresa_tb SET fk_id_bodega_venta_online = NULL WHERE id_empresa NOT IN (SELECT id_empresa FROM tmp_keep_empresa)");
        exec("DELETE FROM hot_click_bodega_usuario_tb WHERE fk_id_bodega IN (SELECT id_bodega FROM hot_click_bodega_tb WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM tmp_keep_empresa))");
        exec("DELETE FROM hot_click_bodega_ubicacion_tb WHERE fk_id_bodega IN (SELECT id_bodega FROM hot_click_bodega_tb WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM tmp_keep_empresa))");
        exec("DELETE FROM hot_click_bodega_historial_tb WHERE fk_id_bodega IN (SELECT id_bodega FROM hot_click_bodega_tb WHERE fk_id_empresa IS NULL OR fk_id_empresa NOT IN (SELECT id_empresa FROM tmp_keep_empresa))");
        execNotKeepEmpresa("hot_click_bodega_tb", "fk_id_empresa");
    }

    private void borrarUsuariosAjenos() {
        exec("DELETE FROM hot_click_sesion_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("DELETE FROM hot_click_refresh_token_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("DELETE FROM hot_click_webauthn_credential_tb WHERE user_id NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("DELETE FROM hot_click_codigo_otp_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("DELETE FROM hot_click_usuario_rol_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("DELETE FROM hot_click_usuario_direccion_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("UPDATE hot_click_usuario_tb SET fk_id_empresa = NULL WHERE id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("DELETE FROM hot_click_usuario_tb WHERE id_usuario NOT IN (SELECT id_usuario FROM tmp_keep_usuario)");
        exec("DELETE FROM hot_click_empresa_tb WHERE id_empresa NOT IN (SELECT id_empresa FROM tmp_keep_empresa)");
    }

    private void resetSecuenciaProducto() {
        exec("SELECT setval(pg_get_serial_sequence('hot_click_producto_tb', 'id_producto'), 1, false)");
    }

    private Map<String, Object> contarRestantes() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("productos", count("hot_click_producto_tb"));
        out.put("empresas", count("hot_click_empresa_tb"));
        out.put("usuarios", count("hot_click_usuario_tb"));
        out.put("conservados", correosConservados());
        return out;
    }

    private long count(String tabla) {
        try {
            Long n = jdbc.queryForObject("SELECT COUNT(*) FROM " + tabla, Long.class);
            return n == null ? 0 : n;
        } catch (DataAccessException e) {
            if (ignorable(e)) return 0;
            throw e;
        }
    }

    private void execNotKeepEmpresa(String tabla, String columna) {
        exec("DELETE FROM " + tabla + " WHERE " + columna + " IS NULL OR " + columna
            + " NOT IN (SELECT id_empresa FROM tmp_keep_empresa)");
    }

    private void exec(String sql) {
        try {
            jdbc.execute(sql);
        } catch (DataAccessException e) {
            if (ignorable(e)) {
                LOG.debug("Reset skip {}: {}", sql, rootMessage(e));
                return;
            }
            throw e;
        }
    }

    private boolean ignorable(DataAccessException e) {
        SQLException sql = findSql(e);
        if (sql == null) return false;
        String state = sql.getSQLState();
        return "42P01".equals(state) || "42703".equals(state);
    }

    private SQLException findSql(Throwable e) {
        Throwable cur = e;
        while (cur != null) {
            if (cur instanceof SQLException s) return s;
            cur = cur.getCause();
        }
        return null;
    }

    private String rootMessage(DataAccessException e) {
        Throwable c = e.getMostSpecificCause();
        return c.getMessage() == null ? e.getMessage() : c.getMessage();
    }
}
