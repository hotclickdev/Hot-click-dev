package com.hotclick.service.contador;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Corpus de normativa tributaria que carga el ADMIN. No existia un corpus tributario en el RAG del repo (solo hay RAG de
 * catalogo), asi que se reutiliza la misma tecnica de busqueda de texto completo de Postgres (tsvector en espanol).
 * Sin documentos cargados, la busqueda devuelve vacio y el Contador responde "No se".
 */
@Service
public class ContadorNormativaService {

    public static final int MAX_DOCUMENTOS = 300;
    public static final int MAX_TEXTO = 20_000;
    public static final int MAX_CONSULTA = 200;
    public static final int MAX_RESULTADOS = 3;
    static final int EXTRACTO = 1500;

    private final JdbcTemplate jdbc;

    public ContadorNormativaService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> listar() {
        return jdbc.query("SELECT id, titulo, fuente, LENGTH(texto), creado_en FROM hot_click_contador_normativa_tb "
                + "ORDER BY id DESC LIMIT " + MAX_DOCUMENTOS,
            (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getLong(1));
                m.put("titulo", rs.getString(2));
                m.put("fuente", rs.getString(3));
                m.put("caracteres", rs.getInt(4));
                m.put("creadoEn", rs.getTimestamp(5).toLocalDateTime().toString());
                return m;
            });
    }

    public long agregar(String titulo, String fuente, String texto, Long adminId) {
        String t = limpiar(titulo, 200, "título");
        String f = limpiar(fuente, 300, "fuente");
        String x = texto == null ? "" : texto.strip();
        if (x.length() < 20 || x.length() > MAX_TEXTO) throw new IllegalArgumentException("texto fuera de rango");
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_contador_normativa_tb", Long.class);
        if (n != null && n >= MAX_DOCUMENTOS) throw new IllegalArgumentException("corpus lleno");
        return jdbc.queryForObject("INSERT INTO hot_click_contador_normativa_tb (titulo, fuente, texto, creado_por) "
            + "VALUES (?, ?, ?, ?) RETURNING id", Long.class, t, f, x, adminId);
    }

    /** Hasta {@value #MAX_RESULTADOS} extractos. Solo lectura. Consulta acotada y sin SQL concatenado. */
    public List<Map<String, Object>> buscar(String consulta) {
        String q = consulta == null ? "" : consulta.strip();
        if (q.isEmpty()) return List.of();
        if (q.length() > MAX_CONSULTA) q = q.substring(0, MAX_CONSULTA);
        try {
            return jdbc.query("SELECT titulo, fuente, LEFT(texto, " + EXTRACTO + ") FROM hot_click_contador_normativa_tb "
                    + "WHERE to_tsvector('spanish', titulo || ' ' || texto) @@ websearch_to_tsquery('spanish', ?) "
                    + "ORDER BY ts_rank(to_tsvector('spanish', titulo || ' ' || texto), websearch_to_tsquery('spanish', ?)) DESC "
                    + "LIMIT " + MAX_RESULTADOS,
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("titulo", rs.getString(1));
                    m.put("fuente", rs.getString(2));
                    m.put("extracto", rs.getString(3));
                    return m;
                }, q, q);
        } catch (DataAccessException e) {
            return List.of();
        }
    }

    private static String limpiar(String v, int max, String campo) {
        String s = v == null ? "" : v.strip();
        if (s.isEmpty() || s.length() > max) throw new IllegalArgumentException(campo + " fuera de rango");
        return s;
    }
}
