package com.hotclick.agente.canal;

import com.hotclick.utils.Constants;
import com.hotclick.agente.webhook.MensajeEntrante;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Cuenta de mensajería conectada (WhatsApp, Instagram o Messenger). {@code empresaId == null} es una cuenta de
 * HotClick (bot de la plataforma). El token vive cifrado ({@code token_cifrado}); esta clase nunca lo expone en
 * {@link #toString()}.
 */
@Entity
@Table(name = "hot_click_canal_cuenta_tb")
public class CanalCuenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_canal_cuenta")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 20)
    private MensajeEntrante.Canal tipo;

    /** Columna fk_id_empresa; null = cuenta de HotClick. */
    @Column(name = "fk_id_empresa")
    private Long empresaId;

    /** phone_number_id (WhatsApp), id de página (Messenger) o id de Instagram. Único por tipo. */
    @Column(name = "id_externo", nullable = false, length = 100)
    private String idExterno;

    @Column(name = "waba_id", length = 100)
    private String wabaId;

    @Column(name = "nombre", length = 150)
    private String nombre;

    @Column(name = "token_cifrado", columnDefinition = "TEXT")
    private String tokenCifrado;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoCanal estado = EstadoCanal.ACTIVA;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now(Constants.ZONA_CR);

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MensajeEntrante.Canal getTipo() { return tipo; }
    public void setTipo(MensajeEntrante.Canal tipo) { this.tipo = tipo; }

    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }

    public String getIdExterno() { return idExterno; }
    public void setIdExterno(String idExterno) { this.idExterno = idExterno; }

    public String getWabaId() { return wabaId; }
    public void setWabaId(String wabaId) { this.wabaId = wabaId; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    /** Solo para {@link CanalCuentaService}; el valor guardado es el blob cifrado, no el token. */
    String getTokenCifrado() { return tokenCifrado; }
    void setTokenCifrado(String tokenCifrado) { this.tokenCifrado = tokenCifrado; }

    public boolean tieneToken() { return tokenCifrado != null && !tokenCifrado.isBlank(); }

    public EstadoCanal getEstado() { return estado; }
    public void setEstado(EstadoCanal estado) { this.estado = estado; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }

    public boolean esDeHotClick() { return empresaId == null; }

    /** Sin token, sin id externo completo: solo lo necesario para diagnosticar. */
    @Override
    public String toString() {
        return "CanalCuenta[id=" + id + ", tipo=" + tipo + ", empresaId=" + empresaId + ", estado=" + estado + "]";
    }
}
