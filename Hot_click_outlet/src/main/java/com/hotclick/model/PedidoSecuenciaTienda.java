package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** S4-20: último número de pedido entregado por tienda (V182). Se incrementa solo por SQL atómico. */
@Entity
@Table(name = "hot_click_pedido_secuencia_tienda_tb")
public class PedidoSecuenciaTienda {

    @Id
    @Column(name = "fk_id_empresa")
    private Long empresaId;

    @Column(name = "ultimo", nullable = false)
    private Long ultimo = 0L;

    public Long getEmpresaId() { return empresaId; }
    public Long getUltimo() { return ultimo; }
}
