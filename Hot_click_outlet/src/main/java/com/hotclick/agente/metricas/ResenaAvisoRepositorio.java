package com.hotclick.agente.metricas;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * AG-35: una sola petición de reseña por pedido. La llave primaria del pedido es la guarda: el
 * {@code INSERT ... ON CONFLICT DO NOTHING} es atómico, así que dos entregas simultáneas no mandan dos mensajes.
 */
@Repository
public class ResenaAvisoRepositorio {

    private final JdbcTemplate jdbc;

    public ResenaAvisoRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** @return true si esta llamada reclamó el envío; false si ya se había pedido la reseña de ese pedido. */
    public boolean reclamar(Long pedidoId, Long empresaId) {
        return jdbc.update("INSERT INTO hot_click_agente_resena_aviso_tb (fk_id_pedido, fk_id_empresa) VALUES (?, ?) "
            + "ON CONFLICT DO NOTHING", pedidoId, empresaId) == 1;
    }

    /** Deshace la reclamación cuando el envío falló, para poder intentarlo otra vez. */
    public void liberar(Long pedidoId) {
        jdbc.update("DELETE FROM hot_click_agente_resena_aviso_tb WHERE fk_id_pedido = ?", pedidoId);
    }
}
