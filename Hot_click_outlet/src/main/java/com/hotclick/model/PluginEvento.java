package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_plugin_evento_tb")
public class PluginEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_log")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_plugin", nullable = false)
    private Plugin plugin;

    @Column(name = "evento", nullable = false, length = 100)
    private String evento;

    @Column(name = "payload", columnDefinition = "text")
    private String payload;

    /** PENDIENTE | ENVIADO | FALLIDO */
    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "PENDIENTE";

    @Column(name = "codigo_respuesta")
    private Integer codigoRespuesta;

    @Column(name = "mensaje_error", length = 500)
    private String mensajeError;

    @Column(name = "fecha_envio")
    private LocalDateTime fechaEnvio;

    @PrePersist
    void onCreate() {
        fechaEnvio = LocalDateTime.now(Constants.ZONA_CR);
    }

    public Long getId() { return id; }
    public Plugin getPlugin() { return plugin; }
    public void setPlugin(Plugin plugin) { this.plugin = plugin; }

    public String getEvento() { return evento; }
    public void setEvento(String evento) { this.evento = evento; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Integer getCodigoRespuesta() { return codigoRespuesta; }
    public void setCodigoRespuesta(Integer codigoRespuesta) { this.codigoRespuesta = codigoRespuesta; }

    public String getMensajeError() { return mensajeError; }
    public void setMensajeError(String mensajeError) { this.mensajeError = mensajeError; }

    public LocalDateTime getFechaEnvio() { return fechaEnvio; }
}
