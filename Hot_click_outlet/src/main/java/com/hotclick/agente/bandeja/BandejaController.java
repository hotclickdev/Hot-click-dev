package com.hotclick.agente.bandeja;

import com.hotclick.agente.conversacion.EstadoConversacion;
import com.hotclick.agente.metricas.EncuestaService;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Bandeja de conversaciones de los bots (AG-16). Cada negocio ve solo las suyas; el ADMIN de plataforma ve las del
 * bot de HotClick. Exige la feature "ai" del plan, igual que {@code /api/agente/canales}.
 */
@RestController
@RequestMapping("/api/bandeja")
public class BandejaController {

    private final BandejaService service;
    private final BandejaAvisoService aviso;
    private final CompanyScope companyScope;
    private final TenantService tenantService;
    private final EncuestaService encuesta;

    public BandejaController(BandejaService service, BandejaAvisoService aviso, CompanyScope companyScope,
                             TenantService tenantService) {
        this(service, aviso, companyScope, tenantService, null);
    }

    @Autowired
    public BandejaController(BandejaService service, BandejaAvisoService aviso, CompanyScope companyScope,
                             TenantService tenantService, EncuestaService encuesta) {
        this.service = service;
        this.aviso = aviso;
        this.companyScope = companyScope;
        this.tenantService = tenantService;
        this.encuesta = encuesta;
    }

    @GetMapping
    public ResponseEntity<BandejaDtos.Pagina> listar(
            @RequestParam(defaultValue = "TODAS") String vista,
            @RequestParam(required = false) String canal,
            @RequestParam(defaultValue = "ABIERTA") String estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @RequestParam(defaultValue = "false") boolean notaBaja) {
        Long scope = alcance();
        // AG-38: chats con nota baja en la encuesta (siempre cerrados); ignora vista y estado.
        if (notaBaja) {
            return ResponseEntity.ok(service.listarNotaBaja(scope, companyScope.getCurrentUserId(), canal(canal),
                pagina, tamano));
        }
        return ResponseEntity.ok(service.listar(scope, companyScope.getCurrentUserId(), vista(vista), canal(canal),
            estado(estado), pagina, tamano));
    }

    @GetMapping("/resumen")
    public ResponseEntity<BandejaDtos.Resumen> resumen() {
        Long scope = alcance();
        return ResponseEntity.ok(service.resumen(scope, companyScope.getCurrentUserId()));
    }

    @GetMapping("/equipo")
    public ResponseEntity<List<BandejaDtos.Miembro>> equipo() {
        Long scope = alcance();
        return ResponseEntity.ok(service.equipo(scope, companyScope.getCurrentUser()));
    }

    @GetMapping("/{id}/mensajes")
    public ResponseEntity<BandejaDtos.Detalle> mensajes(@PathVariable UUID id) {
        Long scope = alcance();
        return ResponseEntity.ok(service.detalle(id, scope, companyScope.getCurrentUserId()));
    }

    @PostMapping("/{id}/responder")
    public ResponseEntity<BandejaDtos.Mensaje> responder(@PathVariable UUID id,
                                                         @RequestBody BandejaDtos.PedidoResponder body) {
        Long scope = alcance();
        return ResponseEntity.ok(service.responder(id, scope, body == null ? null : body.texto()));
    }

    @PostMapping("/{id}/pausar")
    public ResponseEntity<BandejaDtos.Conversacion> pausar(@PathVariable UUID id) {
        Long scope = alcance();
        return ResponseEntity.ok(service.pausar(id, scope, companyScope.getCurrentUserId()));
    }

    @PostMapping("/{id}/reanudar")
    public ResponseEntity<BandejaDtos.Conversacion> reanudar(@PathVariable UUID id) {
        Long scope = alcance();
        return ResponseEntity.ok(service.reanudar(id, scope, companyScope.getCurrentUserId()));
    }

    @PostMapping("/{id}/tomar")
    public ResponseEntity<BandejaDtos.Conversacion> tomar(@PathVariable UUID id) {
        Long scope = alcance();
        return ResponseEntity.ok(service.tomar(id, scope, companyScope.getCurrentUserId()));
    }

    @PostMapping("/{id}/asignar")
    public ResponseEntity<BandejaDtos.Conversacion> asignar(@PathVariable UUID id,
                                                            @RequestBody BandejaDtos.PedidoAsignar body) {
        Long scope = alcance();
        Long actor = companyScope.getCurrentUserId();
        Long destino = body == null ? null : body.usuarioId();
        BandejaDtos.Conversacion c = service.asignar(id, scope, actor, destino);
        if (destino != null && !destino.equals(actor)) aviso.avisarAsignacion(destino, c.canal());
        return ResponseEntity.ok(c);
    }

    @PostMapping("/{id}/cerrar")
    public ResponseEntity<BandejaDtos.Conversacion> cerrar(@PathVariable UUID id) {
        Long scope = alcance();
        BandejaDtos.Conversacion cerrada = service.cerrar(id, scope, companyScope.getCurrentUserId());
        // AG-38: encuesta de satisfacción al cerrar (best effort, nunca falla el cierre).
        if (encuesta != null) encuesta.enviarAlCerrar(id, scope);
        return ResponseEntity.ok(cerrada);
    }

    @ExceptionHandler(BandejaConflictoException.class)
    public ResponseEntity<ResponseDTO> conflicto(BandejaConflictoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ResponseDTO.error(ex.getMessage()));
    }

    @ExceptionHandler(BandejaRechazoCanalException.class)
    public ResponseEntity<ResponseDTO> rechazoDelCanal(BandejaRechazoCanalException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ResponseDTO.error(ex.getMessage()));
    }

    /** null = ADMIN de plataforma (bot de HotClick); si no, la empresa del tenant, y su plan debe incluir la feature. */
    private Long alcance() {
        Long scope = companyScope.requireEmpresaIdOrAdmin();
        if (scope != null && !tenantService.tieneFeature("ai"))
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
        return scope;
    }

    private static BandejaService.Vista vista(String v) {
        try {
            return BandejaService.Vista.valueOf(v.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Vista inválida");
        }
    }

    private static String canal(String c) {
        if (c == null || c.isBlank()) return null;
        String x = c.trim().toUpperCase(Locale.ROOT);
        if (!List.of("WHATSAPP", "INSTAGRAM", "MESSENGER").contains(x)) throw new IllegalArgumentException("Canal inválido");
        return x;
    }

    private static EstadoConversacion estado(String e) {
        try {
            return EstadoConversacion.valueOf(e.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Estado inválido");
        }
    }
}
