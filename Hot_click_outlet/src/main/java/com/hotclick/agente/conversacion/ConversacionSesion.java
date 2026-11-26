package com.hotclick.agente.conversacion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Conversación de un contacto externo con un bot. Comparte la tabla {@code hot_click_chat_sesion_tb} con las
 * sesiones del asistente web (esas dejan las columnas del agente en NULL o con su valor por defecto).
 * La retención de 30 días por inactividad de {@code DataRetentionScheduler} (ultimo_mensaje_en) también aplica.
 */
@Entity
@Table(name = "hot_click_chat_sesion_tb")
public class ConversacionSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id_sesion")
    private UUID id;

    /** null = conversación del bot de HotClick. */
    @Column(name = "fk_id_empresa")
    private Long empresaId;

    @Column(name = "canal", nullable = false, length = 20)
    private String canal;

    @Column(name = "fk_id_canal_cuenta")
    private Long canalCuentaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "perfil", length = 20)
    private PerfilConversacion perfil;

    /** wa_id, PSID o IGSID. Dato personal: nunca a logs. */
    @Column(name = "contacto_externo", length = 100)
    private String contactoExterno;

    @Enumerated(EnumType.STRING)
    @Column(name = "modo", nullable = false, length = 10)
    private ModoConversacion modo = ModoConversacion.BOT;

    @Column(name = "fk_id_usuario_asignado")
    private Long usuarioAsignadoId;

    /** Usuario del negocio cuando el remitente es personal vinculado (perfil NEGOCIO_INTERNO). */
    @Column(name = "fk_id_usuario")
    private Long usuarioId;

    @Column(name = "ultimo_mensaje_cliente")
    private Instant ultimoMensajeCliente;

    @Column(name = "ultimo_mensaje_en", nullable = false)
    private Instant ultimoMensajeEn = Instant.now();

    /** Pasó a PERSONA porque el negocio agotó su cupo de conversaciones o su tope de gasto de IA (V255). */
    @Column(name = "cupo_agotado", nullable = false)
    private boolean cupoAgotado = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 10)
    private EstadoConversacion estado = EstadoConversacion.ABIERTA;

    /** AG-38 (V257): cuándo se mandó la encuesta de satisfacción al cerrar; no nulo = no se vuelve a mandar. */
    @Column(name = "encuesta_enviada_en")
    private Instant encuestaEnviadaEn;

    @Column(name = "encuesta_respondida_en")
    private Instant encuestaRespondidaEn;

    /** Nota de 1 a 5 que eligió la persona; es lo único que se guarda de su respuesta (sin texto). */
    @Column(name = "encuesta_nota")
    private Integer encuestaNota;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }
    public Long getCanalCuentaId() { return canalCuentaId; }
    public void setCanalCuentaId(Long canalCuentaId) { this.canalCuentaId = canalCuentaId; }
    public PerfilConversacion getPerfil() { return perfil; }
    public void setPerfil(PerfilConversacion perfil) { this.perfil = perfil; }
    public String getContactoExterno() { return contactoExterno; }
    public void setContactoExterno(String contactoExterno) { this.contactoExterno = contactoExterno; }
    public ModoConversacion getModo() { return modo; }
    public void setModo(ModoConversacion modo) { this.modo = modo; }
    public Long getUsuarioAsignadoId() { return usuarioAsignadoId; }
    public void setUsuarioAsignadoId(Long usuarioAsignadoId) { this.usuarioAsignadoId = usuarioAsignadoId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public Instant getUltimoMensajeCliente() { return ultimoMensajeCliente; }
    public void setUltimoMensajeCliente(Instant v) { this.ultimoMensajeCliente = v; }
    public Instant getUltimoMensajeEn() { return ultimoMensajeEn; }
    public void setUltimoMensajeEn(Instant v) { this.ultimoMensajeEn = v; }
    public boolean isCupoAgotado() { return cupoAgotado; }
    public void setCupoAgotado(boolean v) { this.cupoAgotado = v; }
    public EstadoConversacion getEstado() { return estado; }
    public void setEstado(EstadoConversacion estado) { this.estado = estado; }
    public Instant getEncuestaEnviadaEn() { return encuestaEnviadaEn; }
    public void setEncuestaEnviadaEn(Instant v) { this.encuestaEnviadaEn = v; }
    public Instant getEncuestaRespondidaEn() { return encuestaRespondidaEn; }
    public void setEncuestaRespondidaEn(Instant v) { this.encuestaRespondidaEn = v; }
    public Integer getEncuestaNota() { return encuestaNota; }
    public void setEncuestaNota(Integer v) { this.encuestaNota = v; }

    @Override
    public String toString() {
        return "ConversacionSesion[id=" + id + ", perfil=" + perfil + ", modo=" + modo + ", estado=" + estado + "]";
    }
}
