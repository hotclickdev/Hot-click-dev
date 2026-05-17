package com.hotclick.dto;

import com.hotclick.model.WebhookEvent;

import java.time.format.DateTimeFormatter;

public class WebhookEventResumenDTO {

    private Long    id;
    private String  merchantToken;
    private String  eventoTipo;
    private String  ipOrigen;
    private Boolean procesado;
    private String  errorProcesamiento;
    private String  fechaRecepcion;
    private String  procesadoEn;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public WebhookEventResumenDTO() {}

    public static WebhookEventResumenDTO from(WebhookEvent w) {
        WebhookEventResumenDTO d = new WebhookEventResumenDTO();
        d.id                 = w.getId();
        d.merchantToken      = w.getMerchantToken();
        d.eventoTipo         = w.getEventoTipo();
        d.ipOrigen           = w.getIpOrigen();
        d.procesado          = w.getProcesado();
        d.errorProcesamiento = w.getErrorProcesamiento();
        d.fechaRecepcion     = w.getFechaRecepcion() != null ? w.getFechaRecepcion().format(FMT) : null;
        d.procesadoEn        = w.getProcesadoEn()    != null ? w.getProcesadoEn().format(FMT)    : null;
        return d;
    }

    public Long    getId()                { return id; }
    public String  getMerchantToken()     { return merchantToken; }
    public String  getEventoTipo()        { return eventoTipo; }
    public String  getIpOrigen()          { return ipOrigen; }
    public Boolean getProcesado()         { return procesado; }
    public String  getErrorProcesamiento(){ return errorProcesamiento; }
    public String  getFechaRecepcion()    { return fechaRecepcion; }
    public String  getProcesadoEn()       { return procesadoEn; }
}
