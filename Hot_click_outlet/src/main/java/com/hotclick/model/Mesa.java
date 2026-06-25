package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hot_click_mesa_tb")
public class Mesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_mesa")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa", nullable = false)
    private Empresa empresa;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "descripcion", length = 200)
    private String descripcion;

    /** MESA | KIOSK | ESTANTE | MOSTRADOR | ZONA */
    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo = "MESA";

    /** UUID que forma parte de la URL del QR — opaco y regenerable */
    @Column(name = "qr_token", unique = true, nullable = false, length = 100)
    private String qrToken;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now(Constants.ZONA_CR);

    @PrePersist
    public void prePersist() {
        if (qrToken == null) qrToken = UUID.randomUUID().toString().replace("-", "");
    }

    public Long getId() { return id; }
    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa e) { this.empresa = e; }
    public String getNombre() { return nombre; }
    public void setNombre(String v) { this.nombre = v; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String v) { this.descripcion = v; }
    public String getTipo() { return tipo; }
    public void setTipo(String v) { this.tipo = v; }
    public String getQrToken() { return qrToken; }
    public void setQrToken(String v) { this.qrToken = v; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean v) { this.activo = v; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
}
