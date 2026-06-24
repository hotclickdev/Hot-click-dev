package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_wallet_tb")
public class Wallet {

    @Id
    @Column(name = "fk_id_empresa")
    private Long empresaId;

    @Column(name = "saldo_disponible", nullable = false)
    private Long saldoDisponible = 0L;

    @Column(name = "saldo_retenido", nullable = false)
    private Long saldoRetenido = 0L;

    @Column(name = "total_acreditado", nullable = false)
    private Long totalAcreditado = 0L;

    @Column(name = "total_retirado", nullable = false)
    private Long totalRetirado = 0L;

    @Column(name = "ultima_actualizacion", nullable = false)
    private LocalDateTime ultimaActualizacion = LocalDateTime.now(Constants.ZONA_CR);

    public Long getEmpresaId()          { return empresaId; }
    public void setEmpresaId(Long v)    { this.empresaId = v; }

    public Long getSaldoDisponible()          { return saldoDisponible; }
    public void setSaldoDisponible(Long v)    { this.saldoDisponible = v; }

    public Long getSaldoRetenido()            { return saldoRetenido; }
    public void setSaldoRetenido(Long v)      { this.saldoRetenido = v; }

    public Long getTotalAcreditado()          { return totalAcreditado; }
    public void setTotalAcreditado(Long v)    { this.totalAcreditado = v; }

    public Long getTotalRetirado()            { return totalRetirado; }
    public void setTotalRetirado(Long v)      { this.totalRetirado = v; }

    public LocalDateTime getUltimaActualizacion()        { return ultimaActualizacion; }
    public void setUltimaActualizacion(LocalDateTime v)  { this.ultimaActualizacion = v; }
}
