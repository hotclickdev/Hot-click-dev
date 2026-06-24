package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_payout_request_tb")
public class PayoutRequest {

    public static final String PENDIENTE   = "PENDIENTE";
    public static final String EN_PROCESO  = "EN_PROCESO";
    public static final String PAGADO      = "PAGADO";
    public static final String RECHAZADO   = "RECHAZADO";

    public static final String METODO_SINPE         = "SINPE";
    public static final String METODO_TRANSFERENCIA = "TRANSFERENCIA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_payout")
    private Long id;

    @Column(name = "fk_id_empresa", nullable = false)
    private Long empresaId;

    @Column(name = "monto", nullable = false)
    private Long monto;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = PENDIENTE;

    @Column(name = "metodo", nullable = false, length = 20)
    private String metodo = METODO_SINPE;

    @Column(name = "destino_sinpe", length = 20)
    private String destinoSinpe;

    @Column(name = "destino_iban", length = 30)
    private String destinoIban;

    @Column(name = "nombre_titular", length = 200)
    private String nombreTitular;

    @Column(name = "banco_destino", length = 100)
    private String bancoDestino;

    @Column(name = "notas_solicitante", columnDefinition = "TEXT")
    private String notasSolicitante;

    @Column(name = "notas_admin", columnDefinition = "TEXT")
    private String notasAdmin;

    @Column(name = "fk_id_wallet_tx_retencion")
    private Long walletTxRetencionId;

    @Column(name = "fk_id_wallet_tx_pago")
    private Long walletTxPagoId;

    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDateTime fechaSolicitud = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    // Getters/Setters
    public Long getId()                             { return id; }
    public void setId(Long v)                       { this.id = v; }

    public Long getEmpresaId()                      { return empresaId; }
    public void setEmpresaId(Long v)                { this.empresaId = v; }

    public Long getMonto()                          { return monto; }
    public void setMonto(Long v)                    { this.monto = v; }

    public String getEstado()                       { return estado; }
    public void setEstado(String v)                 { this.estado = v; }

    public String getMetodo()                       { return metodo; }
    public void setMetodo(String v)                 { this.metodo = v; }

    public String getDestinoSinpe()                 { return destinoSinpe; }
    public void setDestinoSinpe(String v)           { this.destinoSinpe = v; }

    public String getDestinoIban()                  { return destinoIban; }
    public void setDestinoIban(String v)            { this.destinoIban = v; }

    public String getNombreTitular()                { return nombreTitular; }
    public void setNombreTitular(String v)          { this.nombreTitular = v; }

    public String getBancoDestino()                 { return bancoDestino; }
    public void setBancoDestino(String v)           { this.bancoDestino = v; }

    public String getNotasSolicitante()             { return notasSolicitante; }
    public void setNotasSolicitante(String v)       { this.notasSolicitante = v; }

    public String getNotasAdmin()                   { return notasAdmin; }
    public void setNotasAdmin(String v)             { this.notasAdmin = v; }

    public Long getWalletTxRetencionId()            { return walletTxRetencionId; }
    public void setWalletTxRetencionId(Long v)      { this.walletTxRetencionId = v; }

    public Long getWalletTxPagoId()                 { return walletTxPagoId; }
    public void setWalletTxPagoId(Long v)           { this.walletTxPagoId = v; }

    public LocalDateTime getFechaSolicitud()        { return fechaSolicitud; }
    public void setFechaSolicitud(LocalDateTime v)  { this.fechaSolicitud = v; }

    public LocalDateTime getFechaPago()             { return fechaPago; }
    public void setFechaPago(LocalDateTime v)       { this.fechaPago = v; }
}
