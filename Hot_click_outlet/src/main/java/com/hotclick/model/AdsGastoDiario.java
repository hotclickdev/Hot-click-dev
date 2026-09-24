package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_ads_gasto_diario_tb",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_ads_gasto_empresa_fecha_canal_campana",
           columnNames = {"fk_id_empresa", "fecha", "canal", "campana"}))
public class AdsGastoDiario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_gasto_ads")
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "canal", nullable = false, length = 40)
    private String canal = "meta";

    @Column(name = "campana", nullable = false, length = 255)
    private String campana;

    @Column(name = "monto_crc", nullable = false)
    private Integer montoCrc = 0;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(name = "fuente", nullable = false, length = 40)
    private String fuente = "manual";

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }

    public String getCampana() { return campana; }
    public void setCampana(String campana) { this.campana = campana; }

    public Integer getMontoCrc() { return montoCrc; }
    public void setMontoCrc(Integer montoCrc) { this.montoCrc = montoCrc; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getFuente() { return fuente; }
    public void setFuente(String fuente) { this.fuente = fuente; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
