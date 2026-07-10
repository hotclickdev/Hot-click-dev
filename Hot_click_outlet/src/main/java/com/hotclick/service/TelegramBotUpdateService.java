package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    private static final int RATE_POR_MINUTO = 20;
    private static final int RATE_POR_DIA    = 300;
    private static final int MAX_TEXTO       = 1_000;

    private static final String CTX_AJUSTE = "AJUSTE:";

    private static final String[] CAMPOS_NO_TEXTO = {
        "photo", "document", "video", "audio", "voice", "sticker", "video_note", "animation"
    };

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private RateLimiter                   rateLimiter;
    @Autowired private AiCopilotService              aiCopilotService;
    @Autowired private StockService                  stockService;
    @Autowired private TelegramFlujoService          telegramFlujoService;
    @Autowired private JdbcTemplate                  jdbc;

    /** Self-proxy: @Async no aplica en llamadas internas (this.responderConIa saltearía el proxy). */
    @Autowired @org.springframework.context.annotation.Lazy
    private TelegramBotUpdateService self;

    // ── Entrada única desde el webhook ────────────────────────────────────────

    @Transactional
    public void procesarUpdate(JsonNode update) {
        if (update == null) return;
        if (update.hasNonNull("callback_query")) {
            procesarCallback(update.get("callback_query"));
        } else if (update.hasNonNull("message")) {
            procesarMensaje(update.get("message"));
        }
        // Cualquier otro tipo de update se ignora (allowed_updates ya lo restringe)
    }

    // ── Mensajes de texto ─────────────────────────────────────────────────────

    private void procesarMensaje(JsonNode msg) {
        long chatId = msg.path("chat").path("id").asLong(0);
        if (chatId == 0 || !"private".equals(msg.path("chat").path("type").asText(""))) return;
        if (!permitidoPorRateLimit(chatId)) return;

        if (msg.has("photo") || esDocumentoImagen(msg)) {
            if (manejarFotoEntrante(chatId, msg)) return;
            bot.enviarMensaje(chatId, "Por seguridad solo acepto mensajes de texto y botones. No puedo procesar archivos, fotos ni audios.");
            return;
        }

        for (String campo : CAMPOS_NO_TEXTO) {
            if (msg.has(campo)) {
                bot.enviarMensaje(chatId, "Por seguridad solo acepto mensajes de texto y botones. No puedo procesar archivos, fotos ni audios.");
                return;
            }
        }

        String texto = msg.path("text").asText("").trim();
        if (texto.isEmpty()) return;
        if (texto.length() > MAX_TEXTO) texto = texto.substring(0, MAX_TEXTO);

        if (texto.startsWith("/start")) {
            String codigo = texto.length() > 6 ? texto.substring(6).trim() : "";
            if (!codigo.isEmpty()) {
                vincular(chatId, msg.path("from").path("username").asText(null), codigo);
            } else {
                Optional<TelegramVinculacion> v = vinculacionActiva(chatId);
                if (v.isPresent()) mostrarMenu(v.get());
                else bot.enviarMensaje(chatId, MENSAJE_NO_VINCULADO);
            }
            return;
        }

        Optional<TelegramVinculacion> opt = vinculacionActiva(chatId);
        if (opt.isEmpty()) {
            bot.enviarMensaje(chatId, MENSAJE_NO_VINCULADO);
            return;
        }
        TelegramVinculacion v = opt.get();

        switch (texto) {
            case "/menu", "/ayuda", "/help" -> { mostrarMenu(v); return; }
            case "/empresa"                 -> { mostrarSelectorEmpresa(v); return; }
            case "/cancelar"                -> {
                v.setContexto(null);
                vinculacionRepository.save(v);
                bot.enviarMensaje(chatId, "Listo, cancelado. Escribí /menu cuando me necesités.");
                return;
            }
            case "/desvincular"             -> { desvincular(v); return; }
            default -> { }
        }

        // Contexto de ajuste pendiente: se espera un número
        if (v.getContexto() != null && v.getContexto().startsWith(CTX_AJUSTE)) {
            procesarAjusteCantidad(v, texto);
            return;
        }

        // Borrador JSON de un flujo guiado (venta rápida / alta de producto) esperando texto
        if (v.getContexto() != null && v.getContexto().startsWith("{")) {
            Long empresaIdFlujo = empresaValidada(v);
            if (empresaIdFlujo != null) telegramFlujoService.manejarTexto(v, empresaIdFlujo, texto);
            return;
        }

        // Texto libre → AI Copilot, en hilo aparte: la IA puede tardar hasta 25s y
        // este método corre en el hilo del webhook — si se bloquea, Telegram corta
        // por timeout y reintenta el update, congelando todo el bot ("Read timeout
        // expired"). Se responde 200 ya y la respuesta llega cuando esté.
        Long empresaId = empresaValidada(v);
        if (empresaId == null) return;
        bot.enviarAccionEscribiendo(chatId);
        String nombreUsuario = v.getUsuario() != null ? v.getUsuario().getNombre() : null;
        self.responderConIa(chatId, empresaId, texto, nombreUsuario);
    }

    /**
     * Responde un texto libre fuera del hilo del webhook. Si el proveedor de IA
     * está caído (chatSync → null), degrada a los datos estructurados según la
     * intención detectada — la conversación nunca queda sin respuesta.
     */
    @org.springframework.scheduling.annotation.Async
    public void responderConIa(Long chatId, Long empresaId, String texto, String nombreUsuario) {
        try {
            String respuesta = aiCopilotService.chatSync(empresaId, texto, nombreUsuario);
            if (respuesta != null) {
                bot.enviarMensaje(chatId, respuesta, null, false);
                return;
            }

            String lower = texto.toLowerCase();
            String datos = null;
            if (contieneAlguna(lower, "vend", "venta", "ingres", "cobr", "pedido")) {
                datos = mensajeVentasHoy(empresaId);
            } else if (contieneAlguna(lower, "stock", "inventari", "producto", "agotad")) {
                datos = mensajeInventario(empresaId);
            } else if (contieneAlguna(lower, "finanz", "gananc", "utilidad", "ticket")) {
                datos = mensajeFinanzasMes(empresaId);
            }

            if (datos != null) {
                bot.enviarMensaje(chatId, "La IA no está disponible en este momento — esto es lo que te puedo mostrar:\n\n" + datos);
            } else {
                bot.enviarMensaje(chatId, "El asistente de IA no está disponible en este momento. Mientras tanto podés consultar tus datos con los botones:");
                vinculacionActiva(chatId).ifPresent(this::mostrarMenu);
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

    // ── Callbacks (botones) ───────────────────────────────────────────────────

    private void procesarCallback(JsonNode cb) {
        long chatId = cb.path("message").path("chat").path("id").asLong(0);
        String data = cb.path("data").asText("");
        bot.responderCallback(cb.path("id").asText(null));
        if (chatId == 0 || data.isEmpty()) return;
        if (!permitidoPorRateLimit(chatId)) return;

        Optional<TelegramVinculacion> opt = vinculacionActiva(chatId);
        if (opt.isEmpty()) {
            bot.enviarMensaje(chatId, MENSAJE_NO_VINCULADO);
            return;
        }
        TelegramVinculacion v = opt.get();

        if (data.startsWith("emp:")) { seleccionarEmpresa(v, data.substring(4)); return; }
        if (data.startsWith("chk:")) { iniciarAjuste(v, data.substring(4)); return; }

        // Flujos guiados (venta rápida, alta de producto, clientes) — TelegramFlujoService
        if (data.startsWith("vta:") || data.startsWith("prd:") || data.startsWith("cli:") || "flx:x".equals(data)) {
            Long empresaIdFlujo = empresaValidada(v);
            if (empresaIdFlujo != null) telegramFlujoService.manejarCallback(v, empresaIdFlujo, data);
            return;
        }

        switch (data) {
            case "menu"     -> mostrarMenu(v);
            case "selector" -> mostrarSelectorEmpresa(v);
            case "inv"      -> responderConDatos(v, this::mensajeInventario);
            case "ventas"   -> responderConDatos(v, this::mensajeVentasHoy);
            case "fin"      -> responderConDatos(v, this::mensajeFinanzasMes);
            case "chkok"    -> {
                v.setContexto(null);
                vinculacionRepository.save(v);
                bot.enviarMensaje(v.getChatId(), "Perfecto, inventario confirmado. ¡Gracias!");
            }
            default -> log.warn("[telegram-bot] callback desconocido '{}' de chat {}", data, chatId);
        }
    }

    // ── Vinculación ───────────────────────────────────────────────────────────

    private void vincular(long chatId, String username, String codigoCrudo) {
        String codigo = codigoCrudo.replaceAll("[^A-Za-z0-9]", "");
        if (codigo.isEmpty() || codigo.length() > 16) {
            bot.enviarMensaje(chatId, "Ese código no es válido. Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        Optional<TelegramVinculacion> opt = vinculacionRepository.findByCodigo(codigo);
        if (opt.isEmpty() || opt.get().getCodigoExpira() == null
                || opt.get().getCodigoExpira().isBefore(LocalDateTime.now(Constants.ZONA_CR))) {
            bot.enviarMensaje(chatId, "El código no existe o ya venció (dura 10 minutos). Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        TelegramVinculacion v = opt.get();

        // Un mismo chat de Telegram solo puede estar vinculado a UNA cuenta del panel
        vinculacionRepository
            .findByChatIdAndEstadoAndUsuarioIdNot(chatId, TelegramVinculacion.ACTIVA, v.getUsuario().getId())
            .forEach(otra -> {
                otra.setEstado(TelegramVinculacion.REVOCADA);
                otra.setChatId(null);
                otra.setContexto(null);
                vinculacionRepository.save(otra);
            });

        v.setChatId(chatId);
        v.setTelegramUsername(username);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setFechaVinculacion(LocalDateTime.now(Constants.ZONA_CR));
        v.setCodigo(null);        // un solo uso
        v.setCodigoExpira(null);
        v.setContexto(null);

        List<MiembroEmpresa> membresias = miembroEmpresaRepository
            .findByUsuarioIdAndEstado(v.getUsuario().getId(), 1);

        if (membresias.isEmpty() && v.getUsuario().getEmpresaId() != null) {
            v.setEmpresaActivaId(v.getUsuario().getEmpresaId());
        } else if (membresias.size() == 1) {
            v.setEmpresaActivaId(membresias.get(0).getEmpresa().getId());
        }
        vinculacionRepository.save(v);

        String nombre = v.getUsuario().getNombre() != null ? v.getUsuario().getNombre() : "";
        bot.enviarMensaje(chatId, ("¡Hola " + esc(nombre) + "! Tu cuenta quedó vinculada con HotClick.\n\n"
                + "Desde acá podés consultar tu inventario, ventas y finanzas, y vas a recibir "
                + "avisos de cada venta y alertas de stock.").trim());

        if (membresias.size() > 1) {
            mostrarSelectorEmpresa(v);
        } else if (v.getEmpresaActivaId() != null) {
            mostrarMenu(v);
        } else {
            bot.enviarMensaje(chatId, "Tu cuenta no tiene un negocio asociado todavía. Cuando lo tengás, escribí /menu.");
        }
    }

    private void desvincular(TelegramVinculacion v) {
        Long chatId = v.getChatId();
        v.setEstado(TelegramVinculacion.REVOCADA);
        v.setChatId(null);
        v.setContexto(null);
        vinculacionRepository.save(v);
        bot.enviarMensaje(chatId, "Listo, tu Telegram quedó desvinculado. Podés volver a conectarlo cuando querás desde Configuración → Telegram en el panel.");
    }

    // ── Selección de empresa (multi-negocio) ──────────────────────────────────

    private void mostrarSelectorEmpresa(TelegramVinculacion v) {
        List<MiembroEmpresa> membresias = miembroEmpresaRepository
            .findByUsuarioIdAndEstado(v.getUsuario().getId(), 1);
        if (membresias.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "No tenés negocios asociados a tu cuenta.");
            return;
        }
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        for (MiembroEmpresa m : membresias) {
            String nombre = m.getEmpresa().getNombreComercial() != null
                ? m.getEmpresa().getNombreComercial() : m.getEmpresa().getNombreEmpresa();
            teclado.add(List.of(TelegramClienteBotService.boton(nombre, "emp:" + m.getEmpresa().getId())));
        }
        bot.enviarMensaje(v.getChatId(), "¿Qué negocio querés ver?", teclado);
    }

    private void seleccionarEmpresa(TelegramVinculacion v, String idCrudo) {
        long empresaId;
        try {
            empresaId = Long.parseLong(idCrudo);
        } catch (NumberFormatException e) {
            return;
        }
        // Seguridad: solo empresas donde el usuario es miembro ACTIVO
        if (!miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(v.getUsuario().getId(), empresaId, 1)) {
            log.warn("[telegram-bot] usuario {} intentó activar empresa {} sin membresía", v.getUsuario().getId(), empresaId);
            bot.enviarMensaje(v.getChatId(), "No tenés acceso a ese negocio.");
            return;
        }
        v.setEmpresaActivaId(empresaId);
        v.setContexto(null);
        vinculacionRepository.save(v);
        mostrarMenu(v);
    }

    // ── Menú principal ────────────────────────────────────────────────────────

    private void mostrarMenu(TelegramVinculacion v) {
        Long empresaId = empresaValidada(v);
        if (empresaId == null) return;

        String nombre = nombreEmpresa(empresaId);
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        teclado.add(List.of(
            TelegramClienteBotService.boton("📦 Inventario", "inv"),
            TelegramClienteBotService.boton("💰 Ventas de hoy", "ventas")));
        teclado.add(List.of(TelegramClienteBotService.boton("📊 Finanzas del mes", "fin")));
        teclado.add(List.of(
            TelegramClienteBotService.boton("🛒 Nueva venta", "vta:new"),
            TelegramClienteBotService.boton("➕ Nuevo producto", "prd:new")));
        teclado.add(List.of(TelegramClienteBotService.boton("👥 Clientes", "cli:pg:0")));
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(v.getUsuario().getId()) > 1) {
            teclado.add(List.of(TelegramClienteBotService.boton("🔄 Cambiar negocio", "selector")));
        }
        bot.enviarMensaje(v.getChatId(),
            "*" + esc(nombre) + "*\n¿Qué querés ver? También podés escribirme una pregunta libre "
            + "(ej: _¿cuál producto se vende más?_) y te respondo con los datos reales del negocio.",
            teclado);
    }

    // ── Consultas de datos (parametrizadas, siempre por empresa validada) ────

    private void responderConDatos(TelegramVinculacion v, java.util.function.Function<Long, String> generador) {
        Long empresaId = empresaValidada(v);
        if (empresaId == null) return;
        try {
            bot.enviarMensaje(v.getChatId(), generador.apply(empresaId));
        } catch (Exception e) {
            log.error("[telegram-bot] error consultando datos empresa {} — {}", empresaId, e.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude consultar los datos en este momento. Intentá de nuevo en unos minutos.");
        }
    }

    private String mensajeInventario(Long empresaId) {
        Integer total = jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_producto_tb WHERE fk_id_empresa = ? AND fk_id_estado = 1",
            Integer.class, empresaId);
        Integer agotados = jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_producto_tb WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND stock_actual <= 0",
            Integer.class, empresaId);
        List<Map<String, Object>> bajos = jdbc.queryForList("""
            SELECT nombre_producto, stock_actual
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
              AND stock_actual > 0 AND stock_actual <= COALESCE(stock_minimo, 3)
            ORDER BY stock_actual ASC LIMIT 8
            """, empresaId);

        StringBuilder sb = new StringBuilder("📦 *Inventario*\n\n");
        sb.append("Productos activos: *").append(total).append("*\n");
        sb.append("Agotados: *").append(agotados).append("*\n");
        if (bajos.isEmpty()) {
            sb.append("\nNingún producto con stock bajo. Todo en orden ✅");
        } else {
            sb.append("\n⚠️ *Stock bajo:*\n");
            for (Map<String, Object> p : bajos) {
                sb.append("• ").append(esc(String.valueOf(p.get("nombre_producto"))))
                  .append(" — quedan *").append(p.get("stock_actual")).append("*\n");
            }
        }
        return sb.toString();
    }

    private String mensajeVentasHoy(Long empresaId) {
        LocalDateTime inicioDia = LocalDate.now(Constants.ZONA_CR).atStartOfDay();
        Map<String, Object> conf = jdbc.queryForMap("""
            SELECT COUNT(*) AS pedidos, COALESCE(SUM(total_pedido),0) AS ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido IN ('PAGADO','ENTREGADO')
            """, empresaId, inicioDia);
        Integer pendientes = jdbc.queryForObject("""
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido = 'PENDIENTE'
            """, Integer.class, empresaId, inicioDia);

        return "💰 *Ventas de hoy*\n\n"
            + "Ventas confirmadas: *" + conf.get("pedidos") + "*\n"
            + "Ingresos: *" + colones(conf.get("ingresos")) + "*\n"
            + "Pedidos pendientes: *" + pendientes + "*";
    }

    private String mensajeFinanzasMes(Long empresaId) {
        LocalDateTime inicioMes = LocalDate.now(Constants.ZONA_CR).withDayOfMonth(1).atStartOfDay();
        Map<String, Object> mes = jdbc.queryForMap("""
            SELECT COUNT(*) AS pedidos,
                   COALESCE(SUM(total_pedido),0)              AS ingresos,
                   COALESCE(SUM(COALESCE(utilidad_bruta,0)),0) AS utilidad
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido IN ('PAGADO','ENTREGADO')
            """, empresaId, inicioMes);
        Integer entregados = jdbc.queryForObject("""
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido = 'ENTREGADO'
            """, Integer.class, empresaId, inicioMes);

        long pedidos  = ((Number) mes.get("pedidos")).longValue();
        long ingresos = ((Number) mes.get("ingresos")).longValue();
        String ticket = pedidos > 0 ? colones(ingresos / pedidos) : "—";

        return "📊 *Finanzas del mes*\n\n"
            + "Ventas: *" + pedidos + "* (" + entregados + " entregadas)\n"
            + "Ingresos: *" + colones(ingresos) + "*\n"
            + "Utilidad bruta: *" + colones(mes.get("utilidad")) + "*\n"
            + "Ticket promedio: *" + ticket + "*";
    }

    // ── Chequeo semanal: ajuste de existencias ────────────────────────────────

    private void iniciarAjuste(TelegramVinculacion v, String idCrudo) {
        Long empresaId = empresaValidada(v);
        if (empresaId == null) return;
        long productoId;
        try {
            productoId = Long.parseLong(idCrudo);
        } catch (NumberFormatException e) {
            return;
        }
        if (!puedeAjustarStock(v, empresaId)) {
            bot.enviarMensaje(v.getChatId(), "Solo el propietario o un administrador del negocio puede ajustar el inventario.");
            return;
        }
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto, stock_actual FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            productoId, empresaId);
        if (filas.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "Ese producto no pertenece a tu negocio activo.");
            return;
        }
        v.setContexto(CTX_AJUSTE + productoId);
        vinculacionRepository.save(v);
        bot.enviarMensaje(v.getChatId(), "¿Cuántas unidades de *" + esc(String.valueOf(filas.get(0).get("nombre_producto")))
            + "* tenés realmente? (el sistema dice " + filas.get(0).get("stock_actual")
            + ")\n\nEscribí solo el número, o /cancelar para salir.");
    }

    private void procesarAjusteCantidad(TelegramVinculacion v, String texto) {
        int cantidad;
        try {
            cantidad = Integer.parseInt(texto.trim());
        } catch (NumberFormatException e) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un número (ej: 4). Escribilo de nuevo o /cancelar para salir.");
            return;
        }
        if (cantidad < 0 || cantidad > 1_000_000) {
            bot.enviarMensaje(v.getChatId(), "La cantidad debe estar entre 0 y 1 000 000.");
            return;
        }

        long productoId = Long.parseLong(v.getContexto().substring(CTX_AJUSTE.length()));
        Long empresaId = empresaValidada(v);
        if (empresaId == null) return;

        // Defensa en profundidad: revalidar tenencia y permiso aunque ya se validó al iniciar
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            productoId, empresaId);
        if (filas.isEmpty() || !puedeAjustarStock(v, empresaId)) {
            v.setContexto(null);
            vinculacionRepository.save(v);
            bot.enviarMensaje(v.getChatId(), "No se pudo aplicar el ajuste.");
            return;
        }

        try {
            stockService.ajustarAExistencia(productoId, cantidad, "telegram-chequeo", v.getUsuario().getCorreo());
            v.setContexto(null);
            vinculacionRepository.save(v);
            bot.enviarMensaje(v.getChatId(), "Listo ✅ *" + esc(String.valueOf(filas.get(0).get("nombre_producto")))
                + "* ahora tiene *" + cantidad + "* unidades registradas.");
        } catch (Exception e) {
            log.error("[telegram-bot] fallo ajuste producto {} — {}", productoId, e.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude aplicar el ajuste. Intentá de nuevo en unos minutos.");
        }
    }

    private boolean puedeAjustarStock(TelegramVinculacion v, Long empresaId) {
        return miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(v.getUsuario().getId(), empresaId, 1)
            .map(m -> "PROPIETARIO".equals(m.getRolEnEmpresa()) || "ADMIN".equals(m.getRolEnEmpresa()))
            .orElse(false);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Optional<TelegramVinculacion> vinculacionActiva(long chatId) {
        Optional<TelegramVinculacion> v = vinculacionRepository
            .findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA);
        // Usuario desactivado en el panel → su Telegram tampoco tiene acceso
        if (v.isPresent() && !Integer.valueOf(Constants.ESTADO_ACTIVO).equals(v.get().getUsuario().getEstado())) {
            return Optional.empty();
        }
        return v;
    }

    /**
     * Empresa activa del chat, revalidando la membresía en cada consulta.
     * Si el propietario desactivó al miembro, el acceso muere aquí.
     */
    private Long empresaValidada(TelegramVinculacion v) {
        Long empresaId = v.getEmpresaActivaId();
        Long usuarioId = v.getUsuario().getId();
        if (empresaId != null) {
            boolean esMiembro = miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)
                || empresaId.equals(v.getUsuario().getEmpresaId());
            if (esMiembro) return empresaId;
            v.setEmpresaActivaId(null);
            v.setContexto(null);
            vinculacionRepository.save(v);
        }
        List<MiembroEmpresa> membresias = miembroEmpresaRepository.findByUsuarioIdAndEstado(usuarioId, 1);
        if (membresias.size() == 1) {
            v.setEmpresaActivaId(membresias.get(0).getEmpresa().getId());
            vinculacionRepository.save(v);
            return v.getEmpresaActivaId();
        }
        if (membresias.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "No tenés un negocio activo asociado a tu cuenta.");
        } else {
            mostrarSelectorEmpresa(v);
        }
        return null;
    }

    /** true si el mensaje es un documento cuyo mime_type es una imagen (envío sin comprimir desde Telegram Desktop). */
    private boolean esDocumentoImagen(JsonNode msg) {
        if (!msg.has("document")) return false;
        return msg.path("document").path("mime_type").asText("").startsWith("image/");
    }

    /** true si la foto se consumió como paso del alta de producto (TelegramFlujoService); false si no aplica. */
    private boolean manejarFotoEntrante(long chatId, JsonNode msg) {
        Optional<TelegramVinculacion> opt = vinculacionActiva(chatId);
        if (opt.isEmpty()) return false;
        TelegramVinculacion v = opt.get();
        Long empresaId = empresaValidada(v);
        if (empresaId == null) return false;
        return telegramFlujoService.manejarFoto(v, empresaId, msg);
    }

    private boolean permitidoPorRateLimit(long chatId) {
        if (!rateLimiter.tryAcquire("tg:" + chatId + ":dia", RATE_POR_DIA, 86_400)) {
            if (rateLimiter.tryAcquire("tg:" + chatId + ":aviso", 1, 3_600)) {
                bot.enviarMensaje(chatId, "Alcanzaste el límite diario de consultas por Telegram. Volvé a intentarlo mañana o usá el panel web.");
            }
            return false;
        }
        if (!rateLimiter.tryAcquire("tg:" + chatId + ":min", RATE_POR_MINUTO, 60)) {
            if (rateLimiter.tryAcquire("tg:" + chatId + ":aviso", 1, 3_600)) {
                bot.enviarMensaje(chatId, "Demasiados mensajes seguidos. Esperá un minuto e intentá de nuevo.");
            }
            return false;
        }
        return true;
    }

    private String nombreEmpresa(Long empresaId) {
        try {
            return jdbc.queryForObject(
                "SELECT COALESCE(nombre_comercial, nombre_empresa) FROM hot_click_empresa_tb WHERE id_empresa = ?",
                String.class, empresaId);
        } catch (Exception e) {
            return "Tu negocio";
        }
    }

    private String colones(Object monto) {
        long valor = monto instanceof Number n ? n.longValue() : 0;
        return String.format("₡%,d", valor);
    }

    /** Quita caracteres que rompen el Markdown de Telegram en valores dinámicos. */
    private String esc(String s) {
        return s == null ? "" : s.replaceAll("[*_`\\[\\]]", "");
    }

    private static final String MENSAJE_NO_VINCULADO =
        "Este chat no está vinculado a ninguna cuenta de HotClick.\n\n"
        + "Para conectarlo: entrá al panel → Configuración → Telegram → \"Conectar Telegram\" "
        + "y tocá el botón que te aparece.";
}
