package com.hotclick.agente.lead;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.TotpSecretEncryptionService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Leads del bot (AG-27). {@code empresaId == null} es un lead de HotClick. El alcance siempre lo fija el llamador
 * (contexto del canal o {@code CompanyScope}), nunca un dato del modelo. El contacto se guarda como hash (deduplicar),
 * últimos 4 (mostrar) y cifrado AES-GCM (solo el detalle lo descifra, para poder responder al lead).
 */
@Service
public class LeadService {

    private static final Logger log = LoggerFactory.getLogger(LeadService.class);

    static final int TEXTO_MAX = 120;
    static final int INTERES_MAX = 500;
    static final int PAGINA_MAX = 100;
    /** Misma persona insistiendo en el mismo alcance dentro de esta ventana no genera otro lead: se actualiza. */
    static final int VENTANA_DUPLICADO_HORAS = 24;

    public record Registro(long id, boolean nuevo) {}

    private final LeadRepository repo;
    private final TotpSecretEncryptionService cifrado;

    public LeadService(LeadRepository repo, TotpSecretEncryptionService cifrado) {
        this.repo = repo;
        this.cifrado = cifrado;
    }

    public Registro registrar(TipoLead tipo, Long empresaId, String contacto, String canal, UUID sesionId,
                              String nombre, String tipoNegocio, String interes) {
        if (contacto == null || contacto.isBlank()) {
            throw new IllegalArgumentException("Sin contacto no se puede registrar el lead");
        }
        String normal = contacto.strip();
        String hash = hash(canal, normal);
        String n = limpiar(nombre, TEXTO_MAX);
        String t = limpiar(tipoNegocio, TEXTO_MAX);
        String i = limpiar(interes, INTERES_MAX);

        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusHours(VENTANA_DUPLICADO_HORAS);
        Optional<Long> previo = repo.buscarReciente(tipo, empresaId, hash, desde);
        if (previo.isPresent()) {
            repo.actualizarInteres(previo.get(), n, t, i);
            return new Registro(previo.get(), false);
        }
        long id = repo.insertar(tipo, empresaId, canal == null ? null : canal.toUpperCase(Locale.ROOT), hash,
            ultimos4(normal), cifrado.encryptContactoLead(normal), n, t, i, sesionId);
        log.info("[agente-lead] lead {} registrado tipo={} empresa={}", id, tipo, empresaId);
        return new Registro(id, true);
    }

    /** Tienda aprobada y pública por slug (regla del catálogo); vacío si no existe o está oculta. */
    public Optional<Long> empresaPublicaPorSlug(String slug) {
        if (slug == null || slug.isBlank() || slug.length() > 150) return Optional.empty();
        return repo.empresaPublicaPorSlug(slug.strip());
    }

    /** Listado del alcance (null = HotClick). Contacto enmascarado. */
    public List<LeadDto> listar(Long alcanceEmpresaId, TipoLead tipo, EstadoLead estado, int pagina, int tamano) {
        int size = Math.max(1, Math.min(PAGINA_MAX, tamano));
        int offset = Math.max(0, pagina) * size;
        return repo.listar(alcanceEmpresaId, tipo, estado, size, offset).stream()
            .map(f -> LeadDto.de(f, null)).toList();
    }

    /** Detalle con el contacto descifrado; un lead de otro alcance es "no encontrado" (sin revelar que existe). */
    public LeadDto detalle(long id, Long alcanceEmpresaId) {
        LeadRepository.Fila f = repo.obtener(id, alcanceEmpresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Lead no encontrado"));
        String claro = null;
        try {
            claro = f.contactoCifrado() == null ? null : cifrado.decryptContactoLead(f.contactoCifrado());
        } catch (RuntimeException e) {
            log.warn("[agente-lead] no se pudo descifrar el contacto del lead {} ({})", id, e.getClass().getSimpleName());
        }
        return LeadDto.de(f, claro);
    }

    static String ultimos4(String contacto) {
        String digitos = contacto.replaceAll("\\D", "");
        String base = digitos.length() >= 4 ? digitos : contacto;
        return base.length() <= 4 ? base : base.substring(base.length() - 4);
    }

    static String hash(String canal, String contacto) {
        try {
            String semilla = (canal == null ? "" : canal.toUpperCase(Locale.ROOT)) + ":" + contacto;
            byte[] d = MessageDigest.getInstance("SHA-256").digest(semilla.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String limpiar(String texto, int max) {
        if (texto == null) return null;
        String t = texto.replaceAll("\\p{Cntrl}", " ").strip();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }
}
