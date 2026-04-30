package com.hotclick.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_referido_tb")
public class Referido extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_referido")
    private Long id;

    @Column(name = "codigo_referido", unique = true, nullable = false, length = 20)
    private String codigoReferido;

    @Column(name = "total_referidos")
    private Integer totalReferidos = 0;

    @Column(name = "giros_ganados")
    private Integer girosGanados = 0;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @ManyToOne
    @JoinColumn(name = "fk_id_usuario_referidor", nullable = false)
    private Usuario usuarioReferidor;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCodigoReferido() { return codigoReferido; }
    public void setCodigoReferido(String codigoReferido) { this.codigoReferido = codigoReferido; }

    public Integer getTotalReferidos() { return totalReferidos; }
    public void setTotalReferidos(Integer totalReferidos) { this.totalReferidos = totalReferidos; }

    public Integer getGirosGanados() { return girosGanados; }
    public void setGirosGanados(Integer girosGanados) { this.girosGanados = girosGanados; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public Usuario getUsuarioReferidor() { return usuarioReferidor; }
    public void setUsuarioReferidor(Usuario usuarioReferidor) { this.usuarioReferidor = usuarioReferidor; }
}
