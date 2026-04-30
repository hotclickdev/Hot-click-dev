package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_marca_tb")
public class Marca extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_marca")
    private Long id;

    @Column(name = "nombre_marca", nullable = false, unique = true, length = 100)
    private String nombreMarca;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @ManyToOne
    @JoinColumn(name = "fk_id_admin_cliente", nullable = false)
    private Usuario adminCliente;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreMarca() { return nombreMarca; }
    public void setNombreMarca(String nombreMarca) { this.nombreMarca = nombreMarca; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public Usuario getAdminCliente() { return adminCliente; }
    public void setAdminCliente(Usuario adminCliente) { this.adminCliente = adminCliente; }
}
