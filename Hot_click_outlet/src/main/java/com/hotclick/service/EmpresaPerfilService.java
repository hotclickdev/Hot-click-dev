package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmpresaPerfilService {

    private static final Logger log = LoggerFactory.getLogger(EmpresaPerfilService.class);
    private static final List<String> AMBIENTES_VALIDOS = List.of("STAG", "PROD");
    private static final List<String> TIPOS_CEDULA_VALIDOS = List.of("01", "02", "03", "04");

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private TotpSecretEncryptionService encryptionService;
    @Autowired private ImageModerationService imageModerationService;

    public Map<String, Object> obtener(Long empresaId) {
        return toSafeMap(empresa(empresaId));
    }

    public Map<String, Object> updateFiscal(Long empresaId, Map<String, String> body, boolean puedeActivarProd) {
        Empresa e = empresa(empresaId);
        aplicarCamposFiscales(e, body, puedeActivarProd);
        String claveRaw = body.get("claveHacienda");
        if (claveRaw != null && !claveRaw.isBlank()) {
            e.setClaveHaciendaEnc(encryptionService.encrypt(claveRaw));
        }
        empresaRepository.save(e);
        log.info("[empresa/fiscal] Config fiscal actualizada empresa={}", empresaId);
        return toSafeMap(e);
    }

    public void subirCertP12(Long empresaId, MultipartFile file) throws java.io.IOException {
        String path = supabaseStorageService.subirCertificado(file, empresaId);
        empresaRepository.findById(empresaId).ifPresent(e -> {
            e.setCertP12Path(path);
            empresaRepository.save(e);
        });
        log.info("[empresa/cert-p12] Cert subido empresa={}: {}", empresaId, path);
    }

    public Map<String, Object> update(Long empresaId, Map<String, String> body) {
        Empresa e = empresa(empresaId);
        if (body.containsKey("nombreComercial")) e.setNombreComercial(body.get("nombreComercial"));
        if (body.containsKey("descripcion")) e.setDescripcion(body.get("descripcion"));
        if (body.containsKey("telefonoEmpresa")) e.setTelefonoEmpresa(body.get("telefonoEmpresa"));
        if (body.containsKey("correoEmpresa")) e.setCorreoEmpresa(body.get("correoEmpresa"));
        if (body.containsKey("numeroWhatsapp")) e.setNumeroWhatsapp(body.get("numeroWhatsapp"));
        if (body.containsKey("categoriaNegocio")) e.setCategoriaNegocio(body.get("categoriaNegocio"));
        if (body.containsKey("instagram")) e.setInstagram(body.get("instagram"));
        if (body.containsKey("zonaEnvio")) e.setZonaEnvio(body.get("zonaEnvio"));
        if (body.containsKey("colorPrimario")) e.setColorPrimario(body.get("colorPrimario"));
        if (body.containsKey("colorSecundario")) e.setColorSecundario(body.get("colorSecundario"));
        if (body.containsKey("colorAcento")) e.setColorAcento(body.get("colorAcento"));
        if (body.containsKey("logoUrl")) e.setLogoUrl(body.get("logoUrl"));
        if (body.containsKey("tagline")) e.setTagline(body.get("tagline"));
        if (body.containsKey("footerTexto")) e.setFooterTexto(body.get("footerTexto"));
        empresaRepository.save(e);
        return toSafeMap(e);
    }

    @CacheEvict(value = {"marcas-publicas", "categorias", "categorias-publicas"}, allEntries = true)
    public Map<String, Object> toggleVisibilidad(Long empresaId, Object val) {
        Empresa e = empresa(empresaId);
        asegurarCuentaActivaParaCatalogo(e);
        if (val == null) throw new IllegalArgumentException("Campo visibilidadPublica requerido");
        e.setVisibilidadPublica(Boolean.parseBoolean(val.toString()));
        empresaRepository.save(e);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("visibilidadPublica", e.getVisibilidadPublica());
        data.put("estadoEmpresa", e.getEstadoEmpresa());
        return data;
    }

    /** Solo una cuenta ACTIVA puede publicar o pausar el catálogo; el dueño no reactiva SUSPENDIDO/INACTIVO. */
    private void asegurarCuentaActivaParaCatalogo(Empresa e) {
        String estado = e.getEstadoEmpresa();
        if ("ACTIVO".equals(estado)) return;
        if ("PENDIENTE_APROBACION".equals(estado)) {
            throw new IllegalArgumentException(
                "No podés cambiar la visibilidad mientras el negocio está pendiente de aprobación");
        }
        if ("SUSPENDIDO".equals(estado) || "INACTIVO".equals(estado)) {
            throw new IllegalArgumentException(
                "HotClick apagó la cuenta de este negocio. No podés publicar la tienda desde acá.");
        }
        throw new IllegalArgumentException(
            "No podés cambiar la visibilidad con el estado actual de la cuenta");
    }

    public String subirLogo(Long empresaId, MultipartFile file) throws java.io.IOException {
        var mod = imageModerationService.moderar(file);
        if (!mod.safe()) {
            throw new IllegalArgumentException("Imagen rechazada: " + mod.reason());
        }
        String url = supabaseStorageService.subirImagen(file, "Empredimientos");
        empresaRepository.findById(empresaId).ifPresent(emp -> {
            emp.setLogoUrl(url);
            empresaRepository.save(emp);
        });
        log.info("[empresa/logo] Logo subido para empresa {}: {}", empresaId, url);
        return url;
    }

    private void aplicarCamposFiscales(Empresa e, Map<String, String> body, boolean puedeActivarProd) {
        copiarSiCabe(body, "cedulaJuridica", 20, "Cédula demasiado larga (máx 20 caracteres)", e::setCedulaJuridica);
        if (body.containsKey("tipoCedula")) {
            String t = body.get("tipoCedula");
            if (!TIPOS_CEDULA_VALIDOS.contains(t)) throw new IllegalArgumentException("Tipo cédula inválido");
            e.setTipoCedula(t);
        }
        copiarSiCabe(body, "actividadEconomica", 10, "Código CIIU demasiado largo (máx 10 caracteres)", e::setActividadEconomica);
        copiarSiCabe(body, "nombreComercialFe", 200, "Nombre comercial demasiado largo (máx 200 caracteres)", e::setNombreComercialFe);
        copiarSiCabe(body, "usuarioHacienda", 100, "Usuario ATV demasiado largo (máx 100 caracteres)", e::setUsuarioHacienda);
        if (body.containsKey("ambienteHacienda")) {
            String a = body.get("ambienteHacienda");
            if (!AMBIENTES_VALIDOS.contains(a)) throw new IllegalArgumentException("Ambiente inválido");
            if ("PROD".equals(a) && !puedeActivarProd) {
                throw new com.hotclick.exception.TenantAccessDeniedException("Solo ADMIN puede activar ambiente PROD");
            }
            e.setAmbienteHacienda(a);
        }
    }

    private void copiarSiCabe(Map<String, String> body, String key, int max, String error,
                              java.util.function.Consumer<String> setter) {
        if (!body.containsKey(key)) return;
        String v = body.get(key);
        if (v != null && v.length() > max) throw new IllegalArgumentException(error);
        setter.accept(v);
    }

    private Empresa empresa(Long empresaId) {
        return empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
    }

    Map<String, Object> toSafeMap(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("nombreEmpresa", e.getNombreEmpresa());
        m.put("nombreComercial", e.getNombreComercial());
        m.put("slug", e.getSlug());
        m.put("correoEmpresa", e.getCorreoEmpresa());
        m.put("telefonoEmpresa", e.getTelefonoEmpresa());
        m.put("descripcion", e.getDescripcion());
        m.put("logoUrl", e.getLogoUrl());
        m.put("colorPrimario", e.getColorPrimario());
        m.put("colorSecundario", e.getColorSecundario());
        m.put("colorAcento", e.getColorAcento());
        m.put("numeroWhatsapp", e.getNumeroWhatsapp());
        m.put("categoriaNegocio", e.getCategoriaNegocio());
        m.put("instagram", e.getInstagram());
        m.put("zonaEnvio", e.getZonaEnvio());
        m.put("tagline", e.getTagline());
        m.put("footerTexto", e.getFooterTexto());
        m.put("visibilidadPublica", Boolean.TRUE.equals(e.getVisibilidadPublica()));
        m.put("estadoEmpresa", e.getEstadoEmpresa());
        m.put("cedulaJuridica", e.getCedulaJuridica());
        m.put("tipoCedula", e.getTipoCedula());
        m.put("actividadEconomica", e.getActividadEconomica());
        m.put("nombreComercialFe", e.getNombreComercialFe());
        m.put("usuarioHacienda", e.getUsuarioHacienda());
        m.put("ambienteHacienda", e.getAmbienteHacienda());
        m.put("tieneCertP12", e.getCertP12Path() != null && !e.getCertP12Path().isBlank());
        m.put("tieneClaveHacienda", e.getClaveHaciendaEnc() != null && !e.getClaveHaciendaEnc().isBlank());
        m.put("configuracionFiscalCompleta", e.isConfiguracionFiscalCompleta());
        m.put("inscritoHacienda", Boolean.TRUE.equals(e.getInscritoHacienda()));
        m.put("nombreHacienda", e.getNombreHacienda());
        m.put("regimenTributario", e.getRegimenTributario());
        return m;
    }
}
