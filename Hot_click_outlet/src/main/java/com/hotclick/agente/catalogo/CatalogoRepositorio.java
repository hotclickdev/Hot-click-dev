package com.hotclick.agente.catalogo;

import com.hotclick.catalogo.CatalogoPublicoGate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Acceso a {@code hot_click_agente_catalogo_tb} (un catálogo de Meta por negocio), a los productos ya sincronizados y a
 * los productos VISIBLES del negocio. Visible = la regla exacta del catálogo público (skill
 * visibilidad-catalogo-marketplace): activo, {@code visible_catalogo}, no vendido, empresa ACTIVA, pública y con
 * membresía confirmada. Toda consulta lleva la empresa.
 */
@Repository
public class CatalogoRepositorio {

    public record Conexion(Long empresaId, String catalogoId, String estado, Instant ultimaSync, String ultimoError) { }

    /** Producto visible con lo que Meta necesita. */
    public record ProductoFila(Long id, String nombre, String descripcion, int precio, int stock, String imagenUrl,
                               String condicion, String marca, String slug, String negocio) { }

    public record Item(String huella, String estado, String metaProductoId) { }

    private static final RowMapper<Conexion> CONEXION = (rs, i) -> new Conexion(rs.getLong("fk_id_empresa"),
        rs.getString("catalogo_id"), rs.getString("estado"),
        rs.getTimestamp("ultima_sync_en") == null ? null : rs.getTimestamp("ultima_sync_en").toInstant(),
        rs.getString("ultimo_error"));

    private static final RowMapper<ProductoFila> PRODUCTO = (rs, i) -> new ProductoFila(rs.getLong("id_producto"),
        rs.getString("nombre_producto"), rs.getString("descripcion_corta"), rs.getInt("precio_venta"),
        rs.getInt("disponible"), rs.getString("imagen_principal_url"), rs.getString("condicion"),
        rs.getString("marca"), rs.getString("slug"), rs.getString("negocio"));

    private static final String SELECT_VISIBLES = "SELECT p.id_producto, p.nombre_producto, p.descripcion_corta, "
        + "p.precio_venta, (p.stock_actual - COALESCE(p.stock_reservado, 0)) AS disponible, p.imagen_principal_url, "
        + "p.condicion, p.marca, e.slug, COALESCE(e.nombre_comercial, e.nombre_empresa) AS negocio "
        + "FROM hot_click_producto_tb p INNER JOIN hot_click_empresa_tb e ON p.fk_id_empresa = e.id_empresa "
        + "WHERE p.fk_id_empresa = ? AND p.fk_id_estado = 1 AND p.visible_catalogo = TRUE AND p.vendido = FALSE "
        + "AND e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE AND " + CatalogoPublicoGate.NATIVA_E;

    private final JdbcTemplate jdbc;

    public CatalogoRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── conexión ────────────────────────────────────────────────────────────

    public Optional<Conexion> conexion(Long empresaId) {
        return jdbc.query("SELECT fk_id_empresa, catalogo_id, estado, ultima_sync_en, ultimo_error "
            + "FROM hot_click_agente_catalogo_tb WHERE fk_id_empresa = ?", CONEXION, empresaId).stream().findFirst();
    }

    /** Conexión ACTIVA o vacío: sin catálogo conectado el resto del módulo no hace nada. */
    public Optional<Conexion> conexionActiva(Long empresaId) {
        return conexion(empresaId).filter(c -> "ACTIVO".equals(c.estado()));
    }

    public List<Long> empresasConCatalogoActivo() {
        return jdbc.queryForList("SELECT fk_id_empresa FROM hot_click_agente_catalogo_tb WHERE estado = 'ACTIVO' "
            + "ORDER BY fk_id_empresa", Long.class);
    }

    public void guardarConexion(Long empresaId, String catalogoId, Instant ahora) {
        int n = jdbc.update("UPDATE hot_click_agente_catalogo_tb SET catalogo_id = ?, estado = 'ACTIVO', "
            + "ultimo_error = NULL WHERE fk_id_empresa = ?", catalogoId, empresaId);
        if (n == 0) {
            jdbc.update("INSERT INTO hot_click_agente_catalogo_tb (fk_id_empresa, catalogo_id, creado_en) VALUES (?,?,?)",
                empresaId, catalogoId, Timestamp.from(ahora));
        }
    }

    public void desconectar(Long empresaId) {
        jdbc.update("DELETE FROM hot_click_agente_catalogo_item_tb WHERE fk_id_empresa = ?", empresaId);
        jdbc.update("DELETE FROM hot_click_agente_catalogo_tb WHERE fk_id_empresa = ?", empresaId);
    }

    /** @param error código corto (META_190, META_CAIDA…) o null si salió bien */
    public void registrarSync(Long empresaId, String error, Instant ahora) {
        jdbc.update("UPDATE hot_click_agente_catalogo_tb SET ultima_sync_en = ?, ultimo_error = ? WHERE fk_id_empresa = ?",
            Timestamp.from(ahora), error, empresaId);
    }

    // ── productos visibles ──────────────────────────────────────────────────

    /** Página de productos visibles con id mayor a {@code despuesDe} (paginación por llave, sin OFFSET). */
    public List<ProductoFila> visibles(Long empresaId, long despuesDe, int limite) {
        return jdbc.query(SELECT_VISIBLES + " AND p.id_producto > ? ORDER BY p.id_producto LIMIT ?", PRODUCTO,
            empresaId, despuesDe, limite);
    }

    /** Un producto SOLO si es visible y del negocio; si no, vacío (otro negocio u oculto responden igual). */
    public Optional<ProductoFila> visible(Long empresaId, long productoId) {
        return jdbc.query(SELECT_VISIBLES + " AND p.id_producto = ?", PRODUCTO, empresaId, productoId)
            .stream().findFirst();
    }

    /** Visibles entre los ids dados (una consulta), para armar tarjetas. */
    public List<ProductoFila> visiblesEntre(Long empresaId, Collection<Long> ids) {
        if (ids.isEmpty()) return List.of();
        String marcas = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        Object[] args = new Object[ids.size() + 1];
        args[0] = empresaId;
        int i = 1;
        for (Long id : ids) args[i++] = id;
        return jdbc.query(SELECT_VISIBLES + " AND p.id_producto IN (" + marcas + ") ORDER BY p.id_producto",
            PRODUCTO, args);
    }

    // ── productos ya sincronizados ──────────────────────────────────────────

    public Map<Long, Item> items(Long empresaId) {
        Map<Long, Item> out = new HashMap<>();
        jdbc.query("SELECT fk_id_producto, huella, estado, meta_producto_id FROM hot_click_agente_catalogo_item_tb "
            + "WHERE fk_id_empresa = ?", rs -> {
                out.put(rs.getLong("fk_id_producto"),
                    new Item(rs.getString("huella"), rs.getString("estado"), rs.getString("meta_producto_id")));
            }, empresaId);
        return out;
    }

    public Optional<Item> item(Long empresaId, long productoId) {
        return jdbc.query("SELECT huella, estado, meta_producto_id FROM hot_click_agente_catalogo_item_tb "
            + "WHERE fk_id_empresa = ? AND fk_id_producto = ?",
            (rs, i) -> new Item(rs.getString("huella"), rs.getString("estado"), rs.getString("meta_producto_id")),
            empresaId, productoId).stream().findFirst();
    }

    /** Marca productos como sincronizados con su huella (alta o cambio). */
    public void guardarItems(Long empresaId, Map<Long, String> huellas, Instant ahora) {
        if (huellas.isEmpty()) return;
        Timestamp t = Timestamp.from(ahora);
        List<Map.Entry<Long, String>> filas = List.copyOf(huellas.entrySet());
        int[][] resultados = jdbc.batchUpdate("UPDATE hot_click_agente_catalogo_item_tb SET huella = ?, "
            + "estado = 'SINCRONIZADO', sincronizado_en = ? WHERE fk_id_empresa = ? AND fk_id_producto = ?",
            filas, 500, (ps, e) -> {
                ps.setString(1, e.getValue());
                ps.setTimestamp(2, t);
                ps.setLong(3, empresaId);
                ps.setLong(4, e.getKey());
            });
        int[] r = java.util.Arrays.stream(resultados).flatMapToInt(java.util.Arrays::stream).toArray();
        List<Map.Entry<Long, String>> nuevos = new java.util.ArrayList<>();
        int idx = 0;
        for (Map.Entry<Long, String> e : filas) {
            if (r[idx++] == 0) nuevos.add(e);
        }
        jdbc.batchUpdate("INSERT INTO hot_click_agente_catalogo_item_tb (fk_id_empresa, fk_id_producto, huella, "
            + "sincronizado_en) VALUES (?,?,?,?)", nuevos, 500, (ps, e) -> {
                ps.setLong(1, empresaId);
                ps.setLong(2, e.getKey());
                ps.setString(3, e.getValue());
                ps.setTimestamp(4, t);
            });
    }

    public void marcarEliminados(Long empresaId, Collection<Long> productoIds, Instant ahora) {
        if (productoIds.isEmpty()) return;
        Timestamp t = Timestamp.from(ahora);
        jdbc.batchUpdate("UPDATE hot_click_agente_catalogo_item_tb SET estado = 'ELIMINADO', sincronizado_en = ? "
            + "WHERE fk_id_empresa = ? AND fk_id_producto = ?", productoIds, 500, (ps, id) -> {
                ps.setTimestamp(1, t);
                ps.setLong(2, empresaId);
                ps.setLong(3, id);
            });
    }

    public void guardarMetaProductoId(Long empresaId, long productoId, String metaProductoId) {
        jdbc.update("UPDATE hot_click_agente_catalogo_item_tb SET meta_producto_id = ? "
            + "WHERE fk_id_empresa = ? AND fk_id_producto = ?", metaProductoId, empresaId, productoId);
    }

    public int contarSincronizados(Long empresaId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_catalogo_item_tb "
            + "WHERE fk_id_empresa = ? AND estado = 'SINCRONIZADO'", Integer.class, empresaId);
        return n == null ? 0 : n;
    }
}
