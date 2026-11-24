package com.hotclick.agente.enlace;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Enlace de compra que envía un bot de IA al cliente (AG-07). El código es un secreto de portador: quien lo tiene
 * puede abrir el carrito. Por eso nunca se expone el id interno ni se loguea el código completo.
 */
@Entity
@Table(name = "hot_click_enlace_compra_tb")
public class EnlaceCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_enlace_compra")
    private Long id;

    @Column(name = "codigo", nullable = false, length = 64, updatable = false)
    private String codigo;

    /** null = enlace del marketplace (productos de cualquier tienda aprobada). */
    @Column(name = "fk_id_empresa")
    private Long empresaId;

    /** Sin FK: la tabla de conversaciones del agente la crea otra historia. */
    @Column(name = "fk_id_chat_sesion")
    private Long chatSesionId;

    @Column(name = "contacto_externo", length = 100)
    private String contactoExterno;

    @Column(name = "nombre_cliente", length = 120)
    private String nombreCliente;

    @Column(name = "canal", nullable = false, length = 20)
    private String canal;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 15)
    private EnlaceCompraEstado estado = EnlaceCompraEstado.CREADO;

    @Column(name = "fk_id_pedido")
    private Long pedidoId;

    @Column(name = "precio_total_creado", nullable = false)
    private int precioTotalCreado;

    @Column(name = "creado", nullable = false)
    private LocalDateTime creado;

    @Column(name = "abierto")
    private LocalDateTime abierto;

    @Column(name = "vence", nullable = false)
    private LocalDateTime vence;

    /** Hasta cuándo está reservado el stock de este enlace (AG-09); null = sin reserva vigente. */
    @Column(name = "reserva_hasta")
    private LocalDateTime reservaHasta;

    @Column(name = "recordatorios_enviados", nullable = false)
    private int recordatoriosEnviados;

    @OneToMany(mappedBy = "enlace", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<EnlaceCompraItem> items = new ArrayList<>();

    public void agregarItem(EnlaceCompraItem item) {
        item.setEnlace(this);
        items.add(item);
    }

    public boolean estaVigente(LocalDateTime ahora) {
        return estado.permiteAbrir() && vence.isAfter(ahora);
    }

    public Long getId() { return id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public Long getChatSesionId() { return chatSesionId; }
    public void setChatSesionId(Long chatSesionId) { this.chatSesionId = chatSesionId; }
    public String getContactoExterno() { return contactoExterno; }
    public void setContactoExterno(String contactoExterno) { this.contactoExterno = contactoExterno; }
    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }
    public EnlaceCompraEstado getEstado() { return estado; }
    public void setEstado(EnlaceCompraEstado estado) { this.estado = estado; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }
    public int getPrecioTotalCreado() { return precioTotalCreado; }
    public void setPrecioTotalCreado(int precioTotalCreado) { this.precioTotalCreado = precioTotalCreado; }
    public LocalDateTime getCreado() { return creado; }
    public void setCreado(LocalDateTime creado) { this.creado = creado; }
    public LocalDateTime getAbierto() { return abierto; }
    public void setAbierto(LocalDateTime abierto) { this.abierto = abierto; }
    public LocalDateTime getVence() { return vence; }
    public void setVence(LocalDateTime vence) { this.vence = vence; }
    public LocalDateTime getReservaHasta() { return reservaHasta; }
    public void setReservaHasta(LocalDateTime reservaHasta) { this.reservaHasta = reservaHasta; }
    public int getRecordatoriosEnviados() { return recordatoriosEnviados; }
    public void setRecordatoriosEnviados(int recordatoriosEnviados) { this.recordatoriosEnviados = recordatoriosEnviados; }
    public List<EnlaceCompraItem> getItems() { return items; }
}
