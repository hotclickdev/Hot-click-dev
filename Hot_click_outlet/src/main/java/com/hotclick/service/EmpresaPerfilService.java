package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SancionPlataformaRepository;
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
    @Autowired private SancionPlataformaRepository sancionRepo;
    @Autowired private AuditoriaAdminRegistroService auditoria;
    @Autowired private FirmaDigitalService firmaDigitalService;

    /** Flag M4: permite cambiar el régimen de IVA de una empresa. APAGADO por defecto (sin OK, no se enciende). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.iva.cambio-regimen.enabled:false}")
    private boolean cambioRegimenIvaHabilitado;

    public Map<String, Object> obtener(Long empresaId) {
        Map<String, Object> mapa = toSafeMap(empresa(empresaId));
        sancionRepo.findFirstByEmpresaIdAndActivaTrueOrderByCreadaDesc(empresaId).ifPresent(fila -> {
            mapa.put("sancionNivel", fila.getNivelAplicado());
            mapa.put("sancionMotivo", fila.getMotivo());
            mapa.put("sancionFin", fila.getFin());
        });
        return mapa;
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
        byte[] nuevo = file.getBytes();
        empresaRepository.findById(empresaId).ifPresent(e -> {
            e.setCertP12Path(path);
            // Un PIN guardado solo sirve si abre el archivo nuevo; si no, se limpia y la UI lo pide otra vez.
            if (e.getPinCertEnc() != null && !e.getPinCertEnc().isBlank() && !pinGuardadoAbre(e, path, nuevo)) {
                e.setPinCertEnc(null);
                log.info("[empresa/cert-p12] PIN anterior no corresponde al .p12 nuevo; se limpió empresa={}", empresaId);
            }
            empresaRepository.save(e);
        });
        firmaDigitalService.invalidarCache(empresaId);
        log.info("[empresa/cert-p12] Cert subido empresa={}", empresaId);
    }

    private boolean pinGuardadoAbre(Empresa e, String path, byte[] p12) {
        try {
            FirmaDigitalService.cargar(path, p12, encryptionService.decryptPin(e.getPinCertEnc()).toCharArray());
            return true;
        } catch (RuntimeException ex) {
            return false; // sin mensaje: puede repetir el PIN
        }
    }

    static final String MSG_PIN_FORMATO =
        "El PIN debe tener 4 dígitos (llaves anteriores) o 14 caracteres (llaves nuevas).";
    static final String MSG_PIN_4_DIGITOS = "El PIN de 4 caracteres debe tener solo dígitos (0-9).";
    static final String MSG_SIN_P12 = "Subí primero el certificado de firma (.p12).";

    /** Guarda cifrado el PIN del .p12. La prueba decisiva es que abra el archivo de la empresa. Nunca se loguea ni se devuelve. */
    public Map<String, Object> guardarPinCert(Long empresaId, String pin) {
        validarFormatoPin(pin);
        Empresa e = empresa(empresaId);
        if (e.getCertP12Path() == null || e.getCertP12Path().isBlank()) {
            throw new IllegalArgumentException(MSG_SIN_P12);
        }
        byte[] p12 = supabaseStorageService.leerPrivado(e.getCertP12Path());
        if (p12 == null || p12.length == 0) {
            throw new com.hotclick.service.hacienda.HaciendaConfiguracionException(
                "No pudimos leer el certificado de firma. Volvé a subir el .p12.");
        }
        // cargar() borra el char[] y no repite el PIN en su mensaje.
        FirmaDigitalService.cargar(e.getCertP12Path(), p12, pin.toCharArray());
        String cifrado = encryptionService.encryptPin(pin);
        // Fail-closed: sin clave, encrypt devuelve el texto plano. Nunca se persiste eso.
        if (cifrado == null || !cifrado.startsWith("ENC:")) {
            throw new com.hotclick.service.hacienda.HaciendaConfiguracionException(
                "No pudimos guardar el PIN de forma segura. Contacte a soporte.");
        }
        e.setPinCertEnc(cifrado);
        empresaRepository.save(e);
        firmaDigitalService.invalidarCache(empresaId);
        log.info("[empresa/pin-cert] PIN del certificado guardado empresa={}", empresaId);
        return toSafeMap(e);
    }

    static void validarFormatoPin(String pin) {
        if (pin == null || pin.isBlank()) throw new IllegalArgumentException("Ingresá el PIN del certificado.");
        if (pin.length() != 4 && pin.length() != 14) throw new IllegalArgumentException(MSG_PIN_FORMATO);
        if (pin.length() == 4 && !pin.chars().allMatch(c -> c >= '0' && c <= '9')) {
            throw new IllegalArgumentException(MSG_PIN_4_DIGITOS);
        }
    }

    static final String MSG_WHATSAPP = "El WhatsApp solo puede tener números (8 dígitos, ej. 8888-1234).";

    /** Pyme: WhatsApp aceptaba texto («QA-TEST abc»). Vacío → null; 8 dígitos CR o 506+8 (solo dígitos); o internacional +E.164. */
    static String normalizarWhatsapp(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String t = valor.trim();
        if (!t.matches("[\\d\\s+()\\-]+")) throw new IllegalArgumentException(MSG_WHATSAPP);
        String d = t.replaceAll("\\D", "");
        // Se guarda como venía (8 dígitos o 506 + 8), solo con dígitos: el formato existente no cambia.
        if (d.length() == 8 || (d.length() == 11 && d.startsWith("506"))) return d;
        if (t.startsWith("+") && d.length() >= 10 && d.length() <= 15) return "+" + d;
        throw new IllegalArgumentException(MSG_WHATSAPP);
    }

    public Map<String, Object> update(Long empresaId, Map<String, String> body) {
        Empresa e = empresa(empresaId);
        String nombreAntes = e.getNombreComercial();
        if (body.containsKey("nombreComercial")) e.setNombreComercial(body.get("nombreComercial"));
        if (body.containsKey("descripcion")) e.setDescripcion(body.get("descripcion"));
        if (body.containsKey("telefonoEmpresa")) e.setTelefonoEmpresa(body.get("telefonoEmpresa"));
        if (body.containsKey("correoEmpresa")) {
            String correo = body.get("correoEmpresa");
            // ESC-6: correo de otro negocio → 400 claro (antes el índice único daba 500).
            if (correo != null && !correo.equalsIgnoreCase(e.getCorreoEmpresa())
                    && empresaRepository.existsByCorreoEmpresa(correo)) {
                throw new IllegalArgumentException("Ese correo ya lo usa otro negocio.");
            }
            e.setCorreoEmpresa(correo);
        }
        if (body.containsKey("numeroWhatsapp")) e.setNumeroWhatsapp(normalizarWhatsapp(body.get("numeroWhatsapp")));
        if (body.containsKey("categoriaNegocio")) e.setCategoriaNegocio(body.get("categoriaNegocio"));
        if (body.containsKey("instagram")) e.setInstagram(body.get("instagram"));
        if (body.containsKey("zonaEnvio")) e.setZonaEnvio(body.get("zonaEnvio"));
        if (body.containsKey("colorPrimario")) e.setColorPrimario(body.get("colorPrimario"));
        if (body.containsKey("colorSecundario")) e.setColorSecundario(body.get("colorSecundario"));
        if (body.containsKey("colorAcento")) e.setColorAcento(body.get("colorAcento"));
        if (body.containsKey("logoUrl")) e.setLogoUrl(body.get("logoUrl"));
        if (body.containsKey("ogImagenUrl")) e.setOgImagenUrl(portada(body.get("ogImagenUrl")));
        if (body.containsKey("tagline")) e.setTagline(body.get("tagline"));
        if (body.containsKey("footerTexto")) e.setFooterTexto(body.get("footerTexto"));
        empresaRepository.save(e);
        if (body.containsKey("nombreComercial") && !java.util.Objects.equals(nombreAntes, e.getNombreComercial())) {
            auditoria.registrar("NOMBRE_TIENDA", "EMPRESA", empresaId, empresaId,
                nombreAntes + " → " + e.getNombreComercial());
        }
        return toSafeMap(e);
    }

    @CacheEvict(value = {"marcas-publicas", "categorias", "categorias-publicas"}, allEntries = true)
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> toggleVisibilidad(Long empresaId, Object val) {
        Empresa e = empresaRepository.findByIdForUpdate(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        // Impago: 409 sin tocar la visibilidad; solo el pago ONVO confirmado reactiva.
        if (com.hotclick.service.suscripcion.SuspensionImpago.estaSuspendida(e.getEstadoEmpresa())) throw new com.hotclick.exception.ReactivacionSinPagoException();
        asegurarCuentaActivaParaCatalogo(e);
        if (val == null) throw new IllegalArgumentException("Campo visibilidadPublica requerido");
        boolean visible = Boolean.parseBoolean(val.toString());
        if (visible && sancionRepo.existsByEmpresaIdAndActivaTrue(empresaId)) {
            throw new IllegalArgumentException("Hay una sanción vigente. El catálogo sigue oculto.");
        }
        e.setVisibilidadPublica(visible);
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
        return guardarImagen(empresaId, file, true);
    }

    /** Portada de la vitrina. No reemplaza el logo. */
    public String subirPortada(Long empresaId, MultipartFile file) throws java.io.IOException {
        return guardarImagen(empresaId, file, false);
    }

    private String guardarImagen(Long empresaId, MultipartFile file, boolean logo) throws java.io.IOException {
        var mod = imageModerationService.moderar(file);
        if (!mod.safe()) {
            throw new IllegalArgumentException("Imagen rechazada: " + mod.reason());
        }
        String url = supabaseStorageService.subirImagen(file, "Empredimientos");
        empresaRepository.findById(empresaId).ifPresent(emp -> {
            if (logo) emp.setLogoUrl(url);
            else emp.setOgImagenUrl(url);
            empresaRepository.save(emp);
        });
        log.info("[empresa/imagen] {} subida para empresa {}: {}", logo ? "Logo" : "Portada", empresaId, url);
        return url;
    }

    private static String portada(String url) {
        if (url != null && url.length() > 500) {
            throw new IllegalArgumentException("La portada no puede superar 500 caracteres.");
        }
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
        if (body.containsKey("regimenIva")) {
            String r = body.get("regimenIva");
            // L1 (#406): Set.of(...).contains(null) lanza NPE → 500. Nulo o desconocido es un 400 con texto fijo.
            if (r == null || !com.hotclick.service.hacienda.CalculadoraIva.REGIMENES.contains(r)) {
                throw new IllegalArgumentException("Régimen de IVA inválido: elegí SIMPLIFICADO o TRADICIONAL.");
            }
            // Cambiar de régimen altera lo que se cobra y lo que se declara a Hacienda: apagado por defecto
            // hasta tener el OK explícito. Reenviar el valor actual (p. ej. SIMPLIFICADO) siempre se acepta.
            if (!r.equals(e.getRegimenIva()) && !cambioRegimenIvaHabilitado) {
                throw new IllegalArgumentException(
                    "El cambio de régimen de IVA todavía no está habilitado. Seguís en " + e.getRegimenIva() + ".");
            }
            e.setRegimenIva(r);
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
        m.put("ogImagenUrl", e.getOgImagenUrl());
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
        m.put("tienePinCert", e.getPinCertEnc() != null && !e.getPinCertEnc().isBlank());
        m.put("configuracionFiscalCompleta", e.isConfiguracionFiscalCompleta());
        m.put("inscritoHacienda", Boolean.TRUE.equals(e.getInscritoHacienda()));
        m.put("nombreHacienda", e.getNombreHacienda());
        m.put("regimenTributario", e.getRegimenTributario());
        m.put("regimenIva", e.getRegimenIva());
        return m;
    }
}
