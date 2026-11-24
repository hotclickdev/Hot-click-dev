package com.hotclick.agente.interno;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Usuario;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Panel del modo interno del bot (AG-20): el usuario del equipo genera su código de vinculación, define su PIN y
 * revoca. El dueño o administrador ve y revoca a su equipo. Todo con el alcance de la empresa del llamador
 * ({@link CompanyScope}); el ADMIN global sin empresa no usa este modo.
 */
@RestController
@RequestMapping("/api/agente/interno/vinculacion")
public class AgenteInternoController {

    /** El PIN nunca en logs: ni siquiera si alguien registra el objeto. */
    public record PinRequest(String pin) {
        @Override public String toString() { return "PinRequest[***]"; }
    }

    private final VinculacionInternaService vinculaciones;
    private final PinInternoService pins;
    private final CanalCuentaService cuentas;
    private final CompanyScope companyScope;
    private final TenantService tenantService;
    private final TelegramFlujoSupport permisos;

    public AgenteInternoController(VinculacionInternaService vinculaciones, PinInternoService pins,
                                   CanalCuentaService cuentas, CompanyScope companyScope,
                                   TenantService tenantService, TelegramFlujoSupport permisos) {
        this.vinculaciones = vinculaciones;
        this.pins = pins;
        this.cuentas = cuentas;
        this.companyScope = companyScope;
        this.tenantService = tenantService;
        this.permisos = permisos;
    }

    @PostMapping
    public ResponseEntity<?> generarCodigo() {
        Usuario u = usuarioActual();
        Long empresaId = empresaActual();
        Optional<CanalCuenta> wa = cuentas.listar(empresaId).stream()
            .filter(c -> c.getTipo() == MensajeEntrante.Canal.WHATSAPP && c.getEstado() == EstadoCanal.ACTIVA)
            .findFirst();
        if (wa.isEmpty())
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "El negocio no tiene un WhatsApp conectado y activo."));
        VinculacionInternaService.CodigoGenerado c = vinculaciones.generarCodigo(u.getId(), empresaId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("codigo", c.codigo());
        out.put("expiraEnMin", VinculacionInternaService.VIGENCIA_CODIGO.toMinutes());
        out.put("canalNombre", wa.get().getNombre());
        out.put("instruccion", "Enviá VINCULAR " + c.codigo() + " por WhatsApp, desde tu teléfono, al número del negocio.");
        return ResponseEntity.ok(out);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> estado() {
        Usuario u = usuarioActual();
        Long empresaId = empresaActual();
        Map<String, Object> out = new LinkedHashMap<>();
        Optional<AgenteVinculacion> v = vinculaciones.deUsuario(u.getId(), empresaId);
        out.put("vinculado", v.map(AgenteVinculacion::activa).orElse(false));
        out.put("telefonoTerminaEn", v.filter(AgenteVinculacion::activa).map(AgenteVinculacion::getContactoUltimos4).orElse(null));
        out.put("tienePin", v.map(x -> x.getPinHash() != null).orElse(false));
        out.put("fechaVinculacion", v.map(AgenteVinculacion::getFechaVinculacion).map(Object::toString).orElse(null));
        return ResponseEntity.ok(out);
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> revocar() {
        Usuario u = usuarioActual();
        Long empresaId = empresaActual();
        vinculaciones.revocar(u.getId(), empresaId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/pin")
    public ResponseEntity<Map<String, Object>> definirPin(@RequestBody PinRequest body) {
        Usuario u = usuarioActual();
        Long empresaId = empresaActual();
        try {
            pins.definir(u.getId(), empresaId, body == null ? null : body.pin());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /** Dueño o administrador: quiénes del equipo tienen el bot interno activo. */
    @GetMapping("/equipo")
    public ResponseEntity<?> equipo() {
        Usuario u = usuarioActual();
        Long empresaId = empresaActual();
        exigirGestor(u, empresaId);
        List<Map<String, Object>> filas = vinculaciones.activasDeEmpresa(empresaId).stream().map(v -> {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("usuarioId", v.getUsuarioId());
            f.put("telefonoTerminaEn", v.getContactoUltimos4());
            f.put("fechaVinculacion", v.getFechaVinculacion() == null ? null : v.getFechaVinculacion().toString());
            return f;
        }).toList();
        return ResponseEntity.ok(filas);
    }

    /** Dueño o administrador revoca a un miembro de SU empresa (otra empresa responde 404). */
    @DeleteMapping("/equipo/{usuarioId}")
    public ResponseEntity<?> revocarMiembro(@PathVariable Long usuarioId) {
        Usuario u = usuarioActual();
        Long empresaId = empresaActual();
        exigirGestor(u, empresaId);
        return vinculaciones.revocar(usuarioId, empresaId)
            ? ResponseEntity.ok(Map.of("ok", true)) : ResponseEntity.notFound().build();
    }

    private Usuario usuarioActual() {
        Usuario u = companyScope.getCurrentUser();
        if (u == null) throw new TenantAccessDeniedException("Sesión requerida");
        return u;
    }

    /** Empresa del llamador y plan con IA; sin empresa (ADMIN global) no aplica. */
    private Long empresaActual() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) throw new TenantAccessDeniedException("El modo interno es de un negocio");
        companyScope.assertCanAccess(empresaId);
        if (!tenantService.tieneFeature("ai"))
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
        return empresaId;
    }

    private void exigirGestor(Usuario u, Long empresaId) {
        if (!permisos.esPropietarioOAdmin(u, empresaId))
            throw new TenantAccessDeniedException("Solo el propietario o un administrador puede gestionar al equipo");
    }
}
