package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.EnlacePagoOnvo;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.onvo.cuenta.ComisionOnvoSyncService;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService;
import com.hotclick.service.onvo.cuenta.RetencionOnvoRevisionService;
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

    private static final int MAX_LIST_ENLACES = EnlacePagoOnvoService.MAX_LIST_ENLACES;

    private final ComisionOnvoSyncService sync;
    private final EnlacePagoOnvoService enlaces;
    private final AuditoriaAdminRegistroService auditoria;
    private final RetencionOnvoRevisionService revision;
    private final com.hotclick.service.fiscal.ConfiguracionFiscalService configFiscal;

    public AdminOnvoCobroController(ComisionOnvoSyncService sync, EnlacePagoOnvoService enlaces,
                                    AuditoriaAdminRegistroService auditoria,
                                    RetencionOnvoRevisionService revision,
                                    com.hotclick.service.fiscal.ConfiguracionFiscalService configFiscal) {
        this.revision = revision;
        this.configFiscal = configFiscal;
        this.sync = sync;
        this.enlaces = enlaces;
        this.auditoria = auditoria;
    }

    public record SwitchesOnvoRequest(@NotNull Boolean cobroANombreNegocio, @NotNull Boolean enlacesPago) {}

    /** Interruptores del cobro por ONVO (apagados por defecto hasta validar con el sandbox). Solo ADMIN. */
    @GetMapping("/api/admin/configuracion/onvo-cobro")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> switches() {
        return ResponseEntity.ok(ResponseDTO.success("Interruptores de ONVO", configFiscal.switchesOnvo()));
    }

    @PutMapping("/api/admin/configuracion/onvo-cobro")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> guardarSwitches(@Valid @RequestBody SwitchesOnvoRequest body) {
        var nuevo = configFiscal.actualizarSwitchesOnvo(body.cobroANombreNegocio(), body.enlacesPago());
        auditoria.registrarSiAdmin("ONVO_INTERRUPTORES", "CONFIG", 1L, null,
            "cobroANombreNegocio=" + nuevo.cobroANombreNegocio() + " enlacesPago=" + nuevo.enlacesPago());
        return ResponseEntity.ok(ResponseDTO.success("Interruptores guardados", nuevo));
    }

    public record RetencionPorRevisarDto(Long pedidoId, java.math.BigDecimal feePct, java.time.LocalDateTime creadoEn) {}

    /** Pedidos cuya retención de ONVO no se pudo confirmar: sin acreditar al wallet hasta que un ADMIN decida. */
    @GetMapping("/api/admin/onvo/retenciones-por-revisar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> retencionesPorRevisar() {
        var l = revision.porRevisar().stream().limit(RetencionOnvoRevisionService.MAX_LISTA)
            .map(r -> new RetencionPorRevisarDto(r.getPedidoId(), r.getFeePct(), r.getCreadoEn())).toList();
        return ResponseEntity.ok(ResponseDTO.success("Retenciones por revisar", l));
    }

    /** Resolución manual: CONFIRMAR_RETENIDA o PLATAFORMA. Queda auditada. */
    @PostMapping("/api/admin/onvo/retenciones-por-revisar/{pedidoId}/resolver")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> resolverRetencion(@PathVariable Long pedidoId, @RequestParam String decision) {
        var r = revision.resolver(pedidoId, decision);
        if (r == RetencionOnvoRevisionService.Resolucion.NO_HAY) {
            return ResponseEntity.status(404).body(ResponseDTO.error("No hay una retención por revisar para ese pedido"));
        }
        if (r == RetencionOnvoRevisionService.Resolucion.DECISION_INVALIDA) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Decisión inválida"));
        }
        if (r == RetencionOnvoRevisionService.Resolucion.ONVO_PAGO_AL_NEGOCIO) {
            return ResponseEntity.status(409).body(ResponseDTO.error("ONVO sí le pagó al negocio"));
        }
        if (r == RetencionOnvoRevisionService.Resolucion.NO_CONFIRMADO) {
            return ResponseEntity.status(409).body(ResponseDTO.error("ONVO no confirma que se cobró a la plataforma"));
        }
        if (r == RetencionOnvoRevisionService.Resolucion.NO_CONSULTABLE) {
            return ResponseEntity.status(503).body(ResponseDTO.error("No se pudo consultar a ONVO; reintentá"));
        }
        auditoria.registrarSiAdmin("ONVO_RETENCION_RESOLVER", "PEDIDO", pedidoId, null, decision);
        return ResponseEntity.ok(ResponseDTO.success("Retención resuelta", decision));
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
        List<EnlaceDto> l = enlaces.listar(id).stream().limit(MAX_LIST_ENLACES).map(EnlaceDto::de).toList();
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
