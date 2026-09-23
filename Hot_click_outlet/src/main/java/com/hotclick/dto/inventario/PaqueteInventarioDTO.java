package com.hotclick.dto.inventario;

import java.time.LocalDateTime;
import java.util.List;

public class PaqueteInventarioDTO {

    private Long id;
    private String codigo;
    private Long empresaId;
    private String empresaNombre;
    private String nombreNegocioTemporal;
    private String estado;
    private String notas;
    private String creadoPorNombre;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaCierre;
    private LocalDateTime fechaAsignacion;
    private int totalLineas;
    private List<PaqueteLineaDTO> lineas;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getEmpresaNombre() { return empresaNombre; }
    public void setEmpresaNombre(String empresaNombre) { this.empresaNombre = empresaNombre; }
    public String getNombreNegocioTemporal() { return nombreNegocioTemporal; }
    public void setNombreNegocioTemporal(String v) { this.nombreNegocioTemporal = v; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public String getCreadoPorNombre() { return creadoPorNombre; }
    public void setCreadoPorNombre(String creadoPorNombre) { this.creadoPorNombre = creadoPorNombre; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime v) { this.fechaCreacion = v; }
    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime v) { this.fechaCierre = v; }
    public LocalDateTime getFechaAsignacion() { return fechaAsignacion; }
    public void setFechaAsignacion(LocalDateTime v) { this.fechaAsignacion = v; }
    public int getTotalLineas() { return totalLineas; }
    public void setTotalLineas(int totalLineas) { this.totalLineas = totalLineas; }
    public List<PaqueteLineaDTO> getLineas() { return lineas; }
    public void setLineas(List<PaqueteLineaDTO> lineas) { this.lineas = lineas; }
}
