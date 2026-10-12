package com.hotclick.model;

import com.hotclick.utils.Constants;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Datos de CRM de un cliente dentro de un negocio (V171, P8-01). */
@Entity
@Table(name = "hot_click_cliente_empresa_tb",
    uniqueConstraints = @UniqueConstraint(name = "uq_cliente_empresa", columnNames = {"fk_id_empresa", "fk_id_usuario"}))
public class ClienteEmpresa {

    public static final String ORIGEN_REGISTRO = "REGISTRO";
    public static final String ORIGEN_COMPRA = "COMPRA";
    public static final String ORIGEN_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cliente_empresa")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "fk_id_usuario", nullable = false)
    private Long usuarioId;

    @Column(name = "notas_internas", columnDefinition = "TEXT")
    private String notasInternas;

    @Column(name = "puntos_fidelidad", nullable = false)
    private int puntosFidelidad = 0;

    @Column(name = "segmento", length = 30)
    private String segmento;

    @Column(name = "origen", nullable = false, length = 12)
    private String origen = ORIGEN_COMPRA;

    @Column(name = "fecha_alta", nullable = false)
    private LocalDateTime fechaAlta = LocalDateTime.now(Constants.ZONA_CR);

    public ClienteEmpresa() {}

    public ClienteEmpresa(Long empresaId, Long usuarioId, String origen) {
        this.empresaId = empresaId;
        this.usuarioId = usuarioId;
        this.origen = origen;
    }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public Long getUsuarioId() { return usuarioId; }
    public String getNotasInternas() { return notasInternas; }
    public void setNotasInternas(String v) { this.notasInternas = v; }
    public int getPuntosFidelidad() { return puntosFidelidad; }
    public void setPuntosFidelidad(int v) { this.puntosFidelidad = v; }
    public String getSegmento() { return segmento; }
    public void setSegmento(String v) { this.segmento = v; }
    public String getOrigen() { return origen; }
    public LocalDateTime getFechaAlta() { return fechaAlta; }
}
