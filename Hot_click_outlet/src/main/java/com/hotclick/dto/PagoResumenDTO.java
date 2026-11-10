package com.hotclick.dto;

import com.hotclick.model.Pago;

import java.time.format.DateTimeFormatter;

public class PagoResumenDTO {

    private Long    id;
    /** C1 QA: id del pedido del pago (el admin ya lo ve por empresa); antes no venía y salía null. */
    private Long    pedidoId;
    private String  numeroPedido;
    private String  proveedor;
    private String  estadoPago;
    private Integer monto;
    private String  correoUsuario;
    private String  merchantToken;
    private String  fechaCreacion;
    private String  fechaActualizacion;
    /** Motivo de ONVO si el reembolso quedó REEMBOLSO_PENDIENTE. Vacío si no hubo rechazo. */
    private String  reembolsoError;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public PagoResumenDTO() {}

    public static PagoResumenDTO from(Pago p) {
        PagoResumenDTO d = new PagoResumenDTO();
        d.id                = p.getId();
        d.pedidoId          = p.getPedido() != null ? p.getPedido().getId() : null;
        d.numeroPedido      = p.getPedido() != null ? p.getPedido().getNumeroPedido() : null;
        d.proveedor         = p.getProveedor();
        d.estadoPago        = p.getEstadoPago();
        d.monto             = p.getMonto();
        d.merchantToken     = p.getMerchantToken();
        d.correoUsuario     = (p.getUsuario() != null) ? p.getUsuario().getCorreo() : null;
        d.fechaCreacion     = p.getFechaCreacion()     != null ? p.getFechaCreacion().format(FMT)     : null;
        d.fechaActualizacion= p.getFechaActualizacion() != null ? p.getFechaActualizacion().format(FMT) : null;
        d.reembolsoError    = p.getReembolsoError();
        return d;
    }

    public Long    getId()                { return id; }
    public Long    getPedidoId()          { return pedidoId; }
    public String  getNumeroPedido()      { return numeroPedido; }
    public String  getProveedor()         { return proveedor; }
    public String  getEstadoPago()        { return estadoPago; }
    public Integer getMonto()             { return monto; }
    public String  getCorreoUsuario()     { return correoUsuario; }
    public String  getMerchantToken()     { return merchantToken; }
    public String  getFechaCreacion()     { return fechaCreacion; }
    public String  getFechaActualizacion(){ return fechaActualizacion; }
    public String  getReembolsoError()    { return reembolsoError; }
}
