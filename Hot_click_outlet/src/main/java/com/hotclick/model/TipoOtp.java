package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_tipo_otp_tb")
public class TipoOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_otp")
    private Integer idTipoOtp;

    @Column(name = "nombre", nullable = false, length = 30)
    private String nombre;

    @Column(name = "tiempo_expiracion_seg", nullable = false)
    private Integer tiempoExpiracionSeg = 300;

    @Column(name = "longitud_codigo", nullable = false)
    private Integer longitudCodigo = 6;

    @Column(name = "fk_id_estado", nullable = false)
    private Integer estado = 1;

    public Integer getIdTipoOtp() { return idTipoOtp; }
    public void setIdTipoOtp(Integer idTipoOtp) { this.idTipoOtp = idTipoOtp; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Integer getTiempoExpiracionSeg() { return tiempoExpiracionSeg; }
    public void setTiempoExpiracionSeg(Integer tiempoExpiracionSeg) { this.tiempoExpiracionSeg = tiempoExpiracionSeg; }

    public Integer getLongitudCodigo() { return longitudCodigo; }
    public void setLongitudCodigo(Integer longitudCodigo) { this.longitudCodigo = longitudCodigo; }

    public Integer getEstado() { return estado; }
    public void setEstado(Integer estado) { this.estado = estado; }
}
