package com.hotclick.agente.conversacion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Turno de una conversación (tabla hot_click_chat_mensaje_shopping_tb). rol: user | assistant | persona | system. */
@Entity
@Table(name = "hot_click_chat_mensaje_shopping_tb")
public class ConversacionMensaje {

    public static final String ROL_CLIENTE = "user";
    public static final String ROL_BOT = "assistant";
    public static final String ROL_PERSONA = "persona";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_mensaje")
    private Long id;

    @Column(name = "fk_id_sesion", nullable = false)
    private UUID sesionId;

    @Column(name = "fk_id_empresa")
    private Long empresaId;

    @Column(name = "rol", nullable = false, length = 20)
    private String rol;

    @Column(name = "contenido", nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion = Instant.now();

    public Long getId() { return id; }
    public UUID getSesionId() { return sesionId; }
    public void setSesionId(UUID sesionId) { this.sesionId = sesionId; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public Instant getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(Instant fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    @Override
    public String toString() {
        return "ConversacionMensaje[id=" + id + ", rol=" + rol + "]";
    }
}
