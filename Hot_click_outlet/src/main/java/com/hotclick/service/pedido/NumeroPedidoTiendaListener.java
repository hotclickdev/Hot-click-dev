package com.hotclick.service.pedido;

import com.hotclick.model.Pedido;
import jakarta.persistence.PrePersist;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * S4-20: punto único que asigna el número de pedido propio de la tienda a todo Pedido nuevo
 * (checkout, tienda propia, POS, QR, manual). Usa JdbcTemplate en la misma conexión y transacción,
 * así no dispara un flush de Hibernate dentro del persist. Un rollback devuelve el número.
 */
public class NumeroPedidoTiendaListener {

    static final String SQL_CREAR = """
        INSERT INTO hot_click_pedido_secuencia_tienda_tb (fk_id_empresa, ultimo)
        VALUES (?, 0) ON CONFLICT DO NOTHING
        """;
    /** El UPDATE toma el lock de la fila hasta el commit: dos checkouts simultáneos no repiten número. */
    static final String SQL_INCREMENTAR =
        "UPDATE hot_click_pedido_secuencia_tienda_tb SET ultimo = ultimo + 1 WHERE fk_id_empresa = ?";
    static final String SQL_LEER =
        "SELECT ultimo FROM hot_click_pedido_secuencia_tienda_tb WHERE fk_id_empresa = ?";

    @Autowired
    private ObjectProvider<JdbcTemplate> jdbc;

    @PrePersist
    void asignar(Pedido pedido) {
        if (pedido.getNumeroTienda() != null) return;
        Long empresaId = pedido.getEmpresaId();
        JdbcTemplate t = jdbc != null ? jdbc.getIfAvailable() : null;
        if (empresaId == null || t == null) return;
        t.update(SQL_CREAR, empresaId);
        t.update(SQL_INCREMENTAR, empresaId);
        pedido.setNumeroTienda(t.queryForObject(SQL_LEER, Long.class, empresaId));
    }
}
