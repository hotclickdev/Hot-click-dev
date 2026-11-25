package com.hotclick.agente.campana;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Acceso a {@code hot_click_agente_consentimiento_tb}. Toda consulta lleva la empresa. Nunca se loguea el contacto.
 */
@Repository
public class ConsentimientoRepositorio {

    /** Un consentimiento ACTIVO listo para enviar: trae el contacto cifrado y el nombre, no el hash de otra empresa. */
    public record Destino(String hash, String canal, String contactoCifrado, String nombre) {
        @Override
        public String toString() {
            return "Destino[" + canal + "]";
        }
    }

    public record Resumen(int activos, int revocados) { }

    private static final RowMapper<Destino> DESTINO = (rs, i) -> new Destino(
        rs.getString("contacto_hash"), rs.getString("canal"), rs.getString("contacto_cifrado"), rs.getString("nombre"));

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate nombrado;

    public ConsentimientoRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.nombrado = new NamedParameterJdbcTemplate(jdbc);
    }

    /**
     * Registra o reactiva el consentimiento. Repetir el mismo opt-in no cambia la fecha ni la evidencia originales
     * (la primera es la prueba). Si estaba REVOCADO, se reactiva con la evidencia nueva.
     * @return true si quedó ACTIVO por esta llamada (nuevo o reactivado); false si ya estaba activo
     */
    public boolean registrarActivo(Long empresaId, String canal, String hash, String ultimos4, String cifrado,
                                   String nombre, String origen, String evidencia, String version, Instant ahora) {
        int reactivados = jdbc.update("UPDATE hot_click_agente_consentimiento_tb SET estado = 'ACTIVO', "
            + "contacto_cifrado = ?, contacto_ultimos4 = ?, nombre = ?, origen = ?, evidencia = ?, version_texto = ?, "
            + "consentido_en = ?, revocado_en = NULL WHERE contacto_hash = ? AND fk_id_empresa = ? AND estado = 'REVOCADO'",
            cifrado, ultimos4, nombre, origen, evidencia, version, Timestamp.from(ahora), hash, empresaId);
        if (reactivados > 0) return true;
        try {
            return jdbc.update("INSERT INTO hot_click_agente_consentimiento_tb (fk_id_empresa, canal, contacto_hash, "
                + "contacto_ultimos4, contacto_cifrado, nombre, origen, evidencia, version_texto, consentido_en) "
                + "VALUES (?,?,?,?,?,?,?,?,?,?)", empresaId, canal, hash, ultimos4, cifrado, nombre, origen, evidencia,
                version, Timestamp.from(ahora)) > 0;
        } catch (DuplicateKeyException yaExiste) {
            return false; // ya estaba ACTIVO (o carrera con otro webhook): idempotente
        }
    }

    /** Revoca y borra el contacto cifrado y el nombre; queda el hash y la prueba. @return true si estaba activo. */
    public boolean revocar(Long empresaId, String hash, Instant ahora) {
        return jdbc.update("UPDATE hot_click_agente_consentimiento_tb SET estado = 'REVOCADO', revocado_en = ?, "
            + "contacto_cifrado = NULL, nombre = NULL WHERE contacto_hash = ? AND fk_id_empresa = ? AND estado = 'ACTIVO'",
            Timestamp.from(ahora), hash, empresaId) > 0;
    }

    /** Existe una fila (activa o revocada) para ese contacto: sirve para no re-ofrecer el opt-in a quien ya decidió. */
    public boolean existe(Long empresaId, String hash) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_consentimiento_tb "
            + "WHERE fk_id_empresa = ? AND contacto_hash = ?", Integer.class, empresaId, hash);
        return n != null && n > 0;
    }

    /** Consentimientos ACTIVOS de la empresa entre los hashes dados (una sola consulta). */
    public List<Destino> activosEntre(Long empresaId, Collection<String> hashes) {
        if (hashes == null || hashes.isEmpty()) return List.of();
        return nombrado.query("SELECT contacto_hash, canal, contacto_cifrado, nombre FROM hot_click_agente_consentimiento_tb "
            + "WHERE fk_id_empresa = :e AND estado = 'ACTIVO' AND canal = 'WHATSAPP' AND contacto_hash IN (:h)",
            new MapSqlParameterSource(Map.of("e", empresaId, "h", hashes)), DESTINO);
    }

    /** Todos los consentimientos ACTIVOS de WhatsApp de la empresa (segmento TODOS), con tope. */
    public List<Destino> activos(Long empresaId, int limite) {
        return jdbc.query("SELECT contacto_hash, canal, contacto_cifrado, nombre FROM hot_click_agente_consentimiento_tb "
            + "WHERE fk_id_empresa = ? AND estado = 'ACTIVO' AND canal = 'WHATSAPP' ORDER BY id_consentimiento LIMIT ?",
            DESTINO, empresaId, limite);
    }

    /** Destino de UN contacto si su consentimiento sigue ACTIVO; vacío si se revocó. */
    public List<Destino> activoPorHash(Long empresaId, String hash) {
        return jdbc.query("SELECT contacto_hash, canal, contacto_cifrado, nombre FROM hot_click_agente_consentimiento_tb "
            + "WHERE fk_id_empresa = ? AND contacto_hash = ? AND estado = 'ACTIVO'", DESTINO, empresaId, hash);
    }

    /** Consentimientos activos entre los hashes dados, solo el hash (revalidación en el envío, una consulta por lote). */
    public List<String> hashesActivos(Long empresaId, Collection<String> hashes) {
        if (hashes == null || hashes.isEmpty()) return List.of();
        return nombrado.queryForList("SELECT contacto_hash FROM hot_click_agente_consentimiento_tb "
            + "WHERE fk_id_empresa = :e AND estado = 'ACTIVO' AND contacto_hash IN (:h)",
            new MapSqlParameterSource(Map.of("e", empresaId, "h", hashes)), String.class);
    }

    public Resumen resumen(Long empresaId) {
        List<Map<String, Object>> filas = jdbc.queryForList("SELECT estado, COUNT(*) AS n "
            + "FROM hot_click_agente_consentimiento_tb WHERE fk_id_empresa = ? GROUP BY estado", empresaId);
        int activos = 0;
        int revocados = 0;
        for (Map<String, Object> f : filas) {
            int n = ((Number) f.get("n")).intValue();
            if ("ACTIVO".equals(f.get("estado"))) activos = n;
            else revocados = n;
        }
        return new Resumen(activos, revocados);
    }
}
