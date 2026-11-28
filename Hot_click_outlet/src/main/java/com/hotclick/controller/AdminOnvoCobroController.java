package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.EnlacePagoOnvo;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.onvo.cuenta.ComisionOnvoSyncService;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/** Comisión ONVO por negocio y enlaces de pago único (factura tardía). Solo ADMIN de plataforma. */
@RestController
public class AdminOnvoCobroController {

    public record CrearEnlaceRequest(@NotNull Integer montoCrc, @NotBlank @Size(max = 200) String motivo) {}

    public record EnlaceDto(Long id, Long empresaId, int montoCrc, String motivo, String estado, String url,
                            LocalDateTime creadoEn, LocalDateTime pagadoEn, LocalDateTime cerradoEn) {
        static EnlaceDto de(EnlacePagoOnvo e) {
            return new EnlaceDto(e.getId(), e.getEmpresaId(), e.getMontoCrc(), e.getMotivo(), e.getEstado(),
                e.abierto() ? e.getUrl() : null, e.getCreadoEn(), e.getPagadoEn(), e.getCerradoEn());
        }
    }

    private final ComisionOnvoSyncService sync;
    private final EnlacePagoOnvoService enlaces;
    private final AuditoriaAdminRegistroService auditoria;

    public AdminOnvoCobroController(ComisionOnvoSyncService sync, EnlacePagoOnvoService enlaces,
                                    AuditoriaAdminRegistroService auditoria) {
        this.sync = sync;
        this.enlaces = enlaces;
        this.auditoria = auditoria;
    }

    @GetMapping("/api/admin/empresas/{id}/onvo/comision")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> comision(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Comisión ONVO", sync.estado(id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/api/admin/empresas/{id}/onvo/comision/sincronizar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> sincronizar(@PathVariable Long id) {
        try {
            var r = sync.sincronizar(id, true);
            auditoria.registrarSiAdmin("ONVO_COMISION_SYNC", "EMPRESA", id, id, r.name());
            return ResponseEntity.ok(ResponseDTO.success("Sincronización " + r.name(), sync.estado(id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/api/admin/empresas/{id}/onvo/enlaces-pago")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> listar(@PathVariable Long id) {
        List<EnlaceDto> l = enlaces.listar(id).stream().map(EnlaceDto::de).toList();
        return ResponseEntity.ok(ResponseDTO.success("Enlaces de pago", l));
    }

    @PostMapping("/api/admin/empresas/{id}/onvo/enlaces-pago")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> crear(@PathVariable Long id, @Valid @RequestBody CrearEnlaceRequest body) {
        try {
            EnlacePagoOnvo e = enlaces.crear(id, body.montoCrc(), body.motivo());
            auditoria.registrarSiAdmin("ONVO_ENLACE_CREAR", "ENLACE_PAGO", e.getId(), id, "monto=" + e.getMontoCrc());
            return ResponseEntity.ok(ResponseDTO.success("Enlace creado", EnlaceDto.de(e)));
        } catch (EnlacePagoOnvoService.EnlaceConflictoException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(502).body(ResponseDTO.error("ONVO no pudo crear el enlace"));
        }
    }

    @PostMapping("/api/admin/onvo/enlaces-pago/{enlaceId}/cancelar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> cancelar(@PathVariable Long enlaceId) {
        try {
            EnlacePagoOnvo e = enlaces.cancelar(enlaceId);
            auditoria.registrarSiAdmin("ONVO_ENLACE_CANCELAR", "ENLACE_PAGO", e.getId(), e.getEmpresaId(), null);
            return ResponseEntity.ok(ResponseDTO.success("Enlace cancelado", EnlaceDto.de(e)));
        } catch (EnlacePagoOnvoService.EnlaceConflictoException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }
}
