package com.hotclick.agente.pago;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Guarda de "un solo aviso" del bot (AG-34 comprobante, AG-40 pasos de onboarding). La llave
 * {@code (tipo, referencia_id)} es única: reclamar dos veces lo mismo falla la segunda, aunque lleguen en paralelo
 * (dos pods, evento repetido). Solo guarda el tipo y el id interno, nunca contacto ni texto.
 */
@Repository
public class AvisoUnicoRepository {

    static final String TABLA = "hot_click_agente_aviso_unico_tb";

    private final JdbcTemplate jdbc;

    public AvisoUnicoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** @return true solo para quien lo reclama primero (la llave primaria resuelve la carrera entre pods). */
    public boolean reclamar(String tipo, long referenciaId) {
        try {
            return jdbc.update("INSERT INTO " + TABLA + " (tipo, referencia_id) VALUES (?, ?)", tipo, referenciaId) == 1;
        } catch (DuplicateKeyException ya) {
            return false;
        }
    }

    /** Devuelve el reclamo cuando el envío falló, para que un reintento pueda volver a intentarlo. */
    public void liberar(String tipo, long referenciaId) {
        jdbc.update("DELETE FROM " + TABLA + " WHERE tipo = ? AND referencia_id = ?", tipo, referenciaId);
    }

    /** Por lote: cuándo se envió cada (referencia) de un tipo. Las referencias sin aviso no aparecen. */
    public Map<Long, Instant> enviados(String tipo, Collection<Long> referencias) {
        if (referencias == null || referencias.isEmpty()) return Map.of();
        Long[] ids = referencias.toArray(new Long[0]);
        List<Object[]> filas = jdbc.query(
            "SELECT referencia_id, creado_en FROM " + TABLA + " WHERE tipo = ? AND referencia_id = ANY (?)",
            ps -> {
                ps.setString(1, tipo);
                ps.setArray(2, ps.getConnection().createArrayOf("bigint", ids));
            },
            (rs, i) -> new Object[] {rs.getLong(1), rs.getTimestamp(2)});
        Map<Long, Instant> out = new HashMap<>();
        for (Object[] f : filas) out.put((Long) f[0], ((Timestamp) f[1]).toInstant());
        return out;
    }
}
