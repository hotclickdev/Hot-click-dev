package com.hotclick.dto;

import com.hotclick.model.SolicitudRecoleccion;

import java.time.LocalDateTime;

public class SolicitudRecoleccionDto {

    private Long id;
    private Long empresaId;
    private String empresaNombre;
    private String zona;
    private String direccionRecoleccion;
    private String contactoRecoleccion;
    private String telefonoRecoleccion;
    private String direccionEntrega;
    private String contactoEntrega;
    private String telefonoEntrega;
    private String notas;
    private String estado;
    private Integer tarifaColones;
    private String notasAdmin;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaCotizacion;

    public static SolicitudRecoleccionDto from(SolicitudRecoleccion s) {
        SolicitudRecoleccionDto dto = new SolicitudRecoleccionDto();
        dto.id = s.getId();
        if (s.getEmpresa() != null) {
            dto.empresaId = s.getEmpresa().getId();
            dto.empresaNombre = s.getEmpresa().getNombreEmpresa();
        }
        dto.zona = s.getZona();
        dto.direccionRecoleccion = s.getDireccionRecoleccion();
        dto.contactoRecoleccion = s.getContactoRecoleccion();
        dto.telefonoRecoleccion = s.getTelefonoRecoleccion();
        dto.direccionEntrega = s.getDireccionEntrega();
        dto.contactoEntrega = s.getContactoEntrega();
        dto.telefonoEntrega = s.getTelefonoEntrega();
        dto.notas = s.getNotas();
        dto.estado = s.getEstado();
        dto.tarifaColones = s.getTarifaColones();
        dto.notasAdmin = s.getNotasAdmin();
        dto.fechaCreacion = s.getFechaCreacion();
        dto.fechaCotizacion = s.getFechaCotizacion();
        return dto;
    }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public String getEmpresaNombre() { return empresaNombre; }
    public String getZona() { return zona; }
    public String getDireccionRecoleccion() { return direccionRecoleccion; }
    public String getContactoRecoleccion() { return contactoRecoleccion; }
    public String getTelefonoRecoleccion() { return telefonoRecoleccion; }
    public String getDireccionEntrega() { return direccionEntrega; }
    public String getContactoEntrega() { return contactoEntrega; }
    public String getTelefonoEntrega() { return telefonoEntrega; }
    public String getNotas() { return notas; }
    public String getEstado() { return estado; }
    public Integer getTarifaColones() { return tarifaColones; }
    public String getNotasAdmin() { return notasAdmin; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaCotizacion() { return fechaCotizacion; }
}
