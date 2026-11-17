package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.EmpresaPerfilService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/empresa/perfil")
public class EmpresaPerfilController {

    private static final Logger log = LoggerFactory.getLogger(EmpresaPerfilController.class);

    @Autowired private CompanyScope companyScope;
    @Autowired private EmpresaPerfilService empresaPerfilService;
    @Autowired private com.hotclick.security.PropietarioGuard propietarioGuard;
    @Autowired private com.hotclick.security.PinCertIntentosLimiter pinLimiter;
    @Autowired private com.hotclick.security.ClientIpResolver clientIpResolver;

    @GetMapping
    public ResponseEntity<ResponseDTO> get() {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        return ResponseEntity.ok(ResponseDTO.success("Perfil empresa", empresaPerfilService.obtener(empresaId)));
    }

    @PutMapping("/fiscal")
    public ResponseEntity<ResponseDTO> updateFiscal(@RequestBody Map<String, String> body) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA3-019
        return ResponseEntity.ok(ResponseDTO.success("Configuración fiscal guardada",
            empresaPerfilService.updateFiscal(empresaId, body, companyScope.isAdminIT())));
    }

    @PostMapping("/cert-p12")
    public ResponseEntity<ResponseDTO> subirCertP12(@RequestParam("file") MultipartFile file) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // QA3-019
        try {
            empresaPerfilService.subirCertP12(empresaId, file);
            return ResponseEntity.ok(ResponseDTO.success("Certificado subido", Map.of("certSubido", true)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[empresa/cert-p12] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir el certificado"));
        }
    }

    static final String MSG_DEMASIADOS = "Demasiados intentos. Intente de nuevo más tarde.";

    @PutMapping("/pin-cert")
    public ResponseEntity<ResponseDTO> guardarPinCert(@RequestBody Map<String, String> body,
                                                      jakarta.servlet.http.HttpServletRequest request) {
        // empresaId SIEMPRE de la sesión: cualquier id en el body se ignora.
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario();
        Long usuarioId = companyScope.getCurrentUserId();
        String ip = clientIpResolver.resolve(request);
        // 1) RESERVA atómica del intento ANTES de tocar el .p12 (y antes de validar el formato: un formato inválido
        //    también consume cupo). Nada se cuenta después: no hay ventana entre revisar y contar.
        try {
            long bloqueo = pinLimiter.reservarIntento(empresaId, usuarioId, ip);
            if (bloqueo > 0) return tooMany(bloqueo);
        } catch (Exception e) {
            // Fail-closed: sin poder escribir el conteo no se abre el .p12 ni se prueba ningún PIN.
            log.warn("[empresa/pin-cert] límite de intentos no disponible ({})", e.getClass().getSimpleName());
            return ResponseEntity.status(503).header("Retry-After", "60")
                .body(ResponseDTO.error("No pudimos verificar el límite de intentos. Intente de nuevo más tarde."));
        }
        // 2) Solo con cupo reservado se prueba el PIN.
        try {
            Map<String, Object> data = empresaPerfilService.guardarPinCert(empresaId, body == null ? null : body.get("pin"));
            try {
                pinLimiter.liberarReserva(empresaId, usuarioId, ip);
            } catch (Exception ex) {
                // El PIN ya quedó guardado. Si no se pudo devolver el cupo queda consumido: seguro (no abre brecha).
                log.warn("[empresa/pin-cert] no se pudo liberar el cupo reservado ({})", ex.getClass().getSimpleName());
            }
            return ResponseEntity.ok(ResponseDTO.success("PIN del certificado guardado", data));
        } catch (com.hotclick.service.hacienda.PinCertIncorrectoException e) {
            // Ya contado al reservar: NO se vuelve a incrementar aquí.
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException | com.hotclick.service.hacienda.HaciendaConfiguracionException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.RecursoNoEncontradoException e) {
            throw e;
        } catch (Exception e) {
            // Sin mensaje ni stack: no se arriesga a repetir el PIN en el log.
            log.error("[empresa/pin-cert] Error inesperado ({})", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No pudimos guardar el PIN. Intente de nuevo."));
        }
    }

    private static ResponseEntity<ResponseDTO> tooMany(long segundos) {
        return ResponseEntity.status(429).header("Retry-After", String.valueOf(segundos))
            .body(ResponseDTO.error(MSG_DEMASIADOS));
    }

    @PutMapping
    public ResponseEntity<ResponseDTO> update(@RequestBody Map<String, String> body) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // LECTOR/EDITOR: solo dueño
        return ResponseEntity.ok(ResponseDTO.success("Perfil actualizado", empresaPerfilService.update(empresaId, body)));
    }

    @PutMapping("/visibilidad")
    public ResponseEntity<ResponseDTO> toggleVisibilidad(@RequestBody Map<String, Object> body) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        if (!propietarioGuard.puedeCambiarVisibilidad(empresaId)) return soloPropietario(); // QA3-019 + ADMIN de equipo
        Map<String, Object> data = empresaPerfilService.toggleVisibilidad(empresaId, body.get("visibilidadPublica"));
        String msg = Boolean.TRUE.equals(data.get("visibilidadPublica"))
            ? "Tu negocio ahora es visible al público" : "Tu negocio está en modo invisible";
        return ResponseEntity.ok(ResponseDTO.success(msg, data));
    }

    @PostMapping("/logo")
    public ResponseEntity<ResponseDTO> subirLogo(@RequestParam("file") MultipartFile file) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // LECTOR/EDITOR: solo dueño
        try {
            String url = empresaPerfilService.subirLogo(empresaId, file);
            return ResponseEntity.ok(ResponseDTO.success("Logo subido", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[empresa/logo] Error al subir logo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir el logo"));
        }
    }

    @PostMapping("/portada")
    public ResponseEntity<ResponseDTO> subirPortada(@RequestParam("file") MultipartFile file) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada", java.util.Map.of("codigo", com.hotclick.exception.EmpresaRequeridaException.CODIGO)));
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId)) return soloPropietario(); // LECTOR/EDITOR: solo dueño
        try {
            String url = empresaPerfilService.subirPortada(empresaId, file);
            return ResponseEntity.ok(ResponseDTO.success("Portada subida", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[empresa/portada] Error al subir portada: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir la portada"));
        }
    }

    private Long empresaIdO403() {
        return companyScope.getCurrentEmpresaIdOrOwn();
    }

    private ResponseEntity<ResponseDTO> soloPropietario() {
        return ResponseEntity.status(403).body(ResponseDTO.error(com.hotclick.security.PropietarioGuard.MSG));
    }
}
