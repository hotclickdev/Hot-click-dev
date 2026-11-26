package com.hotclick.agente.ventas;

import com.hotclick.rag.repository.ProductoEmbeddingRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

/**
 * Acceso a hot_click_agente_conocimiento_tb con JdbcTemplate (pgvector no es compatible con JPA aquí).
 * Toda lectura y escritura lleva la empresa: empresaId null significa conocimiento de HotClick, nunca "todas".
 */
@Repository
public class ConocimientoRepository {

    static final String TABLA = "hot_click_agente_conocimiento_tb";

    public record Fila(Long id, Long empresaId, String titulo, String contenido, String categoria, boolean activo) {}

    private static final RowMapper<Fila> MAPPER = (rs, i) -> new Fila(
        rs.getLong("id"), (Long) rs.getObject("fk_id_empresa"), rs.getString("titulo"),
        rs.getString("contenido"), rs.getString("categoria"), rs.getBoolean("activo"));

    private static final String COLS = "id, fk_id_empresa, titulo, contenido, categoria, activo";
    /** Predicado de alcance: empresa concreta, o HotClick (NULL) cuando el parámetro es null. */
    private static final String ALCANCE = "fk_id_empresa IS NOT DISTINCT FROM ?";

    private final JdbcTemplate jdbc;

    public ConocimientoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean tablaDisponible() {
        try {
            Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_name) = ?", Integer.class, TABLA);
            return n != null && n > 0;
        } catch (RuntimeException e) {
            return false;
        }
    }

    public long insertar(Long empresaId, String titulo, String contenido, String categoria, boolean activo) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO " + TABLA + " (fk_id_empresa, titulo, contenido, categoria, activo) VALUES (?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setObject(1, empresaId);
            ps.setString(2, titulo);
            ps.setString(3, contenido);
            ps.setString(4, categoria);
            ps.setBoolean(5, activo);
            return ps;
        }, kh);
        Object id = kh.getKeys() != null ? kh.getKeys().get("id") : null;
        return id instanceof Number n ? n.longValue() : -1L;
    }

    /** @return true si la fila existía en ese alcance */
    public boolean actualizar(Long id, Long empresaId, String titulo, String contenido, String categoria, boolean activo) {
        return jdbc.update("UPDATE " + TABLA + " SET titulo=?, contenido=?, categoria=?, activo=?, "
            + "actualizado_en=NOW(), modelo_version=NULL WHERE id=? AND " + ALCANCE,
            titulo, contenido, categoria, activo, id, empresaId) > 0;
    }

    public boolean eliminar(Long id, Long empresaId) {
        return jdbc.update("DELETE FROM " + TABLA + " WHERE id=? AND " + ALCANCE, id, empresaId) > 0;
    }

    public Optional<Fila> buscarPorId(Long id, Long empresaId) {
        return jdbc.query("SELECT " + COLS + " FROM " + TABLA + " WHERE id=? AND " + ALCANCE, MAPPER, id, empresaId)
            .stream().findFirst();
    }

    public List<Fila> listar(Long empresaId) {
        return jdbc.query("SELECT " + COLS + " FROM " + TABLA + " WHERE " + ALCANCE + " ORDER BY titulo",
            MAPPER, empresaId);
    }

    /** Guarda el embedding. Falla (excepción) si la tabla no tiene la columna por falta de pgvector. */
    public void guardarEmbedding(Long id, Long empresaId, float[] vector) {
        jdbc.update("UPDATE " + TABLA + " SET embedding=?::vector, modelo_version=? WHERE id=? AND " + ALCANCE,
            vectorComoTexto(vector), ProductoEmbeddingRepository.CURRENT_MODEL,
            id, empresaId);
    }

    /** Vecinos por coseno entre las entradas ACTIVAS del alcance, hasta la distancia máxima. */
    public List<Fila> buscarSimilares(Long empresaId, float[] vector, int limite, double distanciaMaxima) {
        String v = vectorComoTexto(vector);
        return jdbc.query("SELECT " + COLS + " FROM " + TABLA + " WHERE activo AND embedding IS NOT NULL AND "
            + ALCANCE + " AND (embedding <=> ?::vector) <= ? ORDER BY embedding <=> ?::vector LIMIT ?",
            MAPPER, empresaId, v, distanciaMaxima, v, limite);
    }

    /** Alternativa sin vectores: coincidencia por palabra en título o contenido. */
    public List<Fila> buscarPorPalabras(Long empresaId, List<String> palabras, int limite) {
        if (palabras.isEmpty()) return List.of();
        StringBuilder sql = new StringBuilder("SELECT " + COLS + " FROM " + TABLA + " WHERE activo AND " + ALCANCE + " AND (");
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        args.add(empresaId);
        for (int i = 0; i < palabras.size(); i++) {
            if (i > 0) sql.append(" OR ");
            sql.append("LOWER(titulo) LIKE ? OR LOWER(contenido) LIKE ?");
            String patron = "%" + palabras.get(i).toLowerCase(java.util.Locale.ROOT).replace("%", "").replace("_", "") + "%";
            args.add(patron);
            args.add(patron);
        }
        sql.append(") ORDER BY titulo LIMIT ?");
        args.add(limite);
        return jdbc.query(sql.toString(), MAPPER, args.toArray());
    }

    static String vectorComoTexto(float[] v) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < v.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(String.format(java.util.Locale.ROOT, "%.8f", v[i]));
        }
        return sb.append(']').toString();
    }
}
