package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empresa/perfil")
public class EmpresaPerfilController {

    private static final Logger log = LoggerFactory.getLogger(EmpresaPerfilController.class);

    @Autowired private EmpresaRepository     empresaRepository;
    @Autowired private CompanyScope          companyScope;
    @Autowired private SupabaseStorageService supabaseStorageService;

    @GetMapping
    public ResponseEntity<ResponseDTO> get() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        Optional<Empresa> opt = empresaRepository.findById(empresaId);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        return ResponseEntity.ok(ResponseDTO.success("Perfil empresa", opt.get()));
    }

    @PutMapping
    public ResponseEntity<ResponseDTO> update(@RequestBody Map<String, String> body) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        Optional<Empresa> opt = empresaRepository.findById(empresaId);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));

        Empresa e = opt.get();
        if (body.containsKey("nombreComercial"))  e.setNombreComercial(body.get("nombreComercial"));
        if (body.containsKey("descripcion"))      e.setDescripcion(body.get("descripcion"));
        if (body.containsKey("telefonoEmpresa"))  e.setTelefonoEmpresa(body.get("telefonoEmpresa"));
        if (body.containsKey("correoEmpresa"))    e.setCorreoEmpresa(body.get("correoEmpresa"));
        if (body.containsKey("numeroWhatsapp"))   e.setNumeroWhatsapp(body.get("numeroWhatsapp"));
        if (body.containsKey("colorPrimario"))    e.setColorPrimario(body.get("colorPrimario"));
        if (body.containsKey("colorSecundario"))  e.setColorSecundario(body.get("colorSecundario"));
        if (body.containsKey("logoUrl"))          e.setLogoUrl(body.get("logoUrl"));

        empresaRepository.save(e);
        return ResponseEntity.ok(ResponseDTO.success("Perfil actualizado", e));
    }

    @PostMapping("/logo")
    public ResponseEntity<ResponseDTO> subirLogo(@RequestParam("file") MultipartFile file) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        try {
            String url = supabaseStorageService.subirImagen(file, "Empredimientos");
            Optional<Empresa> opt = empresaRepository.findById(empresaId);
            opt.ifPresent(e -> { e.setLogoUrl(url); empresaRepository.save(e); });
            log.info("[empresa/logo] Logo subido para empresa {}: {}", empresaId, url);
            return ResponseEntity.ok(ResponseDTO.success("Logo subido", url));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[empresa/logo] Error al subir logo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir el logo"));
        }
    }
}
