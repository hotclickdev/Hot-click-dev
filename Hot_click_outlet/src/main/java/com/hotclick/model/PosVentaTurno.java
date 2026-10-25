package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** A3: liga una venta POS con el turno de caja en que se cobró. */
@Entity
@Table(name = "hot_click_pos_venta_turno_tb")
public class PosVentaTurno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta_turno")
    private Long id;

    @Column(name = "fk_id_pedido", nullable = false, unique = true)
    private Long pedidoId;

    @Column(name = "fk_id_turno", nullable = false)
    private Long turnoId;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now(Constants.ZONA_CR);

    public PosVentaTurno() {}

    public PosVentaTurno(Long pedidoId, Long turnoId) {
        this.pedidoId = pedidoId;
        this.turnoId = turnoId;
    }

    public Long getId() { return id; }
    public Long getPedidoId() { return pedidoId; }
    public Long getTurnoId() { return turnoId; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
