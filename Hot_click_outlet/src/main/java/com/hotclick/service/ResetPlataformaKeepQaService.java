package com.hotclick.service;

import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Borra productos, tiendas y usuarios registrados.
 * Conserva admin, 3 cuentas QA y el usuario de mostrador del POS.
 */
@Service
public class ResetPlataformaKeepQaService {

    /** Clave nueva: la corrida anterior pudo marcarse hecha sin borrar tiendas/productos. */
    public static final String CLAVE_ONE_SHOT = "reset-keep-qa-tiendas-2026-09-17";
    public static final String CONFIRMACION = "ELIMINAR PLATAFORMA";
    public static final String CORREO_MOSTRADOR = "mostrador@hotclick.internal";

    private static final Logger LOG = LoggerFactory.getLogger(ResetPlataformaKeepQaService.class);
    private static final String KEEP_CORREO = "hot_click_wipe_keep_correo";
    private static final String KEEP_USUARIO = "hot_click_wipe_keep_usuario";
    private static final String KEEP_EMPRESA = "hot_click_wipe_keep_empresa";

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

    public static List<String> correosVisiblesAdmin() {
        return List.of(
            Constants.CORREO_ADMIN.toLowerCase(),
            Constants.CORREO_QA_EMPRENDEDOR.toLowerCase(),
            Constants.CORREO_QA_PYME.toLowerCase(),
            Constants.CORREO_QA_NEGOCIO_PLUS.toLowerCase()
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
        if (insertados == 0 && !hayTiendasOProductosSobrantes()) {
            LOG.info("Reset plataforma QA ya corrido ({})", CLAVE_ONE_SHOT);
            return Map.of("omitido", true);
        }
        try {
            Map<String, Object> resultado = ejecutar();
            resultado.put("omitido", false);
            jdbc.update(
                "INSERT INTO hot_click_one_shot_tb (clave) VALUES (?) ON CONFLICT DO NOTHING",
                CLAVE_ONE_SHOT);
            return resultado;
        } catch (RuntimeException e) {
            jdbc.update("DELETE FROM hot_click_one_shot_tb WHERE clave = ?", CLAVE_ONE_SHOT);
            throw e;
        }
    }

    @Transactional
    public Map<String, Object> ejecutar() {
        prepararKeep();
        intentarSinForeignKeys();
        borrarTodasLasFilasQueApuntanA("hot_click_producto_tb");
        exec("DELETE FROM hot_click_producto_tb");
        borrarHijosDeEmpresaSalvoUsuario();
        exec("UPDATE hot_click_usuario_tb SET fk_id_empresa = NULL WHERE id_usuario NOT IN (SELECT id_usuario FROM "
            + KEEP_USUARIO + ")");
        exec("DELETE FROM hot_click_empresa_tb WHERE id_empresa NOT IN (SELECT id_empresa FROM " + KEEP_EMPRESA + ")");
        borrarUsuariosAjenos();
        resetSecuenciaProducto();
        Map<String, Object> resumen = contarRestantes();
        LOG.info("Reset plataforma QA listo: {}", resumen);
        return resumen;
    }

    private boolean hayTiendasOProductosSobrantes() {
        long productos = count("hot_click_producto_tb");
        if (productos > 0) return true;
        prepararKeep();
        long extra = count("hot_click_empresa_tb WHERE id_empresa NOT IN (SELECT id_empresa FROM " + KEEP_EMPRESA + ")");
        return extra > 0;
    }

    private void intentarSinForeignKeys() {
        try {
            jdbc.execute("SET LOCAL session_replication_role = replica");
        } catch (DataAccessException e) {
            LOG.warn("Sin permiso para session_replication_role; se borra por FKs. {}", rootMessage(e));
        }
    }

    private void prepararKeep() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS " + KEEP_CORREO + " (correo TEXT PRIMARY KEY)");
        jdbc.execute("CREATE TABLE IF NOT EXISTS " + KEEP_USUARIO + " (id_usuario BIGINT PRIMARY KEY)");
        jdbc.execute("CREATE TABLE IF NOT EXISTS " + KEEP_EMPRESA + " (id_empresa BIGINT PRIMARY KEY)");
        jdbc.execute("TRUNCATE " + KEEP_CORREO + ", " + KEEP_USUARIO + ", " + KEEP_EMPRESA);
        for (String correo : correosConservados()) {
            jdbc.update("INSERT INTO " + KEEP_CORREO + " (correo) VALUES (?) ON CONFLICT DO NOTHING", correo);
        }
        String adminExtra = System.getenv("ADMIN_EMAIL");
        if (adminExtra != null && !adminExtra.isBlank()) {
            jdbc.update(
                "INSERT INTO " + KEEP_CORREO + " (correo) VALUES (?) ON CONFLICT DO NOTHING",
                adminExtra.trim().toLowerCase());
        }
        jdbc.execute("""
            INSERT INTO hot_click_wipe_keep_usuario (id_usuario)
            SELECT u.id_usuario
              FROM hot_click_usuario_tb u
             WHERE lower(u.correo) IN (SELECT correo FROM hot_click_wipe_keep_correo)
            UNION
            SELECT ur.fk_id_usuario
              FROM hot_click_usuario_rol_tb ur
              JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol
             WHERE r.nombre_rol = 'ADMIN'
            ON CONFLICT DO NOTHING
            """);
        jdbc.execute("""
            INSERT INTO hot_click_wipe_keep_empresa (id_empresa)
            SELECT DISTINCT e.id_empresa
              FROM hot_click_empresa_tb e
             WHERE lower(e.correo_empresa) IN (SELECT correo FROM hot_click_wipe_keep_correo)
                OR e.id_empresa IN (
                    SELECT u.fk_id_empresa
                      FROM hot_click_usuario_tb u
                     WHERE u.id_usuario IN (SELECT id_usuario FROM hot_click_wipe_keep_usuario)
                       AND u.fk_id_empresa IS NOT NULL
                )
            ON CONFLICT DO NOTHING
            """);
    }

    private void borrarTodasLasFilasQueApuntanA(String tabla) {
        Set<String> visitados = new HashSet<>();
        for (String hijo : tablasQueReferencian(tabla)) {
            vaciarTablaYDescendientes(hijo, visitados);
        }
    }

    private void borrarHijosDeEmpresaSalvoUsuario() {
        Set<String> visitados = new HashSet<>();
        for (String hijo : tablasQueReferencian("hot_click_empresa_tb")) {
            if (esTablaUsuarioOEmpresa(hijo)) continue;
            vaciarTablaYDescendientes(hijo, visitados);
        }
        exec("UPDATE hot_click_wa_log_tb SET fk_id_empresa = NULL WHERE fk_id_empresa NOT IN (SELECT id_empresa FROM "
            + KEEP_EMPRESA + ")");
        exec("UPDATE hot_click_empresa_tb SET fk_id_bodega_venta_online = NULL");
    }

    private void vaciarTablaYDescendientes(String tabla, Set<String> visitados) {
        if (!visitados.add(tabla) || esTablaUsuarioOEmpresa(tabla) || esTablaKeep(tabla)) {
            return;
        }
        for (String nieto : tablasQueReferencian(tabla)) {
            vaciarTablaYDescendientes(nieto, visitados);
        }
        exec("DELETE FROM " + tabla);
    }

    private List<String> tablasQueReferencian(String tabla) {
        try {
            return jdbc.query("""
                SELECT DISTINCT quote_ident(n.nspname) || '.' || quote_ident(rel.relname) AS tbl
                  FROM pg_constraint con
                  JOIN pg_class rel ON rel.oid = con.conrelid
                  JOIN pg_namespace n ON n.oid = rel.relnamespace
                 WHERE con.contype = 'f'
                   AND con.confrelid = to_regclass(?)
                   AND n.nspname NOT IN ('pg_catalog', 'information_schema')
                   AND rel.relname NOT LIKE 'hot_click_wipe_keep%'
                """, (rs, i) -> rs.getString("tbl"), tabla);
        } catch (DataAccessException e) {
            if (ignorable(e)) return List.of();
            throw e;
        }
    }

    private boolean esTablaUsuarioOEmpresa(String tabla) {
        String n = tabla.toLowerCase();
        return n.endsWith(".hot_click_usuario_tb") || n.endsWith("hot_click_usuario_tb")
            || n.endsWith(".hot_click_empresa_tb") || n.endsWith("hot_click_empresa_tb");
    }

    private boolean esTablaKeep(String tabla) {
        return tabla.toLowerCase().contains("hot_click_wipe_keep");
    }

    private void borrarUsuariosAjenos() {
        exec("DELETE FROM hot_click_sesion_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM " + KEEP_USUARIO + ")");
        exec("DELETE FROM hot_click_refresh_token_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM " + KEEP_USUARIO + ")");
        exec("DELETE FROM hot_click_webauthn_credential_tb WHERE user_id NOT IN (SELECT id_usuario FROM " + KEEP_USUARIO + ")");
        exec("DELETE FROM hot_click_codigo_otp_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM " + KEEP_USUARIO + ")");
        exec("DELETE FROM hot_click_usuario_rol_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM " + KEEP_USUARIO + ")");
        exec("DELETE FROM hot_click_usuario_direccion_tb WHERE fk_id_usuario NOT IN (SELECT id_usuario FROM " + KEEP_USUARIO + ")");
        exec("UPDATE hot_click_usuario_tb SET fk_id_empresa = NULL WHERE id_usuario NOT IN (SELECT id_usuario FROM "
            + KEEP_USUARIO + ")");
        exec("DELETE FROM hot_click_usuario_tb WHERE id_usuario NOT IN (SELECT id_usuario FROM " + KEEP_USUARIO + ")");
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
        out.put("visiblesAdmin", correosVisiblesAdmin());
        return out;
    }

    private long count(String from) {
        try {
            Long n = jdbc.queryForObject("SELECT COUNT(*) FROM " + from, Long.class);
            return n == null ? 0 : n;
        } catch (DataAccessException e) {
            if (ignorable(e)) return 0;
            throw e;
        }
    }

    private void exec(String sql) {
        try {
            jdbc.execute(sql);
        } catch (DataAccessException e) {
            if (ignorable(e)) {
                LOG.debug("Reset skip {}: {}", sql, rootMessage(e));
                return;
            }
            LOG.error("Reset falló: {} — {}", sql, rootMessage(e));
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
