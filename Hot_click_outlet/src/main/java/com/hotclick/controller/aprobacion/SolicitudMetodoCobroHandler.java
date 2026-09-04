package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.MetodoCobroCambioService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SolicitudMetodoCobroHandler {

    private final SolicitudAdminGuard solicitudAdminGuard;
    private final MetodoCobroCambioService cambioService;

    SolicitudMetodoCobroHandler(
            SolicitudAdminGuard solicitudAdminGuard,
            MetodoCobroCambioService cambioService) {
        this.solicitudAdminGuard = solicitudAdminGuard;
        this.cambioService = cambioService;
    }

    public ResponseEntity<ResponseDTO> listar() {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        return ResponseEntity.ok(ResponseDTO.success(
                "Cambios de cuenta de cobro pendientes", cambioService.listarPendientes()));
    }

    public ResponseEntity<ResponseDTO> aprobar(Long id) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        cambioService.aprobar(id);
        return ResponseEntity.ok(ResponseDTO.success("Cambio de cobro aprobado", null));
    }

    public ResponseEntity<ResponseDTO> rechazar(Long id, Map<String, String> body) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        String comentario = body != null ? body.get("comentario") : null;
        cambioService.rechazar(id, comentario);
        return ResponseEntity.ok(ResponseDTO.success("Cambio de cobro rechazado", null));
    }
}
