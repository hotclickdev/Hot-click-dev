package com.hotclick.agente.campana;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Acceso a {@code hot_click_agente_campana_tb} y {@code hot_click_agente_campana_envio_tb}. Toda lectura o cambio por
 * id lleva la empresa. Los cambios de estado son UPDATE condicionales atómicos (sin leer y luego escribir), así dos
 * lanzamientos o dos acuses simultáneos no se pisan. Solo hashes de contacto, nunca el contacto en claro.
 */
@Repository
public class CampanaRepositorio {

    public static final String BORRADOR = "BORRADOR";
    public static final String EN_CURSO = "EN_CURSO";
    public static final String COMPLETADA = "COMPLETADA";
    public static final String CANCELADA = "CANCELADA";

    public record Campana(Long id, Long empresaId, Long plantillaId, String nombre, Segmento segmento, String parametros,
                          String estado, Instant programadaPara, int destinatarios, BigDecimal costoEstimadoUsd,
                          Instant lanzadaEn, Instant finalizadaEn, Instant creadoEn) { }

    public record Envio(Long id, String hash, int intentos) {
        @Override
        public String toString() {
            return "Envio[" + id + "]";
        }
    }

    /** Contadores acumulados: cada uno cuenta los envíos que llegaron AL MENOS a ese punto. */
    public record Metricas(int total, int pendientes, int enviados, int entregados, int leidos, int respondidos,
                           int fallidos, int omitidos) {
        public static final Metricas VACIA = new Metricas(0, 0, 0, 0, 0, 0, 0, 0);
    }

    private static final RowMapper<Campana> MAPPER = (rs, i) -> new Campana(
        rs.getLong("id_campana"), rs.getLong("fk_id_empresa"), rs.getLong("fk_id_plantilla"), rs.getString("nombre"),
        new Segmento(Segmento.Tipo.valueOf(rs.getString("segmento")), (Integer) rs.getObject("segmento_dias"),
            (Long) rs.getObject("segmento_categoria_id")),
        rs.getString("parametros"), rs.getString("estado"), instante(rs.getTimestamp("programada_para")),
        rs.getInt("destinatarios"), rs.getBigDecimal("costo_estimado_usd"), instante(rs.getTimestamp("lanzada_en")),
        instante(rs.getTimestamp("finalizada_en")), rs.getTimestamp("creado_en").toInstant());

    private static final String COLS = "id_campana, fk_id_empresa, fk_id_plantilla, nombre, segmento, segmento_dias, "
        + "segmento_categoria_id, parametros, estado, programada_para, destinatarios, costo_estimado_usd, lanzada_en, "
        + "finalizada_en, creado_en";

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate nombrado;

    public CampanaRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.nombrado = new NamedParameterJdbcTemplate(jdbc);
    }

    private static Instant instante(Timestamp t) {
        return t == null ? null : t.toInstant();
    }

    // ── campañas ────────────────────────────────────────────────────────────

    public long insertar(Long empresaId, Long plantillaId, String nombre, Segmento seg, String parametros,
                         Instant programadaPara, Long usuarioId, Instant ahora) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("INSERT INTO hot_click_agente_campana_tb (fk_id_empresa, "
                + "fk_id_plantilla, nombre, segmento, segmento_dias, segmento_categoria_id, parametros, programada_para, "
                + "fk_id_usuario, creado_en) VALUES (?,?,?,?,?,?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, empresaId);
            ps.setLong(2, plantillaId);
            ps.setString(3, nombre);
            ps.setString(4, seg.tipo().name());
            ps.setObject(5, seg.dias());
            ps.setObject(6, seg.categoriaId());
            ps.setString(7, parametros);
            ps.setTimestamp(8, programadaPara == null ? null : Timestamp.from(programadaPara));
            ps.setObject(9, usuarioId);
            ps.setTimestamp(10, Timestamp.from(ahora));
            return ps;
        }, kh);
        Number id = kh.getKeys() == null ? null : (Number) kh.getKeys().get("id_campana");
        return id == null ? 0L : id.longValue();
    }

    public Optional<Campana> obtener(Long empresaId, long id) {
        return jdbc.query("SELECT " + COLS + " FROM hot_click_agente_campana_tb WHERE id_campana = ? AND fk_id_empresa = ?",
            MAPPER, id, empresaId).stream().findFirst();
    }

    public List<Campana> listar(Long empresaId, int limite) {
        return jdbc.query("SELECT " + COLS + " FROM hot_click_agente_campana_tb WHERE fk_id_empresa = ? "
            + "ORDER BY id_campana DESC LIMIT ?", MAPPER, empresaId, limite);
    }

    /** Campañas EN_CURSO cuya hora programada ya llegó, de cualquier negocio (solo las usa el scheduler). */
    public List<Campana> listosParaEnviar(Instant ahora, int limite) {
        return jdbc.query("SELECT " + COLS + " FROM hot_click_agente_campana_tb WHERE estado = 'EN_CURSO' "
            + "AND (programada_para IS NULL OR programada_para <= ?) ORDER BY id_campana LIMIT ?",
            MAPPER, Timestamp.from(ahora), limite);
    }

    /** BORRADOR → EN_CURSO, una sola vez. @return false si ya no era borrador (otro lanzamiento ganó). */
    public boolean lanzar(Long empresaId, long id, int destinatarios, BigDecimal costo, Instant ahora) {
        return jdbc.update("UPDATE hot_click_agente_campana_tb SET estado = 'EN_CURSO', destinatarios = ?, "
            + "costo_estimado_usd = ?, lanzada_en = ? WHERE id_campana = ? AND fk_id_empresa = ? AND estado = 'BORRADOR'",
            destinatarios, costo, Timestamp.from(ahora), id, empresaId) > 0;
    }

    /** Cancela un borrador o una campaña en curso; los envíos pendientes pasan a OMITIDO. */
    public boolean cancelar(Long empresaId, long id, Instant ahora) {
        boolean ok = jdbc.update("UPDATE hot_click_agente_campana_tb SET estado = 'CANCELADA', finalizada_en = ? "
            + "WHERE id_campana = ? AND fk_id_empresa = ? AND estado IN ('BORRADOR', 'EN_CURSO')",
            Timestamp.from(ahora), id, empresaId) > 0;
        if (ok) {
            jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET estado = 'OMITIDO', motivo = 'CANCELADA' "
                + "WHERE fk_id_campana = ? AND estado = 'PENDIENTE'", id);
        }
        return ok;
    }

    /** EN_CURSO → COMPLETADA cuando no quedan envíos pendientes. */
    public boolean completarSiTermino(long id, Instant ahora) {
        return jdbc.update("UPDATE hot_click_agente_campana_tb SET estado = 'COMPLETADA', finalizada_en = ? "
            + "WHERE id_campana = ? AND estado = 'EN_CURSO' AND NOT EXISTS ("
            + "SELECT 1 FROM hot_click_agente_campana_envio_tb WHERE fk_id_campana = ? AND estado = 'PENDIENTE')",
            Timestamp.from(ahora), id, id) > 0;
    }

    // ── envíos ──────────────────────────────────────────────────────────────

    /** Crea los envíos PENDIENTES en un solo lote; repetir un contacto en la misma campaña se ignora. */
    public void crearEnvios(long campanaId, Long empresaId, Collection<String> hashes, Instant ahora) {
        if (hashes.isEmpty()) return;
        Timestamp t = Timestamp.from(ahora);
        jdbc.batchUpdate("INSERT INTO hot_click_agente_campana_envio_tb (fk_id_campana, fk_id_empresa, contacto_hash, "
            + "creado_en) VALUES (?,?,?,?) ON CONFLICT DO NOTHING", hashes, 500, (ps, h) -> {
                ps.setLong(1, campanaId);
                ps.setLong(2, empresaId);
                ps.setString(3, h);
                ps.setTimestamp(4, t);
            });
    }

    public List<Envio> pendientes(long campanaId, int limite) {
        return jdbc.query("SELECT id_envio, contacto_hash, intentos FROM hot_click_agente_campana_envio_tb "
            + "WHERE fk_id_campana = ? AND estado = 'PENDIENTE' ORDER BY id_envio LIMIT ?",
            (rs, i) -> new Envio(rs.getLong("id_envio"), rs.getString("contacto_hash"), rs.getInt("intentos")),
            campanaId, limite);
    }

    /** Toma el envío para enviarlo: solo uno gana aunque dos procesos lo intenten. */
    public boolean reclamar(long envioId, int intentosActuales) {
        return jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET intentos = intentos + 1 "
            + "WHERE id_envio = ? AND estado = 'PENDIENTE' AND intentos = ?", envioId, intentosActuales) > 0;
    }

    public void marcarEnviado(long envioId, String mensajeId, Instant ahora) {
        jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET estado = 'ENVIADO', meta_mensaje_id = ?, "
            + "enviado_en = ?, motivo = NULL WHERE id_envio = ? AND estado = 'PENDIENTE'",
            mensajeId, Timestamp.from(ahora), envioId);
    }

    public void marcarOmitido(long envioId, String motivo) {
        jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET estado = 'OMITIDO', motivo = ? "
            + "WHERE id_envio = ? AND estado = 'PENDIENTE'", motivo, envioId);
    }

    public void marcarFallido(long envioId, String motivo) {
        jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET estado = 'FALLIDO', motivo = ? "
            + "WHERE id_envio = ? AND estado = 'PENDIENTE'", motivo, envioId);
    }

    /** Envíos de la empresa a esos contactos desde {@code desde}, por contacto (para el tope por contacto). */
    public Map<String, Integer> enviadosDesde(Long empresaId, Collection<String> hashes, Instant desde) {
        Map<String, Integer> out = new HashMap<>();
        if (hashes.isEmpty()) return out;
        nombrado.query("SELECT contacto_hash, COUNT(*) AS n FROM hot_click_agente_campana_envio_tb "
            + "WHERE fk_id_empresa = :e AND contacto_hash IN (:h) AND enviado_en >= :d GROUP BY contacto_hash",
            new MapSqlParameterSource(Map.of("e", empresaId, "h", hashes, "d", Timestamp.from(desde))),
            rs -> {
                out.put(rs.getString("contacto_hash"), rs.getInt("n"));
            });
        return out;
    }

    /** Mensajes de marketing enviados por el negocio desde {@code desde} (tope mensual del plan). */
    public int enviadosDelNegocioDesde(Long empresaId, Instant desde) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_campana_envio_tb "
            + "WHERE fk_id_empresa = ? AND enviado_en >= ?", Integer.class, empresaId, Timestamp.from(desde));
        return n == null ? 0 : n;
    }

    public Metricas metricas(Long empresaId, long campanaId) {
        return jdbc.query("SELECT COUNT(*) AS total, "
            + "SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes, "
            + "SUM(CASE WHEN enviado_en IS NOT NULL THEN 1 ELSE 0 END) AS enviados, "
            + "SUM(CASE WHEN entregado_en IS NOT NULL THEN 1 ELSE 0 END) AS entregados, "
            + "SUM(CASE WHEN leido_en IS NOT NULL THEN 1 ELSE 0 END) AS leidos, "
            + "SUM(CASE WHEN respondido_en IS NOT NULL THEN 1 ELSE 0 END) AS respondidos, "
            + "SUM(CASE WHEN estado = 'FALLIDO' THEN 1 ELSE 0 END) AS fallidos, "
            + "SUM(CASE WHEN estado = 'OMITIDO' THEN 1 ELSE 0 END) AS omitidos "
            + "FROM hot_click_agente_campana_envio_tb WHERE fk_id_campana = ? AND fk_id_empresa = ?",
            rs -> rs.next() ? new Metricas(rs.getInt("total"), rs.getInt("pendientes"), rs.getInt("enviados"),
                rs.getInt("entregados"), rs.getInt("leidos"), rs.getInt("respondidos"), rs.getInt("fallidos"),
                rs.getInt("omitidos")) : Metricas.VACIA, campanaId, empresaId);
    }

    // ── acuses del webhook (idempotentes y monótonos) ───────────────────────

    /** @return filas actualizadas (0 si el mensaje no es de ninguna campaña) */
    public int aplicarAcuse(String mensajeId, String estado, Instant cuando, int codigoError) {
        Timestamp t = Timestamp.from(cuando);
        return switch (estado) {
            case "sent" -> jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET enviado_en = COALESCE(enviado_en, ?) "
                + "WHERE meta_mensaje_id = ?", t, mensajeId);
            case "delivered" -> jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET "
                + "entregado_en = COALESCE(entregado_en, ?), "
                + "estado = CASE WHEN estado = 'ENVIADO' THEN 'ENTREGADO' ELSE estado END WHERE meta_mensaje_id = ?",
                t, mensajeId);
            case "read" -> jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET "
                + "entregado_en = COALESCE(entregado_en, ?), leido_en = COALESCE(leido_en, ?), "
                + "estado = CASE WHEN estado IN ('ENVIADO', 'ENTREGADO') THEN 'LEIDO' ELSE estado END "
                + "WHERE meta_mensaje_id = ?", t, t, mensajeId);
            case "failed" -> jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET "
                + "estado = CASE WHEN estado = 'ENVIADO' THEN 'FALLIDO' ELSE estado END, motivo = ? "
                + "WHERE meta_mensaje_id = ? AND entregado_en IS NULL", "META_" + codigoError, mensajeId);
            default -> 0;
        };
    }

    /** El contacto respondió: marca el último envío suyo reciente que aún no tenía respuesta. */
    public int marcarRespuesta(Long empresaId, String hash, Instant desde, Instant ahora) {
        return jdbc.update("UPDATE hot_click_agente_campana_envio_tb SET respondido_en = ? WHERE id_envio = ("
            + "SELECT id_envio FROM hot_click_agente_campana_envio_tb WHERE fk_id_empresa = ? AND contacto_hash = ? "
            + "AND enviado_en >= ? AND respondido_en IS NULL ORDER BY enviado_en DESC LIMIT 1)",
            Timestamp.from(ahora), empresaId, hash, Timestamp.from(desde));
    }
}
