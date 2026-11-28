package com.hotclick.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Enlace de pago único de ONVO a nombre de HotClick (sin onBehalfOf) para cobrar una factura tardía de un negocio.
 * Se cancela (expire en ONVO) si la factura llega antes de pagarse.
 */
@Entity
@Table(name = "hot_click_enlace_pago_onvo_tb")
public class EnlacePagoOnvo {

    public static final String CREADO = "CREADO";
    public static final String PAGADO = "PAGADO";
    public static final String EXPIRADO = "EXPIRADO";
    public static final String CANCELADO = "CANCELADO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_enlace_pago")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "monto_crc", nullable = false)
    private int montoCrc;

    @Column(name = "motivo", nullable = false, length = 200)
    private String motivo;

    @Column(name = "onvo_session_id", nullable = false, length = 100, unique = true)
    private String onvoSessionId;

    @Column(name = "url", nullable = false, length = 1000)
    private String url;

    @Column(name = "estado", nullable = false, length = 15)
    private String estado = CREADO;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @Column(name = "pagado_en")
    private LocalDateTime pagadoEn;

    @Column(name = "cerrado_en")
    private LocalDateTime cerradoEn;

    public boolean abierto() { return CREADO.equals(estado); }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { this.empresaId = v; }
    public int getMontoCrc() { return montoCrc; }
    public void setMontoCrc(int v) { this.montoCrc = v; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String v) { this.motivo = v; }
    public String getOnvoSessionId() { return onvoSessionId; }
    public void setOnvoSessionId(String v) { this.onvoSessionId = v; }
    public String getUrl() { return url; }
    public void setUrl(String v) { this.url = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getPagadoEn() { return pagadoEn; }
    public void setPagadoEn(LocalDateTime v) { this.pagadoEn = v; }
    public LocalDateTime getCerradoEn() { return cerradoEn; }
    public void setCerradoEn(LocalDateTime v) { this.cerradoEn = v; }
}
