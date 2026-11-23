package com.hotclick.service.alta;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.email.NotificacionNegocioEmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Avisos del alta por fases. Admin (Andrés): correo a {@code adminit.email} + Telegram del canal ops existente
 * ({@link TelegramService}). Dueño: correo + Telegram si lo tiene vinculado (el aviso en el panel sale solo del estado).
 * Sin PII: solo id y nombre comercial del negocio y enlaces al panel; jamás cédula, teléfono, correo ni cuenta bancaria.
 * Fail-safe: nunca lanza; el claim idempotente ya se hizo en base de datos antes de llegar acá.
 */
@Service
public class AltaFasesAvisoService {

    private static final Logger log = LoggerFactory.getLogger(AltaFasesAvisoService.class);

    private final TelegramService telegramOps;
    private final TelegramNotificacionClienteService telegramDueno;
    private final NotificacionNegocioEmailSender email;
    private final UsuarioRepository usuarioRepository;
    private final String adminEmail;
    private final String appUrl;

    public AltaFasesAvisoService(TelegramService telegramOps, TelegramNotificacionClienteService telegramDueno,
                                 NotificacionNegocioEmailSender email, UsuarioRepository usuarioRepository,
                                 @Value("${adminit.email:}") String adminEmail,
                                 @Value("${app.url:http://localhost:3000}") String appUrl) {
        this.telegramOps = telegramOps;
        this.telegramDueno = telegramDueno;
        this.email = email;
        this.usuarioRepository = usuarioRepository;
        this.adminEmail = adminEmail;
        this.appUrl = appUrl == null ? "" : appUrl.replaceAll("/+$", "");
    }

    String linkAdmin() { return appUrl + "/plataforma/moderacion"; }
    String linkPanelDueno() { return appUrl + "/admin"; }

    /** UNA vez por negocio: la cuenta ONVO quedó ACTIVA y espera la revisión de HotClick. */
    public void avisarRevisionListaAdmin(Long empresaId, String nombre) {
        String n = limpio(nombre);
        String texto = "Negocio listo para revisión: " + n + " (id " + empresaId + "). Su cuenta ONVO ya está activa.";
        enviarAdmin("Negocio listo para revisión — " + n, "Negocio listo para revisión", texto,
            "🏪 *Negocio listo para revisión*\n\n" + n + " (id " + empresaId + ")\nCuenta ONVO activa.\n" + linkAdmin());
    }

    /** Pérdida de la cuenta: el primero (numero = 1) y los recordatorios. */
    public void avisarPerdida(Long empresaId, String nombre, int numero, Optional<String> urlOnvo) {
        String n = limpio(nombre);
        String etiqueta = numero <= 1 ? "Cobros en línea pausados" : "Recordatorio " + (numero - 1) + ": cobros en línea pausados";
        String textoAdmin = etiqueta + " — " + n + " (id " + empresaId + "): la cuenta ONVO dejó de estar activa.";
        enviarAdmin(etiqueta + " — " + n, etiqueta, textoAdmin,
            "⚠️ *" + etiqueta + "*\n\n" + n + " (id " + empresaId + ")\nLa cuenta ONVO dejó de estar activa.\n" + linkAdmin());
        String cuerpoDueno = "Los pagos en línea de " + n + " están pausados porque su cuenta de ONVO dejó de estar activa. "
            + "Su tienda no se muestra al público mientras tanto. Ingrese a ONVO para revisar sus datos y el depósito a su cuenta.";
        String enlace = urlOnvo.orElse(linkPanelDueno());
        avisarDueno(empresaId, etiqueta, cuerpoDueno, enlace, "Ir a ONVO",
            "⚠️ *" + etiqueta + "*\n\n" + cuerpoDueno + "\n" + enlace);
    }

    /** UNA vez por recuperación: la cuenta volvió a estar activa. */
    public void avisarReanudado(Long empresaId, String nombre) {
        String n = limpio(nombre);
        String textoAdmin = "Cobros en línea reanudados — " + n + " (id " + empresaId + ").";
        enviarAdmin(textoAdmin, "Cobros en línea reanudados", textoAdmin,
            "✅ *Cobros en línea reanudados*\n\n" + n + " (id " + empresaId + ")\n" + linkAdmin());
        String cuerpo = "Su cuenta de ONVO volvió a estar activa. Los pagos en línea de " + n + " se reanudaron.";
        avisarDueno(empresaId, "Cobros en línea reanudados", cuerpo, linkPanelDueno(), "Ir a mi panel",
            "✅ *Cobros en línea reanudados*\n\n" + cuerpo);
    }

    private void enviarAdmin(String asunto, String titulo, String texto, String telegram) {
        try {
            if (adminEmail != null && !adminEmail.isBlank()) {
                email.enviarAvisoSimple(adminEmail, asunto, titulo, texto, linkAdmin(), "Abrir revisión");
            } else {
                log.warn("[alta-fases] adminit.email vacío: aviso al admin solo por Telegram");
            }
        } catch (RuntimeException e) {
            log.error("[alta-fases] fallo correo admin: {}", e.getClass().getSimpleName());
        }
        try {
            telegramOps.enviar(telegram);
        } catch (RuntimeException e) {
            log.error("[alta-fases] fallo Telegram admin: {}", e.getClass().getSimpleName());
        }
    }

    private void avisarDueno(Long empresaId, String asunto, String cuerpo, String url, String cta, String telegram) {
        try {
            correoDueno(empresaId).ifPresent(correo -> email.enviarAvisoSimple(correo, asunto + " — HotClick", asunto, cuerpo, url, cta));
        } catch (RuntimeException e) {
            log.error("[alta-fases] fallo correo dueño empresa={}: {}", empresaId, e.getClass().getSimpleName());
        }
        telegramDueno.notificarTexto(empresaId, telegram);
    }

    private Optional<String> correoDueno(Long empresaId) {
        return usuarioRepository.findByEmpresaIdConRoles(empresaId).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .map(Usuario::getCorreo).findFirst();
    }

    /** Sin saltos ni marcado Markdown en el nombre comercial. */
    static String limpio(String nombre) {
        if (nombre == null || nombre.isBlank()) return "Negocio";
        String n = nombre.replaceAll("[*_`\\[\\]\\r\\n]", " ").trim();
        return n.length() > 80 ? n.substring(0, 80) : n;
    }
}
