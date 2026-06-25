package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_wa_log_tb")
public class WaMensajeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fk_id_usuario")
    private Long usuarioId;

    @Column(name = "fk_id_empresa")
    private Long empresaId;

    @Column(name = "telefono", nullable = false, length = 30)
    private String telefono;

    @Column(name = "tipo_mensaje", nullable = false, length = 40)
    private String tipoMensaje;

    @Column(name = "variante", length = 60)
    private String variante;

    @Column(name = "texto_enviado", nullable = false, columnDefinition = "text")
    private String textoEnviado;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "ENVIADO";

    @Column(name = "error_detalle", length = 500)
    private String errorDetalle;

    @Column(name = "meta_message_id", length = 100)
    private String metaMessageId;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "pedido_numero", length = 20)
    private String pedidoNumero;

    // ── Getters / Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getTipoMensaje() { return tipoMensaje; }
    public void setTipoMensaje(String tipoMensaje) { this.tipoMensaje = tipoMensaje; }
    public String getVariante() { return variante; }
    public void setVariante(String variante) { this.variante = variante; }
    public String getTextoEnviado() { return textoEnviado; }
    public void setTextoEnviado(String textoEnviado) { this.textoEnviado = textoEnviado; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getErrorDetalle() { return errorDetalle; }
    public void setErrorDetalle(String errorDetalle) { this.errorDetalle = errorDetalle; }
    public String getMetaMessageId() { return metaMessageId; }
    public void setMetaMessageId(String metaMessageId) { this.metaMessageId = metaMessageId; }
    public LocalDateTime getFechaEnvio() { return fechaEnvio; }
    public void setFechaEnvio(LocalDateTime fechaEnvio) { this.fechaEnvio = fechaEnvio; }
    public String getPedidoNumero() { return pedidoNumero; }
    public void setPedidoNumero(String pedidoNumero) { this.pedidoNumero = pedidoNumero; }
}
