package com.hotclick.model;

import jakarta.persistence.*;

@Entity
@Table(name = "hot_click_plan_tb")
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plan")
    private Long id;

    @Column(name = "nombre", nullable = false, unique = true, length = 50)
    private String nombre;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "precio_mensual", nullable = false)
    private Integer precioMensual = 0;

    @Column(name = "max_usuarios", nullable = false)
    private Integer maxUsuarios = 2;

    /** -1 = ilimitado */
    @Column(name = "max_productos", nullable = false)
    private Integer maxProductos = 50;

    @Column(name = "max_bodegas", nullable = false)
    private Integer maxBodegas = 1;

    @Column(name = "max_cajas", nullable = false)
    private Integer maxCajas = 1;

    @Column(name = "tiene_pos", nullable = false)
    private Boolean tienePos = false;

    @Column(name = "tiene_crm", nullable = false)
    private Boolean tieneCrm = false;

    @Column(name = "tiene_compras", nullable = false)
    private Boolean tieneCompras = false;

    @Column(name = "tiene_reportes", nullable = false)
    private Boolean tieneReportes = false;

    @Column(name = "tiene_ai", nullable = false)
    private Boolean tieneAi = false;

    @Column(name = "tiene_api", nullable = false)
    private Boolean tieneApi = false;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    /** Créditos de IA por mes. -1 = ilimitado, 0 = sin acceso a IA. */
    @Column(name = "max_creditos_ai", nullable = false)
    private Integer maxCreditosAi = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Integer getPrecioMensual() { return precioMensual; }
    public void setPrecioMensual(Integer precioMensual) { this.precioMensual = precioMensual; }

    public Integer getMaxUsuarios() { return maxUsuarios; }
    public void setMaxUsuarios(Integer maxUsuarios) { this.maxUsuarios = maxUsuarios; }

    public Integer getMaxProductos() { return maxProductos; }
    public void setMaxProductos(Integer maxProductos) { this.maxProductos = maxProductos; }

    public Integer getMaxBodegas() { return maxBodegas; }
    public void setMaxBodegas(Integer maxBodegas) { this.maxBodegas = maxBodegas; }

    public Integer getMaxCajas() { return maxCajas; }
    public void setMaxCajas(Integer maxCajas) { this.maxCajas = maxCajas; }

    public Boolean getTienePos() { return tienePos; }
    public void setTienePos(Boolean tienePos) { this.tienePos = tienePos; }

    public Boolean getTieneCrm() { return tieneCrm; }
    public void setTieneCrm(Boolean tieneCrm) { this.tieneCrm = tieneCrm; }

    public Boolean getTieneCompras() { return tieneCompras; }
    public void setTieneCompras(Boolean tieneCompras) { this.tieneCompras = tieneCompras; }

    public Boolean getTieneReportes() { return tieneReportes; }
    public void setTieneReportes(Boolean tieneReportes) { this.tieneReportes = tieneReportes; }

    public Boolean getTieneAi() { return tieneAi; }
    public void setTieneAi(Boolean tieneAi) { this.tieneAi = tieneAi; }

    public Boolean getTieneApi() { return tieneApi; }
    public void setTieneApi(Boolean tieneApi) { this.tieneApi = tieneApi; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public Integer getMaxCreditosAi() { return maxCreditosAi; }
    public void setMaxCreditosAi(Integer maxCreditosAi) { this.maxCreditosAi = maxCreditosAi; }

    /** Conveniencia para verificar si un límite es ilimitado (-1) */
    public boolean estaEnLimite(int uso, int limite) {
        return limite != -1 && uso >= limite;
    }
}
