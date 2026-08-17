package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.service.telegram.TelegramDatosQueryService;
import com.hotclick.service.telegram.TelegramMenuBuilder;
import com.hotclick.service.telegram.TelegramUpdateRouter;
import com.hotclick.service.telegram.TelegramVinculacionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lógica del bot de Telegram para clientes (Emprendedor / PyME / Negocio Plus).
 *
 * Ruteo de cada update entrante:
 *   /start CODIGO       → vincula el chat con el usuario del panel
 *   botones (callbacks) → inventario, ventas de hoy, finanzas del mes, cambio de negocio
 *   texto libre         → AI Copilot (consume créditos de IA del plan)
 *   número + contexto   → ajuste de existencias del chequeo semanal
 *
 * Medidas de seguridad:
 *   - Solo chats privados; grupos y canales se ignoran.
 *   - Solo texto y botones — fotos, archivos, audios y stickers se rechazan.
 *   - Rate limit por chat: ráfaga por minuto + tope diario (RateLimiter en BD).
 *   - Toda consulta de datos va parametrizada y filtrada por la empresa activa,
 *     validando SIEMPRE que el usuario siga siendo miembro activo de esa empresa.
 *   - Ajustar stock exige rol PROPIETARIO o ADMIN en la empresa.
 */
@Service
public class TelegramBotUpdateService {

    private static final Logger log = LoggerFactory.getLogger(TelegramBotUpdateService.class);

    @Autowired private TelegramUpdateRouter        router;
    @Autowired private AiCopilotService            aiCopilotService;
    @Autowired private TelegramClienteBotService   bot;
    @Autowired private TelegramVinculacionService  vinculacionService;
    @Autowired private TelegramMenuBuilder         menuBuilder;
    @Autowired private TelegramDatosQueryService   datosQueryService;
    @Autowired private TelegramFlujoService        telegramFlujoService;

    // ── Entrada única desde el webhook ────────────────────────────────────────

    @Transactional
    public void procesarUpdate(JsonNode update) {
        router.procesarUpdate(update);
    }

    /**
     * Responde un texto libre fuera del hilo del webhook. Si el proveedor de IA
     * está caído (chatSyncConAcciones → null), degrada a los datos estructurados
     * según la intención detectada — la conversación nunca queda sin respuesta.
     * Si el modelo propuso una mutación (solo posible cuando puedeGestionar=true),
     * la registra como borrador pendiente con botones Confirmar/Cancelar — nunca
     * la ejecuta acá.
     */
    @org.springframework.scheduling.annotation.Async
    public void responderConIa(Long chatId, Long empresaId, String texto, String nombreUsuario, boolean puedeGestionar) {
        try {
            AiCopilotService.ChatConAccionesResultado resultado =
                aiCopilotService.chatSyncConAcciones(empresaId, texto, nombreUsuario, puedeGestionar);
            if (resultado != null) {
                boolean hayAccionPendiente = resultado.accionPropuesta() != null;
                bot.enviarMensaje(chatId, resultado.texto(), hayAccionPendiente ? null : menuBuilder.tecladoRespuestaIa(), false);
                if (hayAccionPendiente) {
                    vinculacionService.vinculacionActiva(chatId).ifPresent(v -> telegramFlujoService.proponerAccion(v, resultado.accionPropuesta()));
                }
                return;
            }

            String lower = texto.toLowerCase();
            String datos = null;
            if (contieneAlguna(lower, "vend", "venta", "ingres", "cobr", "pedido")) {
                datos = datosQueryService.mensajeVentasHoy(empresaId);
            } else if (contieneAlguna(lower, "stock", "inventari", "producto", "agotad")) {
                datos = datosQueryService.mensajeInventario(empresaId);
            } else if (contieneAlguna(lower, "finanz", "gananc", "utilidad", "ticket")) {
                datos = datosQueryService.mensajeFinanzasMes(empresaId);
            }

            if (datos != null) {
                bot.enviarMensaje(chatId, "La IA no está disponible en este momento — esto es lo que te puedo mostrar:\n\n" + datos, menuBuilder.tecladoRespuestaIa());
            } else {
                bot.enviarMensaje(chatId, "El asistente de IA no está disponible en este momento. Mientras tanto podés consultar tus datos con los botones:");
                vinculacionService.vinculacionActiva(chatId).ifPresent(menuBuilder::mostrarMenu);
            }
        } catch (Exception e) {
            log.error("[telegram-bot] fallo respondiendo texto libre en chat {} — {}", chatId, e.getMessage());
            bot.enviarMensaje(chatId, "No pude procesar tu mensaje. Intentá de nuevo en unos minutos o escribí /menu.");
        }
    }

    private boolean contieneAlguna(String texto, String... claves) {
        for (String clave : claves) {
            if (texto.contains(clave)) return true;
        }
        return false;
    }
}
