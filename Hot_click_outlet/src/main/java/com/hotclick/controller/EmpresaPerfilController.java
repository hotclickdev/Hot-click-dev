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

    @GetMapping
    public ResponseEntity<ResponseDTO> get() {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        return ResponseEntity.ok(ResponseDTO.success("Perfil empresa", empresaPerfilService.obtener(empresaId)));
    }

    @PutMapping("/fiscal")
    public ResponseEntity<ResponseDTO> updateFiscal(@RequestBody Map<String, String> body) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        return ResponseEntity.ok(ResponseDTO.success("Configuración fiscal guardada",
            empresaPerfilService.updateFiscal(empresaId, body, companyScope.isAdminIT())));
    }

    @PostMapping("/cert-p12")
    public ResponseEntity<ResponseDTO> subirCertP12(@RequestParam("file") MultipartFile file) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
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

    @PutMapping
    public ResponseEntity<ResponseDTO> update(@RequestBody Map<String, String> body) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        return ResponseEntity.ok(ResponseDTO.success("Perfil actualizado", empresaPerfilService.update(empresaId, body)));
    }

    @PutMapping("/visibilidad")
    public ResponseEntity<ResponseDTO> toggleVisibilidad(@RequestBody Map<String, Object> body) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        Map<String, Object> data = empresaPerfilService.toggleVisibilidad(empresaId, body.get("visibilidadPublica"));
        String msg = Boolean.TRUE.equals(data.get("visibilidadPublica"))
            ? "Tu negocio ahora es visible al público" : "Tu negocio está en modo invisible";
        return ResponseEntity.ok(ResponseDTO.success(msg, data));
    }

    @PostMapping("/logo")
    public ResponseEntity<ResponseDTO> subirLogo(@RequestParam("file") MultipartFile file) {
        Long empresaId = empresaIdO403();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
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

    private Long empresaIdO403() {
        return companyScope.getCurrentEmpresaIdOrOwn();
    }
}
