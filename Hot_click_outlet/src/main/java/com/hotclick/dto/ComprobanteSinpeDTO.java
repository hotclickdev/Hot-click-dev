package com.hotclick.dto;

import com.hotclick.model.ComprobanteSinpe;

import java.time.format.DateTimeFormatter;

public class ComprobanteSinpeDTO {

    private Long   id;
    private String numeroPedido;
    private String urlComprobante;
    private String nombreRemitente;
    private String cedulaRemitente;
    private String telefonoRemitente;
    private String correoRemitente;
    private String estado;
    private String fechaSubida;
    private String fechaResolucion;
    private String notasAdmin;
    private String adminEmail;
    private Integer monto;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static ComprobanteSinpeDTO from(ComprobanteSinpe c) {
        ComprobanteSinpeDTO d = new ComprobanteSinpeDTO();
        d.id                = c.getId();
        d.numeroPedido      = c.getPedido() != null ? c.getPedido().getNumeroPedido() : null;
        d.monto             = c.getPedido() != null ? c.getPedido().getTotalPedido()  : null;
        d.urlComprobante    = c.getUrlComprobante();
        d.nombreRemitente   = c.getNombreRemitente();
        d.cedulaRemitente   = c.getCedulaRemitente();
        d.telefonoRemitente = c.getTelefonoRemitente();
        d.correoRemitente   = c.getCorreoRemitente();
        d.estado            = c.getEstado();
        d.fechaSubida       = c.getFechaSubida()    != null ? c.getFechaSubida().format(FMT)    : null;
        d.fechaResolucion   = c.getFechaResolucion() != null ? c.getFechaResolucion().format(FMT) : null;
        d.notasAdmin        = c.getNotasAdmin();
        d.adminEmail        = c.getAdminEmail();
        return d;
    }

    public Long    getId()                { return id; }
    public String  getNumeroPedido()      { return numeroPedido; }
    public String  getUrlComprobante()    { return urlComprobante; }
    public String  getNombreRemitente()   { return nombreRemitente; }
    public String  getCedulaRemitente()   { return cedulaRemitente; }
    public String  getTelefonoRemitente() { return telefonoRemitente; }
    public String  getCorreoRemitente()   { return correoRemitente; }
    public String  getEstado()            { return estado; }
    public String  getFechaSubida()       { return fechaSubida; }
    public String  getFechaResolucion()   { return fechaResolucion; }
    public String  getNotasAdmin()        { return notasAdmin; }
    public String  getAdminEmail()        { return adminEmail; }
    public Integer getMonto()             { return monto; }
}
