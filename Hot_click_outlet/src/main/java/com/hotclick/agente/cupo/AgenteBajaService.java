package com.hotclick.agente.cupo;

import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Lista de bajas (STOP) del agente. Guarda solo el hash del contacto (empresa + canal + contacto), el canal y la
 * fecha; nunca el contacto en claro. Implementa {@link ListaBajasAgente}: el seguimiento la consulta por lote antes
 * de cada recordatorio. Estar de baja NO impide escribir ni recibir respuestas, solo mensajes proactivos.
 */
@Service
public class AgenteBajaService implements ListaBajasAgente {

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate nombrado;
    private final HasherInterno hasher;

    public AgenteBajaService(JdbcTemplate jdbc, HasherInterno hasher) {
        this.jdbc = jdbc;
        this.nombrado = new NamedParameterJdbcTemplate(jdbc);
        this.hasher = hasher;
    }

    /** Marca la baja; repetir el STOP no falla ni duplica. */
    @Transactional
    public void registrar(Long empresaId, String canal, String contacto) {
        jdbc.update("INSERT INTO hot_click_agente_baja_tb (fk_id_empresa, canal, contacto_hash) VALUES (?, ?, ?) "
            + "ON CONFLICT DO NOTHING", empresaId, canal, hasher.contacto(empresaId, canal, contacto));
    }

    /** Quita la baja (ACTIVAR). @return true si estaba de baja. */
    @Transactional
    public boolean quitar(Long empresaId, String canal, String contacto) {
        return jdbc.update("DELETE FROM hot_click_agente_baja_tb WHERE contacto_hash = ?",
            hasher.contacto(empresaId, canal, contacto)) > 0;
    }

    @Transactional(readOnly = true)
    public boolean estaDeBaja(Long empresaId, String canal, String contacto) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_baja_tb WHERE contacto_hash = ?",
            Integer.class, hasher.contacto(empresaId, canal, contacto));
        return n != null && n > 0;
    }

    /**
     * Los que están de baja entre estos hashes de contacto (el mismo HMAC que guarda esta tabla). Una sola consulta por
     * lote; lo usan las campañas, que ya tienen el hash y no el contacto en claro.
     */
    @Transactional(readOnly = true)
    public Set<String> hashesDeBaja(Collection<String> hashes) {
        if (hashes == null || hashes.isEmpty()) return Set.of();
        return new HashSet<>(nombrado.queryForList("SELECT contacto_hash FROM hot_click_agente_baja_tb "
            + "WHERE contacto_hash IN (:hashes)", new MapSqlParameterSource("hashes", hashes), String.class));
    }

    /** Una sola consulta para todo el lote. */
    @Override
    @Transactional(readOnly = true)
    public Set<Contacto> dadosDeBaja(Collection<Contacto> contactos) {
        if (contactos == null || contactos.isEmpty()) return Set.of();
        Map<String, Contacto> porHash = new HashMap<>();
        for (Contacto c : contactos) {
            porHash.put(hasher.contacto(c.empresaId(), c.canal(), c.contactoExterno()), c);
        }
        List<String> hashes = nombrado.queryForList("SELECT contacto_hash FROM hot_click_agente_baja_tb "
            + "WHERE contacto_hash IN (:hashes)", new MapSqlParameterSource("hashes", porHash.keySet()), String.class);
        Set<Contacto> resultado = new HashSet<>();
        for (String h : hashes) {
            Contacto c = porHash.get(h);
            if (c != null) resultado.add(c);
        }
        return resultado;
    }
}
