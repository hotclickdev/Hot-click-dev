package com.hotclick.service.telegram;

import com.hotclick.model.IpBloqueada;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.IpBloqueadaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.security.SecurityAlertNotifier;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class TelegramAbusoService {

    static final int PAUSA_MINUTOS = 30;
    static final int BLOQUEO_DIAS = 365;
    private static final int SECRETOS_ANTES_DE_BLOQUEAR_IP = 5;
    private static final int VENTANA_SECRETOS_SEG = 600;

    @Autowired private RateLimiter rateLimiter;
    @Autowired private TelegramClienteBotService bot;
    @Autowired private TelegramService telegramService;
    @Autowired private SecurityAlertNotifier alertNotifier;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private IpBloqueadaRepository ipBloqueadaRepository;

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

    public void registrarRafaga(long chatId) {
        registrarExceso(chatId, "Ráfaga de mensajes en el bot de clientes");
    }

    public void avisarErrorDeUsuario(long chatId, String resumen) {
        if (!rateLimiter.tryAcquire("tg:err:" + chatId, 1, 300)) return;
        String corto = resumen == null ? "" : resumen;
        if (corto.length() > 300) corto = corto.substring(0, 300);
        telegramService.enviar("Error en el bot de clientes. Chat " + chatId + ". " + corto);
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
            motivo, "chat=" + chatId);
    }

    private void pausar(long chatId) {
        vinculacionRepository.findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA).ifPresent(v -> {
            v.setPausadoHasta(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(PAUSA_MINUTOS));
            vinculacionRepository.save(v);
        });
        bot.enviarMensaje(chatId, "Pausé este chat 30 minutos por actividad sospechosa.");
    }

    private void bloquearCuenta(long chatId) {
        vinculacionRepository.findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA).ifPresent(v -> {
            Usuario usuario = v.getUsuario();
            if (usuario == null || usuario.getId() == null) return;
            usuario.setBloqueadoHasta(LocalDateTime.now(Constants.ZONA_CR).plusDays(BLOQUEO_DIAS));
            usuario.setEstado(Constants.ESTADO_SUSPENDIDO);
            usuarioRepository.save(usuario);
        });
        bot.enviarMensaje(chatId,
            "Bloqueé la cuenta por actividad sospechosa repetida. Un administrador tiene que habilitarla.");
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
