package com.hotclick.model;
nimport com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_miembro_empresa_tb",
       uniqueConstraints = @UniqueConstraint(columnNames = {"fk_id_usuario", "fk_id_empresa"}))
public class MiembroEmpresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_miembro")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "rol_en_empresa", nullable = false, length = 30)
    private String rolEnEmpresa = "MIEMBRO";

    @Column(name = "estado", nullable = false)
    private Integer estado = 1;

    @Column(name = "fecha_ingreso")
    private LocalDateTime fechaIngreso;

    public MiembroEmpresa() {}

    public MiembroEmpresa(Usuario usuario, Empresa empresa, String rolEnEmpresa) {
        this.usuario = usuario;
        this.empresa = empresa;
        this.rolEnEmpresa = rolEnEmpresa;
        this.estado = 1;
        this.fechaIngreso = LocalDateTime.now(Constants.ZONA_CR);
    }

    public Long getId() { return id; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa empresa) { this.empresa = empresa; }

    public String getRolEnEmpresa() { return rolEnEmpresa; }
    public void setRolEnEmpresa(String rolEnEmpresa) { this.rolEnEmpresa = rolEnEmpresa; }

    public Integer getEstado() { return estado; }
    public void setEstado(Integer estado) { this.estado = estado; }

    public LocalDateTime getFechaIngreso() { return fechaIngreso; }
    public void setFechaIngreso(LocalDateTime fechaIngreso) { this.fechaIngreso = fechaIngreso; }
}
