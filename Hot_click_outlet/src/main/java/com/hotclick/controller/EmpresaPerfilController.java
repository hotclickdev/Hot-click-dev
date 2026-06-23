package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TotpSecretEncryptionService;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empresa/perfil")
public class EmpresaPerfilController {

    private static final Logger log = LoggerFactory.getLogger(EmpresaPerfilController.class);

    @Autowired private EmpresaRepository          empresaRepository;
    @Autowired private CompanyScope               companyScope;
    @Autowired private SupabaseStorageService     supabaseStorageService;
    @Autowired private TotpSecretEncryptionService encryptionService;
    @Autowired private com.hotclick.service.ImageModerationService imageModerationService;

    private static final List<String> AMBIENTES_VALIDOS = List.of("STAG", "PROD");
    private static final List<String> TIPOS_CEDULA_VALIDOS = List.of("01", "02", "03", "04");

    @GetMapping
    public ResponseEntity<ResponseDTO> get() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        Optional<Empresa> opt = empresaRepository.findById(empresaId);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        return ResponseEntity.ok(ResponseDTO.success("Perfil empresa", toSafeMap(opt.get())));
    }

    /** Guarda la configuración fiscal (Hacienda CR). Nunca devuelve ni almacena la clave en texto plano. */
    @PutMapping("/fiscal")
    public ResponseEntity<ResponseDTO> updateFiscal(@RequestBody Map<String, String> body) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        Optional<Empresa> opt = empresaRepository.findById(empresaId);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));

        Empresa e = opt.get();

        if (body.containsKey("cedulaJuridica")) {
            String v = body.get("cedulaJuridica");
            if (v != null && v.length() > 20) return ResponseEntity.badRequest().body(ResponseDTO.error("Cédula demasiado larga (máx 20 caracteres)"));
            e.setCedulaJuridica(v);
        }
        if (body.containsKey("tipoCedula")) {
            String t = body.get("tipoCedula");
            if (!TIPOS_CEDULA_VALIDOS.contains(t)) return ResponseEntity.badRequest().body(ResponseDTO.error("Tipo cédula inválido"));
            e.setTipoCedula(t);
        }
        if (body.containsKey("actividadEconomica")) {
            String v = body.get("actividadEconomica");
            if (v != null && v.length() > 10) return ResponseEntity.badRequest().body(ResponseDTO.error("Código CIIU demasiado largo (máx 10 caracteres)"));
            e.setActividadEconomica(v);
        }
        if (body.containsKey("nombreComercialFe")) {
            String v = body.get("nombreComercialFe");
            if (v != null && v.length() > 200) return ResponseEntity.badRequest().body(ResponseDTO.error("Nombre comercial demasiado largo (máx 200 caracteres)"));
            e.setNombreComercialFe(v);
        }
        if (body.containsKey("usuarioHacienda")) {
            String v = body.get("usuarioHacienda");
            if (v != null && v.length() > 100) return ResponseEntity.badRequest().body(ResponseDTO.error("Usuario ATV demasiado largo (máx 100 caracteres)"));
            e.setUsuarioHacienda(v);
        }
        if (body.containsKey("ambienteHacienda")) {
            String a = body.get("ambienteHacienda");
            if (!AMBIENTES_VALIDOS.contains(a)) return ResponseEntity.badRequest().body(ResponseDTO.error("Ambiente inválido"));
            // Solo ADMIN_IT puede cambiar a PROD
            if ("PROD".equals(a) && !companyScope.isAdminIT())
                return ResponseEntity.status(403).body(ResponseDTO.error("Solo ADMIN_IT puede activar ambiente PROD"));
            e.setAmbienteHacienda(a);
        }
        // Clave Hacienda: solo actualizar si se envió y no está vacía
        String claveRaw = body.get("claveHacienda");
        if (claveRaw != null && !claveRaw.isBlank()) {
            e.setClaveHaciendaEnc(encryptionService.encrypt(claveRaw));
        }

        empresaRepository.save(e);
        log.info("[empresa/fiscal] Config fiscal actualizada empresa={}", empresaId);
        return ResponseEntity.ok(ResponseDTO.success("Configuración fiscal guardada", toSafeMap(e)));
    }

    /** Sube el certificado PKCS#12 (.p12) a Supabase Storage y guarda el path en BD. */
    @PostMapping("/cert-p12")
    public ResponseEntity<ResponseDTO> subirCertP12(@RequestParam("file") MultipartFile file) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        try {
            String path = supabaseStorageService.subirCertificado(file, empresaId);
            Optional<Empresa> opt = empresaRepository.findById(empresaId);
            opt.ifPresent(e -> { e.setCertP12Path(path); empresaRepository.save(e); });
            log.info("[empresa/cert-p12] Cert subido empresa={}: {}", empresaId, path);
            return ResponseEntity.ok(ResponseDTO.success("Certificado subido", Map.of("certSubido", true)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[empresa/cert-p12] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir el certificado"));
        }
    }

    /** Retorna solo campos seguros — nunca expone claveHaciendaEnc ni pinCertEnc. */
    private Map<String, Object> toSafeMap(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                  e.getId());
        m.put("nombreEmpresa",       e.getNombreEmpresa());
        m.put("nombreComercial",     e.getNombreComercial());
        m.put("slug",                e.getSlug());
        m.put("correoEmpresa",       e.getCorreoEmpresa());
        m.put("telefonoEmpresa",     e.getTelefonoEmpresa());
        m.put("descripcion",         e.getDescripcion());
        m.put("logoUrl",             e.getLogoUrl());
        m.put("colorPrimario",       e.getColorPrimario());
        m.put("colorSecundario",     e.getColorSecundario());
        m.put("numeroWhatsapp",      e.getNumeroWhatsapp());
        m.put("visibilidadPublica",  Boolean.TRUE.equals(e.getVisibilidadPublica()));
        m.put("estadoEmpresa",       e.getEstadoEmpresa());
        // Fiscal — sin credenciales cifradas
        m.put("cedulaJuridica",      e.getCedulaJuridica());
        m.put("tipoCedula",          e.getTipoCedula());
        m.put("actividadEconomica",  e.getActividadEconomica());
        m.put("nombreComercialFe",   e.getNombreComercialFe());
        m.put("usuarioHacienda",     e.getUsuarioHacienda());
        m.put("ambienteHacienda",    e.getAmbienteHacienda());
        m.put("tieneCertP12",        e.getCertP12Path() != null && !e.getCertP12Path().isBlank());
        m.put("tieneClaveHacienda",  e.getClaveHaciendaEnc() != null && !e.getClaveHaciendaEnc().isBlank());
        m.put("configuracionFiscalCompleta", e.isConfiguracionFiscalCompleta());
        m.put("inscritoHacienda",    Boolean.TRUE.equals(e.getInscritoHacienda()));
        m.put("nombreHacienda",      e.getNombreHacienda());
        m.put("regimenTributario",   e.getRegimenTributario());
        return m;
    }

    @PutMapping
    public ResponseEntity<ResponseDTO> update(@RequestBody Map<String, String> body) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
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

    /** Emprendedor puede pausar/activar la visibilidad pública de su tienda */
    @CacheEvict(value = {"marcas-publicas", "categorias", "categorias-publicas"}, allEntries = true)
    @PutMapping("/visibilidad")
    public ResponseEntity<ResponseDTO> toggleVisibilidad(@RequestBody Map<String, Object> body) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        Optional<Empresa> opt = empresaRepository.findById(empresaId);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        if ("PENDIENTE_APROBACION".equals(e.getEstadoEmpresa()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("No podés cambiar la visibilidad mientras el negocio está pendiente de aprobación"));
        Object val = body.get("visibilidadPublica");
        if (val == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo visibilidadPublica requerido"));
        e.setVisibilidadPublica(Boolean.parseBoolean(val.toString()));
        empresaRepository.save(e);
        String msg = Boolean.TRUE.equals(e.getVisibilidadPublica()) ? "Tu negocio ahora es visible al público" : "Tu negocio está en modo invisible";
        return ResponseEntity.ok(ResponseDTO.success(msg, Map.of("visibilidadPublica", e.getVisibilidadPublica(), "estadoEmpresa", e.getEstadoEmpresa())));
    }

    @PostMapping("/logo")
    public ResponseEntity<ResponseDTO> subirLogo(@RequestParam("file") MultipartFile file) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));
        try {
            var mod = imageModerationService.moderar(file);
            if (!mod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Imagen rechazada: " + mod.reason()));
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
