package com.hotclick.agente.interno;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Vinculación verificada de un teléfono (canal WhatsApp) a un usuario del negocio: habilita el modo interno del bot.
 * El teléfono solo se guarda como HMAC + últimos 4 dígitos; el código de un solo uso y el PIN, como hash.
 * Ciclo: PENDIENTE (código generado) → ACTIVA (el usuario envió el código desde su teléfono) → REVOCADA.
 */
@Entity
@Table(name = "hot_click_agente_vinculacion_tb")
public class AgenteVinculacion {

    public static final String PENDIENTE = "PENDIENTE";
    public static final String ACTIVA = "ACTIVA";
    public static final String REVOCADA = "REVOCADA";
    public static final String CANAL_WHATSAPP = "WHATSAPP";

    /** Propuesta de acción esperando "SÍ" (pendiente_json guarda la acción). */
    public static final String PEND_CONFIRMAR = "CONFIRMAR";
    /** Se dijo "SÍ" pero falta el PIN para ejecutar la acción de pendiente_json. */
    public static final String PEND_PIN_ACCION = "PIN_ACCION";
    /** Se pidió una consulta de finanzas sin PIN vigente. */
    public static final String PEND_PIN_FINANZAS = "PIN_FINANZAS";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_vinculacion")
    private Long id;

    @Column(name = "fk_id_usuario", nullable = false)
    private Long usuarioId;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "canal", nullable = false, length = 20)
    private String canal = CANAL_WHATSAPP;

    @Column(name = "contacto_hash", length = 64)
    private String contactoHash;

    @Column(name = "contacto_ultimos4", length = 4)
    private String contactoUltimos4;

    @Column(name = "estado", nullable = false, length = 10)
    private String estado = PENDIENTE;

    @Column(name = "codigo_hash", length = 64)
    private String codigoHash;

    @Column(name = "codigo_expira")
    private Instant codigoExpira;

    @Column(name = "pin_hash", length = 100)
    private String pinHash;

    @Column(name = "pin_intentos_fallidos", nullable = false)
    private int pinIntentosFallidos;

    @Column(name = "pin_bloqueado_hasta")
    private Instant pinBloqueadoHasta;

    /** Bloqueos seguidos sin un acierto: sube la duración del siguiente bloqueo (AG-14 H-05). */
    @Column(name = "pin_bloqueos_seguidos", nullable = false)
    private int pinBloqueosSeguidos;

    @Column(name = "pin_sesion_hasta")
    private Instant pinSesionHasta;

    @Column(name = "pendiente_tipo", length = 20)
    private String pendienteTipo;

    @Column(name = "pendiente_json", columnDefinition = "TEXT")
    private String pendienteJson;

    @Column(name = "pendiente_expira")
    private Instant pendienteExpira;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion = Instant.now();

    @Column(name = "fecha_vinculacion")
    private Instant fechaVinculacion;

    @Column(name = "fecha_revocacion")
    private Instant fechaRevocacion;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }
    public String getContactoHash() { return contactoHash; }
    public void setContactoHash(String contactoHash) { this.contactoHash = contactoHash; }
    public String getContactoUltimos4() { return contactoUltimos4; }
    public void setContactoUltimos4(String contactoUltimos4) { this.contactoUltimos4 = contactoUltimos4; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getCodigoHash() { return codigoHash; }
    public void setCodigoHash(String codigoHash) { this.codigoHash = codigoHash; }
    public Instant getCodigoExpira() { return codigoExpira; }
    public void setCodigoExpira(Instant codigoExpira) { this.codigoExpira = codigoExpira; }
    public String getPinHash() { return pinHash; }
    public void setPinHash(String pinHash) { this.pinHash = pinHash; }
    public int getPinIntentosFallidos() { return pinIntentosFallidos; }
    public void setPinIntentosFallidos(int n) { this.pinIntentosFallidos = n; }
    public int getPinBloqueosSeguidos() { return pinBloqueosSeguidos; }
    public void setPinBloqueosSeguidos(int n) { this.pinBloqueosSeguidos = n; }
    public Instant getPinBloqueadoHasta() { return pinBloqueadoHasta; }
    public void setPinBloqueadoHasta(Instant t) { this.pinBloqueadoHasta = t; }
    public Instant getPinSesionHasta() { return pinSesionHasta; }
    public void setPinSesionHasta(Instant t) { this.pinSesionHasta = t; }
    public String getPendienteTipo() { return pendienteTipo; }
    public String getPendienteJson() { return pendienteJson; }
    public Instant getPendienteExpira() { return pendienteExpira; }
    public Instant getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(Instant t) { this.fechaCreacion = t; }
    public Instant getFechaVinculacion() { return fechaVinculacion; }
    public void setFechaVinculacion(Instant t) { this.fechaVinculacion = t; }
    public Instant getFechaRevocacion() { return fechaRevocacion; }
    public void setFechaRevocacion(Instant t) { this.fechaRevocacion = t; }

    public boolean activa() { return ACTIVA.equals(estado); }

    public void setPendiente(String tipo, String json, Instant expira) {
        this.pendienteTipo = tipo;
        this.pendienteJson = json;
        this.pendienteExpira = expira;
    }

    public void limpiarPendiente() { setPendiente(null, null, null); }

    public boolean pendienteVigente(Instant ahora) {
        return pendienteTipo != null && pendienteExpira != null && ahora.isBefore(pendienteExpira);
    }

    public boolean pinVigente(Instant ahora) {
        return pinSesionHasta != null && ahora.isBefore(pinSesionHasta);
    }

    /** Sin hashes ni teléfono en logs. */
    @Override
    public String toString() {
        return "AgenteVinculacion[id=" + id + ", estado=" + estado + "]";
    }
}
