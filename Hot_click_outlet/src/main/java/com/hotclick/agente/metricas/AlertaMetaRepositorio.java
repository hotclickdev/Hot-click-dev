package com.hotclick.agente.metricas;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

/** Avisos de Meta sobre la cuenta o la calidad del número ({@code hot_click_agente_alerta_meta_tb}). */
@Repository
public class AlertaMetaRepositorio {

    /** Un aviso ya limpio (solo letras, números, espacios y guiones; recortado). */
    public record Aviso(String campo, String evento, String limite, String cuentaExterna) { }

    private final JdbcTemplate jdbc;

    public AlertaMetaRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Guarda todos los avisos de un webhook en un solo lote. */
    public void insertar(List<Aviso> avisos) {
        if (avisos == null || avisos.isEmpty()) return;
        jdbc.batchUpdate("INSERT INTO hot_click_agente_alerta_meta_tb (campo, evento, limite, cuenta_externa) "
            + "VALUES (?, ?, ?, ?)", avisos, avisos.size(), (ps, a) -> {
                ps.setString(1, a.campo());
                ps.setString(2, a.evento());
                ps.setString(3, a.limite());
                ps.setString(4, a.cuentaExterna());
            });
    }

    /** Los últimos avisos, del más nuevo al más viejo. */
    public List<MetricasDtos.AlertaMeta> recientes(int limite) {
        return jdbc.query("SELECT campo, evento, limite, creado_en FROM hot_click_agente_alerta_meta_tb "
                + "ORDER BY creado_en DESC, id_alerta DESC LIMIT ?",
            (rs, i) -> {
                Timestamp t = rs.getTimestamp("creado_en");
                return new MetricasDtos.AlertaMeta(rs.getString("campo"), rs.getString("evento"),
                    rs.getString("limite"), t == null ? null : t.toInstant());
            }, Math.max(1, Math.min(limite, 50)));
    }
}
