package com.hotclick.agente.campana;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Contactos de WhatsApp (en claro, solo en memoria) de cada segmento para UN negocio. Cada método es UNA consulta con
 * tope; el cruce con los consentimientos lo hace {@link SegmentoService}. Nunca se loguean.
 */
@Repository
public class SegmentoRepositorio {

    static final int TOPE = 5000;

    private final JdbcTemplate jdbc;

    public SegmentoRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Pagaron un enlace de compra del bot desde {@code desde} (hora de Costa Rica). */
    public List<String> compradores(Long empresaId, LocalDateTime desde) {
        return jdbc.queryForList("SELECT DISTINCT contacto_externo FROM hot_click_enlace_compra_tb "
            + "WHERE fk_id_empresa = ? AND canal = 'WHATSAPP' AND estado = 'PAGADO' AND creado >= ? "
            + "AND contacto_externo IS NOT NULL LIMIT " + TOPE, String.class, empresaId, Timestamp.valueOf(desde));
    }

    /** Armaron un enlace con productos de la categoría (comprados o no) desde {@code desde}. */
    public List<String> interesadosEnCategoria(Long empresaId, Long categoriaId, LocalDateTime desde) {
        return jdbc.queryForList("SELECT DISTINCT e.contacto_externo FROM hot_click_enlace_compra_tb e "
            + "JOIN hot_click_enlace_compra_item_tb i ON i.fk_id_enlace_compra = e.id_enlace_compra "
            + "JOIN hot_click_producto_tb p ON p.id_producto = i.fk_id_producto "
            + "WHERE e.fk_id_empresa = ? AND e.canal = 'WHATSAPP' AND p.fk_id_categoria = ? AND e.creado >= ? "
            + "AND p.fk_id_empresa = ? AND e.contacto_externo IS NOT NULL LIMIT " + TOPE,
            String.class, empresaId, categoriaId, Timestamp.valueOf(desde), empresaId);
    }

    /** Contacto CIFRADO de los leads de comprador del negocio desde {@code desde}. */
    public List<String> leadsCifrados(Long empresaId, LocalDateTime desde) {
        return jdbc.queryForList("SELECT contacto_cifrado FROM hot_click_lead_tb WHERE tipo = 'COMPRADOR' "
            + "AND fk_id_empresa = ? AND canal = 'WHATSAPP' AND contacto_cifrado IS NOT NULL AND creado_en >= ? "
            + "LIMIT " + TOPE, String.class, empresaId, Timestamp.valueOf(desde));
    }
}
