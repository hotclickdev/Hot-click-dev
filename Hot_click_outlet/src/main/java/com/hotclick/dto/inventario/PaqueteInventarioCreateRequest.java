package com.hotclick.dto.inventario;

import jakarta.validation.constraints.Size;

public class PaqueteInventarioCreateRequest {

    private Long empresaId;

    @Size(max = 200)
    private String nombreNegocioTemporal;

    @Size(max = 2000)
    private String notas;

    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public String getNombreNegocioTemporal() { return nombreNegocioTemporal; }
    public void setNombreNegocioTemporal(String v) { this.nombreNegocioTemporal = v; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
