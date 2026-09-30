package com.hotclick.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Un paso máximo por sesión anónima del navegador. No guarda correo, nombre ni IP.
 */
@Entity
@Table(name = "hot_click_embudo_sesion_tb")
public class EmbudoSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_embudo_sesion")
    private Long id;

    @Column(name = "session_key", nullable = false, unique = true, length = 36)
    private String sessionKey;

    @Column(name = "paso", nullable = false, length = 20)
    private String paso;

    @Column(name = "motivo", length = 40)
    private String motivo;

    @Column(name = "monto_carrito")
    private Integer montoCarrito;

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionKey() { return sessionKey; }
    public void setSessionKey(String sessionKey) { this.sessionKey = sessionKey; }

    public String getPaso() { return paso; }
    public void setPaso(String paso) { this.paso = paso; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }

    public Integer getMontoCarrito() { return montoCarrito; }
    public void setMontoCarrito(Integer montoCarrito) { this.montoCarrito = montoCarrito; }

    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
}
