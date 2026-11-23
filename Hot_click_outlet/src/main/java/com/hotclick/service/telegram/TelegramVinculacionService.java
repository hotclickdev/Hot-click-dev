package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;

@Service
public class TelegramVinculacionService {

    public static final String MENSAJE_NO_VINCULADO =
        "Este chat no está vinculado a ninguna cuenta de HotClick.\n\n"
        + "Para conectarlo: entrá al panel → Configuración → Telegram → \"Conectar Telegram\" "
        + "y tocá el botón que te aparece.";

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramVinculacionPostLinkHelper postLink;
    @Autowired private TelegramVinculacionCanje      canjeAtomico;
    @Autowired(required = false) private PlatformTransactionManager transactionManager;

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(TelegramVinculacionService.class);

    public Optional<TelegramVinculacion> vinculacionActiva(long chatId) {
        Optional<TelegramVinculacion> v = vinculacionRepository
            .findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA);
        if (v.isPresent() && !Integer.valueOf(Constants.ESTADO_ACTIVO).equals(v.get().getUsuario().getEstado())) {
            return Optional.empty();
        }
        return v;
    }

    public void vincular(long chatId, String username, String codigoCrudo) {
        String codigo = codigoCrudo.replaceAll("[^A-Za-z0-9]", "").toUpperCase(java.util.Locale.ROOT); // TG3: códigos se generan en mayúsculas
        if (codigo.isEmpty() || codigo.length() > 16) {
            bot.enviarMensaje(chatId, "Ese código no es válido. Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        // Canje atómico y committeado ANTES de hablar con Telegram (nada de I/O dentro de la transacción).
        Optional<TelegramVinculacionCanje.Canjeado> canje;
        try {
            canje = canjeAtomico.canjear(chatId, username, codigo);
        } catch (RuntimeException ex) {
            canje = Optional.empty(); // p. ej. carrera de bloqueo: se trata como código inválido, nunca como vinculado
        }
        if (canje.isEmpty()) {
            bot.enviarMensaje(chatId, "El código no existe o ya venció (dura 10 minutos). Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        TelegramVinculacionCanje.Canjeado ganado = canje.get();
        // Los avisos salen tras el COMMIT (si hay transacción exterior, p. ej. el webhook): sin la fila bloqueada
        // y sin avisar "vinculado" si esa transacción termina en rollback.
        despuesDelCommit(() -> {
            TelegramVinculacion v = ganado.vinculacion();
            avisarChatReemplazado(ganado.chatAnterior(), chatId);
            ganado.chatsRevocados().forEach(viejo -> avisarChatReemplazado(viejo, chatId));
            List<MiembroEmpresa> membresias = postLink.membresiasActivas(v);
            postLink.enviarBienvenidaYMenu(chatId, v, membresias);
        });
    }

    /** Ejecuta {@code accion} fuera de cualquier transacción: tras el commit si hay una activa; si no, ahora. */
    private void despuesDelCommit(Runnable accion) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            accion.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try {
                    if (transactionManager == null) {
                        accion.run();
                    } else {
                        TransactionTemplate fuera = new TransactionTemplate(transactionManager);
                        fuera.setPropagationBehavior(TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
                        fuera.executeWithoutResult(st -> accion.run());
                    }
                } catch (RuntimeException ex) {
                    LOG.warn("Telegram: fallo al enviar los avisos de vinculación ({})", ex.getClass().getSimpleName());
                }
            }
        });
    }

    private void avisarChatReemplazado(Long chatAnterior, long chatNuevo) {
        if (chatAnterior == null || chatAnterior == chatNuevo) return;
        bot.enviarMensaje(chatAnterior,
            "Esta cuenta de HotClick se vinculó a otro Telegram. Este chat ya no tiene acceso.");
    }

    public void desvincular(TelegramVinculacion v) {
        Long chatId = v.getChatId();
        v.revocar();
        vinculacionRepository.revocarPorId(v.getId());
        bot.enviarMensaje(chatId, "Listo, tu Telegram quedó desvinculado. Podés volver a conectarlo cuando querás desde Configuración → Telegram en el panel.");
    }
}
