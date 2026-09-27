package com.hotclick.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Compra del cliente en el marketplace: un solo pago a HotClick que agrupa
 * un pedido (paquete) por negocio. Cada pedido conserva su envío, su factura
 * y su crédito en la billetera del negocio.
 */
@Entity
@Table(name = "hot_click_compra_tb")
public class Compra extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_compra")
    private Long id;

    @Column(name = "numero_compra", unique = true, nullable = false, length = 20)
    private String numeroCompra;

    @Column(name = "fecha_compra", nullable = false)
    private LocalDateTime fechaCompra;

    @Column(name = "total_compra", nullable = false)
    private Integer totalCompra;

    @Column(name = "cantidad_paquetes", nullable = false)
    private Integer cantidadPaquetes;

    @Column(name = "metodo_pago", nullable = false, length = 30)
    private String metodoPago;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_id_usuario_final", nullable = false)
    private Usuario usuarioFinal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroCompra() { return numeroCompra; }
    public void setNumeroCompra(String numeroCompra) { this.numeroCompra = numeroCompra; }

    public LocalDateTime getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(LocalDateTime fechaCompra) { this.fechaCompra = fechaCompra; }

    public Integer getTotalCompra() { return totalCompra; }
    public void setTotalCompra(Integer totalCompra) { this.totalCompra = totalCompra; }

    public Integer getCantidadPaquetes() { return cantidadPaquetes; }
    public void setCantidadPaquetes(Integer cantidadPaquetes) { this.cantidadPaquetes = cantidadPaquetes; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public Usuario getUsuarioFinal() { return usuarioFinal; }
    public void setUsuarioFinal(Usuario usuarioFinal) { this.usuarioFinal = usuarioFinal; }
}
