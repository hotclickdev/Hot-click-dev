package com.hotclick.model;
import com.hotclick.utils.Constants;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_turno_caja_tb")
public class TurnoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_turno")
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "fecha_apertura", nullable = false)
    private LocalDateTime fechaApertura = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "monto_inicial", nullable = false)
    private Integer montoInicial = 0;

    @Column(name = "monto_declarado")
    private Integer montoDeclarado;

    @Column(name = "monto_calculado")
    private Integer montoCalculado;

    @Column(name = "diferencia")
    private Integer diferencia;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "ABIERTO";

    @Column(name = "total_efectivo", nullable = false)
    private Integer totalEfectivo = 0;

    @Column(name = "total_sinpe", nullable = false)
    private Integer totalSinpe = 0;

    @Column(name = "total_tarjeta", nullable = false)
    private Integer totalTarjeta = 0;

    @Column(name = "total_transferencia", nullable = false)
    private Integer totalTransferencia = 0;

    @Column(name = "num_transacciones", nullable = false)
    private Integer numTransacciones = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Long getUsuarioId() { return usuario != null ? usuario.getId() : null; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }
    public Long getEmpresaId() { return empresa != null ? empresa.getId() : null; }

    public LocalDateTime getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDateTime fechaApertura) { this.fechaApertura = fechaApertura; }

    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }

    public Integer getMontoInicial() { return montoInicial; }
    public void setMontoInicial(Integer montoInicial) { this.montoInicial = montoInicial; }

    public Integer getMontoDeclarado() { return montoDeclarado; }
    public void setMontoDeclarado(Integer montoDeclarado) { this.montoDeclarado = montoDeclarado; }

    public Integer getMontoCalculado() { return montoCalculado; }
    public void setMontoCalculado(Integer montoCalculado) { this.montoCalculado = montoCalculado; }

    public Integer getDiferencia() { return diferencia; }
    public void setDiferencia(Integer diferencia) { this.diferencia = diferencia; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Integer getTotalEfectivo() { return totalEfectivo; }
    public void setTotalEfectivo(Integer totalEfectivo) { this.totalEfectivo = totalEfectivo; }

    public Integer getTotalSinpe() { return totalSinpe; }
    public void setTotalSinpe(Integer totalSinpe) { this.totalSinpe = totalSinpe; }

    public Integer getTotalTarjeta() { return totalTarjeta; }
    public void setTotalTarjeta(Integer totalTarjeta) { this.totalTarjeta = totalTarjeta; }

    public Integer getTotalTransferencia() { return totalTransferencia; }
    public void setTotalTransferencia(Integer totalTransferencia) { this.totalTransferencia = totalTransferencia; }

    public Integer getNumTransacciones() { return numTransacciones; }
    public void setNumTransacciones(Integer numTransacciones) { this.numTransacciones = numTransacciones; }
}
