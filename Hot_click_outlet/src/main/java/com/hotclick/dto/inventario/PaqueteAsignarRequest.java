package com.hotclick.dto.inventario;

import jakarta.validation.constraints.NotNull;

public class PaqueteAsignarRequest {

    @NotNull(message = "empresaId es obligatorio")
    private Long empresaId;

    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
}
