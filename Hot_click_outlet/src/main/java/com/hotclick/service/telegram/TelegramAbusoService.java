package com.hotclick.service.telegram;

import com.hotclick.model.IpBloqueada;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.IpBloqueadaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.security.SecurityAlertNotifier;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class TelegramAbusoService {

    private static final Logger log = LoggerFactory.getLogger(TelegramAbusoService.class);

    static final int PAUSA_MINUTOS = 30;
    static final int BLOQUEO_DIAS = 365;
    private static final int SECRETOS_ANTES_DE_BLOQUEAR_IP = 5;
    private static final int VENTANA_SECRETOS_SEG = 600;

    @Autowired private RateLimiter rateLimiter;
    @Autowired private TelegramClienteBotService bot;
    @Autowired private TelegramService telegramService;
    @Autowired private SecurityAlertNotifier alertNotifier;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private IpBloqueadaRepository ipBloqueadaRepository;
    @Autowired private AuditoriaAdminRegistroService auditoria;

    /** Resultado de {@link #desbloquear(Long)}. */
    public enum Desbloqueo { NO_ENCONTRADA, SIN_BLOQUEO, DESBLOQUEADA }

    public boolean rechazarSiPausadoOBloqueado(TelegramVinculacion v) {
        if (cuentaBloqueada(v.getUsuario())) {
            avisarUnaVez(v.getChatId(), "bloqueo-aviso",
                "Tu cuenta está bloqueada por actividad sospechosa. Un administrador de HotClick tiene que habilitarla.");
            return true;
        }
        if (v.getPausadoHasta() != null && LocalDateTime.now(Constants.ZONA_CR).isBefore(v.getPausadoHasta())) {
            avisarUnaVez(v.getChatId(), "pausa-aviso",
                "Este chat está en pausa hasta " + v.getPausadoHasta() + " por actividad sospechosa.");
            return true;
        }
        return false;
    }

    public boolean rechazarSiInyeccion(long chatId, String texto) {
        if (!TelegramTextoSospechoso.es(texto)) return false;
        registrarExceso(chatId, "Texto con patrón de inyección en el bot de clientes");
        bot.enviarMensaje(chatId, "Ese mensaje no se procesó. Si fue un error, escribí /menu.");
        return true;
    }

    /**
     * TG3 (A8-C2): una ráfaga (&gt;3 msg/s) solo pausa el chat {@value #PAUSA_MINUTOS} min; nunca escala
     * al bloqueo de {@value #BLOQUEO_DIAS} días (que además ya solo afecta a Telegram).
     */
    public void registrarRafaga(long chatId) {
        if (!rateLimiter.tryAcquire("tg:" + chatId + ":abuso-aviso", 1, 30)) return;
        pausar(chatId);
        alertNotifier.generateAlert("TELEGRAM_ABUSO", SecurityEventSeverity.MEDIUM, null, usuarioId(chatId),
            "Ráfaga de mensajes en el bot de clientes", "chat=" + chatEnmascarado(chatId));
    }

    /**
     * Alerta interna de un fallo del bot. Auditor 8 M-C: solo el TIPO de la excepción; el mensaje
     * puede traer datos del negocio (SQL, nombres, ids), tokens o URLs, y el chat de alertas no es
     * un lugar para eso. El detalle completo queda en el stacktrace del log del servidor.
     */
    public void avisarErrorDeUsuario(long chatId, Throwable error) {
        if (!rateLimiter.tryAcquire("tg:err:" + chatId, 1, 300)) return;
        String tipo = error == null ? "desconocido" : error.getClass().getSimpleName();
        telegramService.enviar("Error en el bot de clientes. Chat " + chatEnmascarado(chatId) + ". Tipo: " + tipo);
    }

    public void secretoInvalido(String ip) {
        String clave = "tg:secret:" + (ip != null ? ip : "sin-ip");
        if (rateLimiter.tryAcquire(clave, SECRETOS_ANTES_DE_BLOQUEAR_IP, VENTANA_SECRETOS_SEG)) return;
        bloquearIp(ip);
        alertNotifier.generateAlert("TELEGRAM_WEBHOOK", SecurityEventSeverity.HIGH, ip, null,
            "Webhook de Telegram con secreto inválido repetido", "ip=" + ip);
    }

    private void registrarExceso(long chatId, String motivo) {
        if (!rateLimiter.tryAcquire("tg:" + chatId + ":abuso-aviso", 1, 30)) return;
        boolean primera = rateLimiter.tryAcquire("tg:" + chatId + ":abuso", 1, 86_400);
        if (primera) pausar(chatId);
        else bloquearCuenta(chatId);
        alertNotifier.generateAlert("TELEGRAM_ABUSO", SecurityEventSeverity.HIGH, null, usuarioId(chatId),
            motivo, "chat=" + chatEnmascarado(chatId));
    }

    private void pausar(long chatId) {
        vinculacionRepository.findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA).ifPresent(v -> {
            v.setPausadoHasta(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(PAUSA_MINUTOS));
            vinculacionRepository.save(v);
        });
        bot.enviarMensaje(chatId, "Pausé este chat 30 minutos por actividad sospechosa.");
    }

    /** Seguridad INFO: el chat_id no va completo a avisos ni logs; solo los últimos 4 dígitos. */
    static String chatEnmascarado(long chatId) {
        String s = Long.toString(Math.abs(chatId));
        return "***" + (s.length() > 4 ? s.substring(s.length() - 4) : s);
    }

    /**
     * TG3: el bloqueo por abuso repetido corta SOLO Telegram: la vinculación queda en pausa
     * {@value #BLOQUEO_DIAS} días. No toca Usuario.estado ni bloqueadoHasta (login web intacto).
     */
    private void bloquearCuenta(long chatId) {
        TelegramVinculacion v = vinculacionRepository
            .findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA).orElse(null);
        if (v != null) {
            v.setPausadoHasta(LocalDateTime.now(Constants.ZONA_CR).plusDays(BLOQUEO_DIAS));
            vinculacionRepository.save(v);
        }
        bot.enviarMensaje(chatId,
            "Bloqueé el acceso por Telegram por actividad sospechosa repetida. Un administrador tiene que habilitarlo.");
    }

    /**
     * Auditor 8 M-A: salida administrativa del bloqueo por abuso ({@link #bloquearCuenta}, pausa de hasta
     * {@value #BLOQUEO_DIAS} días). Solo limpia {@code pausadoHasta} de la vinculación del usuario; no
     * reactiva una vinculación revocada ni toca la cuenta web. La autorización (admin de plataforma) la
     * exige el controlador. Cada desbloqueo real queda en hot_click_auditoria_admin_tb.
     */
    @Transactional
    public Desbloqueo desbloquear(Long usuarioId) {
        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(usuarioId).orElse(null);
        if (v == null) return Desbloqueo.NO_ENCONTRADA;
        LocalDateTime hasta = v.getPausadoHasta();
        if (hasta == null || !LocalDateTime.now(Constants.ZONA_CR).isBefore(hasta)) return Desbloqueo.SIN_BLOQUEO;
        v.setPausadoHasta(null);
        vinculacionRepository.save(v);
        Long empresaId = v.getUsuario() != null ? v.getUsuario().getEmpresaId() : null;
        auditoria.registrar("TELEGRAM_DESBLOQUEO", "TELEGRAM_VINCULACION", v.getId(), empresaId,
            "Desbloqueo del bot de Telegram del usuario " + usuarioId + " (pausa vigente hasta " + hasta + ")");
        log.info("[telegram] admin desbloqueó la vinculación del usuario {}", usuarioId);
        return Desbloqueo.DESBLOQUEADA;
    }

    private void bloquearIp(String ip) {
        if (ip == null || ip.isBlank()) return;
        IpBloqueada bloqueo = ipBloqueadaRepository.findByIpAddressAndActivaTrue(ip).orElseGet(IpBloqueada::new);
        bloqueo.setIpAddress(ip.trim());
        bloqueo.setMotivo("Secreto de webhook de Telegram inválido, repetido");
        bloqueo.setBloqueadaPor("telegram-webhook");
        bloqueo.setFechaBloqueo(LocalDateTime.now(Constants.ZONA_CR));
        bloqueo.setExpiresAt(LocalDateTime.now(Constants.ZONA_CR).plusHours(1));
        bloqueo.setActiva(true);
        ipBloqueadaRepository.save(bloqueo);
    }

    private void avisarUnaVez(long chatId, String tipo, String texto) {
        if (!rateLimiter.tryAcquire("tg:" + chatId + ":" + tipo, 1, 60)) return;
        bot.enviarMensaje(chatId, texto);
    }

    private boolean cuentaBloqueada(Usuario usuario) {
        return usuario != null && usuario.getBloqueadoHasta() != null
            && LocalDateTime.now(Constants.ZONA_CR).isBefore(usuario.getBloqueadoHasta());
    }

    private Long usuarioId(long chatId) {
        return vinculacionRepository.findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA)
            .map(v -> v.getUsuario() != null ? v.getUsuario().getId() : null)
            .orElse(null);
    }
}
