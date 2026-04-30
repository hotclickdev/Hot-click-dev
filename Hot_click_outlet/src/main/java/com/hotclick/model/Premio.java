package com.hotclick.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "hot_click_premio_tb")
public class Premio extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_premio")
    private Long id;

    @Column(name = "nombre_premio", nullable = false, length = 100)
    private String nombrePremio;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "tipo_premio", nullable = false, length = 30)
    private String tipoPremio;

    @Column(name = "valor_premio")
    private Integer valorPremio = 0;

    @ManyToOne
    @JoinColumn(name = "fk_id_producto_premio")
    private Producto productoPremio;

    @Column(name = "probabilidad", nullable = false, precision = 5, scale = 2)
    private BigDecimal probabilidad;

    @Column(name = "stock_disponible")
    private Integer stockDisponible = -1;

    @Column(name = "color_ruleta", nullable = false, length = 7)
    private String colorRuleta;

    @Column(name = "icono_url", length = 500)
    private String iconoUrl;

    @Column(name = "activo")
    private Boolean activo = true;

    @Column(name = "fecha_inicio")
    private LocalDateTime fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDateTime fechaFin;

    @ManyToOne
    @JoinColumn(name = "fk_id_admin_cliente", nullable = false)
    private Usuario adminCliente;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombrePremio() { return nombrePremio; }
    public void setNombrePremio(String nombrePremio) { this.nombrePremio = nombrePremio; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getTipoPremio() { return tipoPremio; }
    public void setTipoPremio(String tipoPremio) { this.tipoPremio = tipoPremio; }

    public Integer getValorPremio() { return valorPremio; }
    public void setValorPremio(Integer valorPremio) { this.valorPremio = valorPremio; }

    public Producto getProductoPremio() { return productoPremio; }
    public void setProductoPremio(Producto productoPremio) { this.productoPremio = productoPremio; }

    public BigDecimal getProbabilidad() { return probabilidad; }
    public void setProbabilidad(BigDecimal probabilidad) { this.probabilidad = probabilidad; }

    public Integer getStockDisponible() { return stockDisponible; }
    public void setStockDisponible(Integer stockDisponible) { this.stockDisponible = stockDisponible; }

    public String getColorRuleta() { return colorRuleta; }
    public void setColorRuleta(String colorRuleta) { this.colorRuleta = colorRuleta; }

    public String getIconoUrl() { return iconoUrl; }
    public void setIconoUrl(String iconoUrl) { this.iconoUrl = iconoUrl; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDateTime fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDateTime getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDateTime fechaFin) { this.fechaFin = fechaFin; }

    public Usuario getAdminCliente() { return adminCliente; }
    public void setAdminCliente(Usuario adminCliente) { this.adminCliente = adminCliente; }
}
