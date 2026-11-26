package com.hotclick.agente.comprobante;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Lee, en una sola consulta, si un comprobante pertenece a un pedido atribuido al bot (pedido con
 * {@code origen_canal} y enlace de compra) y devuelve la conversación del enlace. Solo facturas (01) y tiquetes (04):
 * una nota de crédito o débito no se avisa por el chat. Un comprobante de un pedido normal devuelve vacío.
 */
@Repository
public class ComprobanteBotRepositorio {

    /** Lo que el aviso necesita, sin datos personales en el toString. */
    public record ContextoComprobante(long comprobanteId, String numeroPedido, UUID chatSesionId) {
        @Override
        public String toString() {
            return "ContextoComprobante[comprobante=" + comprobanteId + "]";
        }
    }

    private final JdbcTemplate jdbc;

    public ComprobanteBotRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ContextoComprobante> contexto(long comprobanteId) {
        return jdbc.query(
            "SELECT c.id_comprobante, p.numero_pedido, e.fk_id_chat_sesion "
                + "FROM hot_click_comprobante_fiscal_tb c "
                + "JOIN hot_click_pedido_tb p ON p.id_pedido = c.fk_id_pedido "
                + "JOIN hot_click_enlace_compra_tb e ON e.id_enlace_compra = p.fk_id_enlace_compra "
                + "WHERE c.id_comprobante = ? AND p.origen_canal IS NOT NULL AND e.fk_id_chat_sesion IS NOT NULL "
                + "AND c.tipo IN ('01', '04')",
            (rs, i) -> new ContextoComprobante(rs.getLong(1), rs.getString(2), (UUID) rs.getObject(3)),
            comprobanteId).stream().findFirst();
    }
}
