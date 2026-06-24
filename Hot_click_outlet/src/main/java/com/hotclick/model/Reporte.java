package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_reporte_tb",
    uniqueConstraints = @UniqueConstraint(columnNames = {"fk_id_empresa", "tipo", "periodo"}))
public class Reporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reporte")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo = "EJECUTIVO_MENSUAL";

    @Column(name = "periodo", nullable = false, length = 10)
    private String periodo;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "GENERADO";

    @Column(name = "resumen_ai", columnDefinition = "text")
    private String resumenAi;

    @Column(name = "fecha_generacion")
    private LocalDateTime fechaGeneracion;

    @PrePersist
    void onCreate() { fechaGeneracion = LocalDateTime.now(Constants.ZONA_CR); }

    public Long getId() { return id; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa e) { this.empresa = e; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getResumenAi() { return resumenAi; }
    public void setResumenAi(String resumenAi) { this.resumenAi = resumenAi; }
    public LocalDateTime getFechaGeneracion() { return fechaGeneracion; }
}
