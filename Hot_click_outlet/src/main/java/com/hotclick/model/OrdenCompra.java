package com.hotclick.model;
import com.hotclick.utils.Constants;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hot_click_orden_compra_tb")
public class OrdenCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_orden")
    private Long id;

    @Column(name = "numero_orden", unique = true, nullable = false, length = 20)
    private String numeroOrden;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_proveedor")
    private Proveedor proveedor;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_empresa")
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario")
    private Usuario usuario;

    @Column(name = "fecha_orden", nullable = false)
    private LocalDateTime fechaOrden = LocalDateTime.now(Constants.ZONA_CR);

    @Column(name = "fecha_recepcion")
    private LocalDateTime fechaRecepcion;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "PENDIENTE";

    @Column(name = "total", nullable = false)
    private Integer total = 0;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrdenCompraItem> items = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroOrden() { return numeroOrden; }
    public void setNumeroOrden(String n) { this.numeroOrden = n; }

    public Proveedor getProveedor() { return proveedor; }
    public void setProveedor(Proveedor p) { this.proveedor = p; }

    public Empresa getEmpresa() { return empresa; }
    public void setEmpresa(Empresa e) { this.empresa = e; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario u) { this.usuario = u; }

    public LocalDateTime getFechaOrden() { return fechaOrden; }
    public void setFechaOrden(LocalDateTime d) { this.fechaOrden = d; }

    public LocalDateTime getFechaRecepcion() { return fechaRecepcion; }
    public void setFechaRecepcion(LocalDateTime d) { this.fechaRecepcion = d; }

    public String getEstado() { return estado; }
    public void setEstado(String e) { this.estado = e; }

    public Integer getTotal() { return total; }
    public void setTotal(Integer t) { this.total = t; }

    public String getNotas() { return notas; }
    public void setNotas(String n) { this.notas = n; }

    public List<OrdenCompraItem> getItems() { return items; }
    public void setItems(List<OrdenCompraItem> items) { this.items = items; }
}
