package com.hotclick.agente.campana;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Acceso a {@code hot_click_agente_plantilla_mkt_tb}. Toda lectura por id lleva la empresa (aislamiento). */
@Repository
public class PlantillaCampanaRepositorio {

    public enum Estado { PENDIENTE, APROBADA, RECHAZADA }

    public record Fila(Long id, Long empresaId, String nombre, String idioma, String cuerpo, String ejemplos,
                       Estado estado, String metaPlantillaId, String motivoRechazo, Instant creadoEn) { }

    private static final RowMapper<Fila> MAPPER = (rs, i) -> new Fila(
        rs.getLong("id_plantilla"), rs.getLong("fk_id_empresa"), rs.getString("nombre"), rs.getString("idioma"),
        rs.getString("cuerpo"), rs.getString("ejemplos"), Estado.valueOf(rs.getString("estado")),
        rs.getString("meta_plantilla_id"), rs.getString("motivo_rechazo"), rs.getTimestamp("creado_en").toInstant());

    private static final String COLS = "id_plantilla, fk_id_empresa, nombre, idioma, cuerpo, ejemplos, estado, "
        + "meta_plantilla_id, motivo_rechazo, creado_en";

    private final JdbcTemplate jdbc;

    public PlantillaCampanaRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long insertar(Long empresaId, String nombre, String idioma, String cuerpo, String ejemplos, Estado estado,
                         String metaId, Instant ahora) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("INSERT INTO hot_click_agente_plantilla_mkt_tb (fk_id_empresa, "
                + "nombre, idioma, cuerpo, ejemplos, estado, meta_plantilla_id, creado_en, actualizado_en) "
                + "VALUES (?,?,?,?,?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, empresaId);
            ps.setString(2, nombre);
            ps.setString(3, idioma);
            ps.setString(4, cuerpo);
            ps.setString(5, ejemplos);
            ps.setString(6, estado.name());
            ps.setString(7, metaId);
            ps.setTimestamp(8, Timestamp.from(ahora));
            ps.setTimestamp(9, Timestamp.from(ahora));
            return ps;
        }, kh);
        Number id = kh.getKeys() == null ? null : (Number) kh.getKeys().get("id_plantilla");
        return id == null ? 0L : id.longValue();
    }

    public Optional<Fila> obtener(Long empresaId, long id) {
        return jdbc.query("SELECT " + COLS + " FROM hot_click_agente_plantilla_mkt_tb WHERE id_plantilla = ? "
            + "AND fk_id_empresa = ?", MAPPER, id, empresaId).stream().findFirst();
    }

    public boolean existeNombre(Long empresaId, String nombre, String idioma) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_plantilla_mkt_tb "
            + "WHERE fk_id_empresa = ? AND nombre = ? AND idioma = ?", Integer.class, empresaId, nombre, idioma);
        return n != null && n > 0;
    }

    public List<Fila> listar(Long empresaId) {
        return jdbc.query("SELECT " + COLS + " FROM hot_click_agente_plantilla_mkt_tb WHERE fk_id_empresa = ? "
            + "ORDER BY id_plantilla DESC", MAPPER, empresaId);
    }

    /** Aplica el estado que Meta informó (webhook o consulta). Idempotente. @return filas actualizadas */
    public int actualizarEstadoPorMetaId(String metaId, Estado estado, String motivo, Instant ahora) {
        return jdbc.update("UPDATE hot_click_agente_plantilla_mkt_tb SET estado = ?, motivo_rechazo = ?, "
            + "actualizado_en = ? WHERE meta_plantilla_id = ?", estado.name(), motivo, Timestamp.from(ahora), metaId);
    }
}
