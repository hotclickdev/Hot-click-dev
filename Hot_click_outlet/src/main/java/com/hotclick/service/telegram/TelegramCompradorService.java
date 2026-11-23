package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.catalogo.CatalogoPublicoGate;
import com.hotclick.model.Empresa;
import com.hotclick.model.PedidoEntrega;
import com.hotclick.model.Producto;
import com.hotclick.model.TelegramCompradorSesion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TelegramCompradorSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.envio.DestinoEnvio;
import com.hotclick.service.payment.GuestCheckoutGuard;
import com.hotclick.service.payment.OrderPricingService;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import com.hotclick.utils.FormatoColones;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Modo COMPRADOR del bot de Telegram de la tienda: chats NO vinculados a una cuenta del panel que llegan por
 * {@code t.me/{bot}?start=t_{slug}}. Máquina de estados por chat (tabla de sesión), sin inventario, finanzas,
 * venta rápida, alta de producto ni CRM. Toda consulta va filtrada por la empresa de la sesión.
 * El pago es SIEMPRE un enlace de ONVO (sandbox); el bot nunca pide tarjeta.
 */
@Service
@Transactional(propagation = Propagation.NOT_SUPPORTED) // el webhook corre en una tx; acá cada paso confirma por separado
public class TelegramCompradorService {

    private static final Logger log = LoggerFactory.getLogger(TelegramCompradorService.class);

    // Pasos de la sesión
    public static final String CATALOGO = "CATALOGO";
    public static final String ENTREGA = "ENTREGA";
    public static final String NOMBRE = "NOMBRE";
    public static final String TELEFONO = "TELEFONO";
    public static final String CORREO = "CORREO";
    public static final String PROVINCIA = "PROVINCIA";
    public static final String CANTON = "CANTON";
    public static final String UBICACION = "UBICACION";
    public static final String CONFIRMA_UBI = "CONFIRMA_UBI";
    public static final String RESUMEN = "RESUMEN";
    public static final String ESPERANDO_PAGO = "ESPERANDO_PAGO";
    public static final String PAGADO = "PAGADO";

    public static final String CB_CATALOGO = "c:p:0";
    static final String PREFIJO_CALLBACK = "c:";
    static final int PAGINA = 6;
    static final int MAX_LINEAS = 20;

    private static final Pattern START_TIENDA = Pattern.compile("(?i)^t_([a-z0-9][a-z0-9-]{0,98})$");
    private static final Pattern NOMBRE_VALIDO = Pattern.compile("^[\\p{L}][\\p{L}\\p{M} .'’-]{1,79}$");
    private static final Pattern CORREO_VALIDO = Pattern.compile("^[^@\\s]{1,64}@[^@\\s]{1,120}\\.[^@\\s]{2,}$");
    static final String MSG_TIENDA_NO_ENCONTRADA = "No encontré esa tienda o todavía no está disponible para pedidos por Telegram.";
    static final String MSG_SIN_SESION = "Para hacer un pedido entrá desde el enlace o el código QR de la tienda.";

    @Autowired private TelegramCompradorSesionRepository sesionRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private TelegramClienteBotService bot;
    @Autowired private TelegramCompradorPedidoService pedidoService;
    @Autowired private GuestCheckoutGuard guestCheckoutGuard;
    @Autowired private OrderPricingService pricing;
    @Autowired private OnvoService onvoService;

    @Value("${hotclick.pagos.onvo.vencimiento-minutos:30}")
    private int vencimientoMinutos;

    // ── Entradas ──────────────────────────────────────────────────────────────

    /** ¿El payload de /start es el de una tienda ({@code t_{slug}})? Distinto del código de 8 caracteres del panel. */
    public static boolean esStartTienda(String payload) {
        return payload != null && START_TIENDA.matcher(payload.trim()).matches();
    }

    static String slugDe(String payload) {
        var m = START_TIENDA.matcher(payload == null ? "" : payload.trim());
        return m.matches() ? m.group(1).toLowerCase(Locale.ROOT) : null;
    }

    public boolean tieneSesionActiva(long chatId) {
        return sesionRepository.findByChatId(chatId).isPresent();
    }

    /** /start t_{slug}: abre el catálogo de ESA tienda si es pública y está activa; si no, un mensaje genérico. */
    public void iniciarDesdeStart(long chatId, String payload) {
        String slug = slugDe(payload);
        Empresa empresa = slug == null ? null : empresaRepository.findBySlug(slug).filter(TelegramCompradorService::tiendaPublica).orElse(null);
        if (empresa == null) {
            bot.enviarMensaje(chatId, MSG_TIENDA_NO_ENCONTRADA);
            return;
        }
        if (!pedidoService.pagosPermitidos()) {
            bot.enviarMensaje(chatId, TelegramCompradorPedidoService.MSG_NO_DISPONIBLE);
            return;
        }
        Optional<TelegramCompradorSesion> previa = sesionRepository.findByChatId(chatId);
        // Un pedido sin pagar por chat: no se encadenan reservas de stock abriendo otra tienda.
        if (previa.isPresent() && ESPERANDO_PAGO.equals(previa.get().getPaso()) && previa.get().getPedidoId() != null) {
            bot.enviarMensaje(chatId, "Ya tenés un pedido esperando pago. Pagalo o cancelalo con el botón del mensaje anterior, o escribí /cancelar.");
            return;
        }
        TelegramCompradorSesion s = previa.orElseGet(TelegramCompradorSesion::new);
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        if (s.getFechaCreacion() == null) s.setFechaCreacion(ahora);
        s.setChatId(chatId);
        s.setEmpresaId(empresa.getId());
        s.setPaso(CATALOGO);
        s.setPedidoId(null);
        s.setContexto(null);
        s.setUltimaActividad(ahora);
        sesionRepository.save(s);
        bot.enviarMensaje(chatId, TelegramCompradorUi.bienvenida(EmpresaNombre.mostrar(empresa, "la tienda"), true));
        mostrarCatalogo(s, new TelegramCompradorCtx(), 0);
    }

    static boolean tiendaPublica(Empresa e) {
        return e != null && "ACTIVO".equals(e.getEstadoEmpresa()) && Boolean.TRUE.equals(e.getVisibilidadPublica())
            && !e.isTiendaPausada() && !e.isCobrosPausados() && CatalogoPublicoGate.membresiaConfirmada(e.getEstadoPlan());
    }

    public void procesarTexto(long chatId, String texto) {
        TelegramCompradorSesion s = sesionRepository.findByChatId(chatId).orElse(null);
        if (s == null) {
            bot.enviarMensaje(chatId, MSG_SIN_SESION);
            return;
        }
        String t = texto == null ? "" : texto.trim();
        String bajo = t.toLowerCase(Locale.ROOT);
        if (bajo.equals("/cancelar") || bajo.equals("cancelar")) { cancelar(s); return; }
        if (bajo.equals("/ayuda") || bajo.equals("/menu") || bajo.equals("/help") || bajo.equals("ayuda") || bajo.equals("menu")) {
            bot.enviarMensaje(chatId, TelegramCompradorUi.ayuda());
            repetirPaso(s);
            return;
        }
        TelegramCompradorCtx c = TelegramCompradorCtx.desde(s.getContexto());
        switch (s.getPaso()) {
            case NOMBRE -> recibirNombre(s, c, t);
            case TELEFONO -> recibirTelefono(s, c, t);
            case CORREO -> recibirCorreo(s, c, t);
            case CANTON -> recibirCanton(s, c, t);
            case UBICACION -> recibirUbicacionTexto(s, c, t);
            default -> {
                bot.enviarMensaje(s.getChatId(), "Usá los botones para seguir con tu pedido, o escribí /cancelar.");
                repetirPaso(s);
            }
        }
    }

    /** message.location de Telegram: SOLO se acepta en el paso de entrega (UBICACION). */
    public void procesarUbicacion(long chatId, JsonNode location) {
        TelegramCompradorSesion s = sesionRepository.findByChatId(chatId).orElse(null);
        if (s == null || !UBICACION.equals(s.getPaso())) {
            if (s != null) bot.enviarMensaje(chatId, "Ahora no necesito tu ubicación. Seguí con los botones de tu pedido.");
            return;
        }
        double lat = location == null ? Double.NaN : location.path("latitude").asDouble(Double.NaN);
        double lng = location == null ? Double.NaN : location.path("longitude").asDouble(Double.NaN);
        if (!EnlaceUbicacionValidator.coordenadaValida(lat, lng)) {
            bot.enviarMensaje(chatId, "No pude leer esa ubicación. Probá de nuevo o escribí tus señas.");
            return;
        }
        TelegramCompradorCtx c = TelegramCompradorCtx.desde(s.getContexto());
        c.olvidarUbicacion();
        c.fuente = PedidoEntrega.TELEGRAM;
        c.lat = lat;
        c.lng = lng;
        c.url = EnlaceUbicacionValidator.urlDeCoordenadas(lat, lng);
        irA(s, c, CONFIRMA_UBI);
        bot.enviarMensaje(chatId, TelegramCompradorUi.confirmarUbicacion(c), TelegramCompradorUi.tecladoConfirmarUbicacion());
    }

    public void procesarCallback(long chatId, String data) {
        TelegramCompradorSesion s = sesionRepository.findByChatId(chatId).orElse(null);
        if (s == null) {
            bot.enviarMensaje(chatId, MSG_SIN_SESION);
            return;
        }
        String[] p = data.split(":");
        if (p.length < 2 || !"c".equals(p[0])) return;
        TelegramCompradorCtx c = TelegramCompradorCtx.desde(s.getContexto());
        switch (p[1]) {
            case "p" -> { if (enCompra(s)) mostrarCatalogo(s, c, entero(p, 2, 0)); }
            case "a" -> { if (enCompra(s)) elegirCantidad(s, p.length > 2 ? Long.valueOf(numero(p[2])) : null); }
            case "q" -> { if (enCompra(s)) agregar(s, c, p.length > 2 ? numero(p[2]) : -1, entero(p, 3, 0)); }
            case "r" -> { if (enCompra(s)) quitar(s, c, p.length > 2 ? numero(p[2]) : -1); }
            case "car" -> { if (enCompra(s)) mostrarCarrito(s, c); }
            case "go" -> { if (enCompra(s)) continuar(s, c); }
            case "e" -> { if (ENTREGA.equals(s.getPaso())) elegirEntrega(s, c, p.length > 2 ? p[2] : ""); }
            case "pv" -> { if (PROVINCIA.equals(s.getPaso())) elegirProvincia(s, c, entero(p, 2, -1)); }
            case "u" -> { if (CONFIRMA_UBI.equals(s.getPaso())) confirmarUbicacion(s, c, p.length > 2 ? p[2] : ""); }
            case "pay" -> { if (RESUMEN.equals(s.getPaso())) pagar(s, c); }
            case "x" -> cancelar(s);
            default -> log.debug("[telegram-comprador] callback desconocido");
        }
    }

    // ── Catálogo y carrito ────────────────────────────────────────────────────

    private boolean enCompra(TelegramCompradorSesion s) {
        return !ESPERANDO_PAGO.equals(s.getPaso()) && !PAGADO.equals(s.getPaso());
    }

    private void mostrarCatalogo(TelegramCompradorSesion s, TelegramCompradorCtx c, int pagina) {
        int pag = Math.max(0, Math.min(pagina, 1_000));
        Page<Producto> page = productoRepository.catalogoTelegram(s.getEmpresaId(), PageRequest.of(pag, PAGINA));
        List<Producto> lista = page.getContent();
        int unidades = c.unidades();
        if (!CATALOGO.equals(s.getPaso())) irA(s, c, CATALOGO);
        bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.catalogo(lista, pag, page.hasNext(), unidades),
            TelegramCompradorUi.tecladoCatalogo(lista, pag, page.hasNext(), unidades));
    }

    private Producto productoDeLaTienda(TelegramCompradorSesion s, Long id) {
        if (id == null || id <= 0) return null;
        Producto p = productoRepository.findByIdAndEmpresaId(id, s.getEmpresaId()).orElse(null); // IDOR: solo la empresa de la sesión
        if (p == null || !StockReservationService.esPublicableEnMemoria(p) || Boolean.TRUE.equals(p.getVendido())
                || p.esACotizar() || Boolean.TRUE.equals(p.getEsPersonalizado())) return null;
        return p;
    }

    private void elegirCantidad(TelegramCompradorSesion s, Long productoId) {
        Producto p = productoDeLaTienda(s, productoId);
        if (p == null || p.getStockDisponible() <= 0) {
            bot.enviarMensaje(s.getChatId(), "Ese producto ya no está disponible.");
            return;
        }
        int max = guestCheckoutGuard.getMaxPorProducto();
        bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.cantidad(p, max),
            TelegramCompradorUi.tecladoCantidad(p.getId(), max, p.getStockDisponible()));
    }

    private void agregar(TelegramCompradorSesion s, TelegramCompradorCtx c, long productoId, int cantidad) {
        Producto p = productoDeLaTienda(s, productoId);
        int max = guestCheckoutGuard.getMaxPorProducto();
        if (p == null || cantidad < 1 || cantidad > max) {
            bot.enviarMensaje(s.getChatId(), "Ese producto ya no está disponible.");
            return;
        }
        int nuevo = c.carrito.getOrDefault(p.getId(), 0) + cantidad;
        if (nuevo > max) {
            bot.enviarMensaje(s.getChatId(), "Podés pedir hasta " + max + " unidades de un mismo producto.");
            mostrarCarrito(s, c);
            return;
        }
        if (nuevo > p.getStockDisponible()) {
            bot.enviarMensaje(s.getChatId(), "No hay tantas unidades disponibles de ese producto.");
            return;
        }
        if (!c.carrito.containsKey(p.getId()) && c.carrito.size() >= MAX_LINEAS) {
            bot.enviarMensaje(s.getChatId(), "Tu carrito ya tiene muchos productos distintos. Continuá con el pedido.");
            return;
        }
        c.carrito.put(p.getId(), nuevo);
        guardar(s, c);
        mostrarCarrito(s, c);
    }

    private void quitar(TelegramCompradorSesion s, TelegramCompradorCtx c, long productoId) {
        c.carrito.remove(productoId);
        guardar(s, c);
        mostrarCarrito(s, c);
    }

    private List<TelegramCompradorUi.Linea> lineas(TelegramCompradorSesion s, TelegramCompradorCtx c) {
        List<TelegramCompradorUi.Linea> out = new ArrayList<>();
        boolean cambio = false;
        for (var it = c.carrito.entrySet().iterator(); it.hasNext(); ) {
            var e = it.next();
            Producto p = productoDeLaTienda(s, e.getKey());
            if (p == null) { it.remove(); cambio = true; continue; }
            out.add(new TelegramCompradorUi.Linea(p.getId(), p.getNombreProducto(), e.getValue(), OrderPricingService.precioEfectivo(p)));
        }
        if (cambio) guardar(s, c);
        return out;
    }

    private void mostrarCarrito(TelegramCompradorSesion s, TelegramCompradorCtx c) {
        List<TelegramCompradorUi.Linea> ls = lineas(s, c);
        bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.carrito(ls), TelegramCompradorUi.tecladoCarrito(ls));
    }

    private void continuar(TelegramCompradorSesion s, TelegramCompradorCtx c) {
        if (lineas(s, c).isEmpty()) {
            mostrarCarrito(s, c);
            return;
        }
        irA(s, c, ENTREGA);
        bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.preguntaEntrega(),
            TelegramCompradorUi.tecladoEntrega(pedidoService.ofreceRetiro(s.getEmpresaId())));
    }

    // ── Entrega y datos ───────────────────────────────────────────────────────

    private void elegirEntrega(TelegramCompradorSesion s, TelegramCompradorCtx c, String tipo) {
        if ("R".equals(tipo) && pedidoService.ofreceRetiro(s.getEmpresaId())) {
            c.entrega = TelegramCompradorCtx.RETIRO;
        } else if ("D".equals(tipo)) {
            c.entrega = TelegramCompradorCtx.DOMICILIO;
        } else {
            bot.enviarMensaje(s.getChatId(), "Esa opción no está disponible en esta tienda.");
            return;
        }
        irA(s, c, NOMBRE);
        bot.enviarMensaje(s.getChatId(), "¿A nombre de quién va el pedido? Escribí tu nombre.");
    }

    private void recibirNombre(TelegramCompradorSesion s, TelegramCompradorCtx c, String t) {
        String n = t.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
        if (!NOMBRE_VALIDO.matcher(n).matches()) {
            bot.enviarMensaje(s.getChatId(), "Ese nombre no parece válido. Escribilo solo con letras (ej: María Mora).");
            return;
        }
        c.nombre = n;
        irA(s, c, TELEFONO);
        bot.enviarMensaje(s.getChatId(), "¿Cuál es tu teléfono de Costa Rica? (8 dígitos, para avisarte de tu pedido)");
    }

    /** Teléfono de Costa Rica: 8 dígitos (acepta +506 / 506 delante). Devuelve null si no es válido. */
    static String telefonoCr(String t) {
        if (t == null) return null;
        String d = t.replaceAll("[^0-9]", "");
        if (d.length() == 11 && d.startsWith("506")) d = d.substring(3);
        return d.length() == 8 ? d : null;
    }

    private void recibirTelefono(TelegramCompradorSesion s, TelegramCompradorCtx c, String t) {
        String tel = telefonoCr(t);
        if (tel == null) {
            bot.enviarMensaje(s.getChatId(), "Ese teléfono no es válido. Escribí los 8 dígitos (ej: 8888 8888).");
            return;
        }
        c.telefono = tel;
        irA(s, c, CORREO);
        bot.enviarMensaje(s.getChatId(), "¿A qué correo te mandamos el comprobante del pedido?");
    }

    private void recibirCorreo(TelegramCompradorSesion s, TelegramCompradorCtx c, String t) {
        String correo = t.trim().toLowerCase(Locale.ROOT);
        if (correo.length() > 150 || !CORREO_VALIDO.matcher(correo).matches()) {
            bot.enviarMensaje(s.getChatId(), "Ese correo no es válido. Escribilo así: nombre@correo.com");
            return;
        }
        c.correo = correo;
        if (c.esDomicilio()) {
            irA(s, c, PROVINCIA);
            bot.enviarMensaje(s.getChatId(), "¿En qué provincia es la entrega?", TelegramCompradorUi.tecladoProvincias());
        } else {
            mostrarResumen(s, c);
        }
    }

    private void elegirProvincia(TelegramCompradorSesion s, TelegramCompradorCtx c, int idx) {
        if (idx < 0 || idx >= TelegramCompradorUi.PROVINCIAS.size()) return;
        c.provincia = TelegramCompradorUi.PROVINCIAS.get(idx);
        irA(s, c, CANTON);
        bot.enviarMensaje(s.getChatId(), "¿En qué cantón de " + TelegramCompradorUi.esc(c.provincia) + "? Escribilo (ej: Belén).");
    }

    private void recibirCanton(TelegramCompradorSesion s, TelegramCompradorCtx c, String t) {
        try {
            DestinoEnvio.Destino d = DestinoEnvio.resolver(c.provincia, t.trim());
            if (d == null) throw new IllegalArgumentException();
            c.provincia = d.provincia();
            c.canton = d.canton();
        } catch (IllegalArgumentException e) {
            bot.enviarMensaje(s.getChatId(), "No encontré ese cantón en " + TelegramCompradorUi.esc(c.provincia) + ". Escribilo como aparece en el mapa (ej: Belén).");
            return;
        }
        irA(s, c, UBICACION);
        bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.pedirUbicacion());
    }

    private void recibirUbicacionTexto(TelegramCompradorSesion s, TelegramCompradorCtx c, String t) {
        c.olvidarUbicacion();
        var enlace = EnlaceUbicacionValidator.analizar(t);
        if (enlace.isPresent()) {
            var e = enlace.get();
            c.fuente = e.fuente();
            c.url = e.urlNormalizada();
            c.lat = e.lat();
            c.lng = e.lng();
            c.direccionTexto = e.consulta();
        } else if (pareceEnlace(t)) {
            bot.enviarMensaje(s.getChatId(), "Ese enlace no lo puedo usar. Mandame un enlace de Google Maps o Waze, tu ubicación de Telegram, o escribí tus señas.");
            return;
        } else {
            String senas = t.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
            if (senas.length() < 10) {
                bot.enviarMensaje(s.getChatId(), "Las señas son muy cortas. Contame un poco más (distrito, calle, referencias).");
                return;
            }
            if (senas.length() > 500) {
                bot.enviarMensaje(s.getChatId(), "Las señas son muy largas (máximo 500 caracteres). Resumilas un poco.");
                return;
            }
            c.fuente = PedidoEntrega.TEXTO;
            c.direccionTexto = senas;
        }
        irA(s, c, CONFIRMA_UBI);
        bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.confirmarUbicacion(c), TelegramCompradorUi.tecladoConfirmarUbicacion());
    }

    private static final Pattern ESQUEMA_PELIGROSO = Pattern.compile("(?i)\\b(javascript|data|vbscript|file|ftp|intent)\\s*:");

    /** Texto con forma de enlace (o de esquema peligroso) que NO pasó la lista blanca: no se acepta como señas. */
    static boolean pareceEnlace(String t) {
        String b = t.toLowerCase(Locale.ROOT);
        return b.contains("://") || b.contains("www.") || b.contains("http") || ESQUEMA_PELIGROSO.matcher(t).find();
    }

    private void confirmarUbicacion(TelegramCompradorSesion s, TelegramCompradorCtx c, String resp) {
        if ("s".equals(resp)) {
            mostrarResumen(s, c);
        } else {
            c.olvidarUbicacion();
            irA(s, c, UBICACION);
            bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.pedirUbicacion());
        }
    }

    private void mostrarResumen(TelegramCompradorSesion s, TelegramCompradorCtx c) {
        List<TelegramCompradorUi.Linea> ls = lineas(s, c);
        if (ls.isEmpty()) {
            irA(s, c, CATALOGO);
            mostrarCatalogo(s, c, 0);
            return;
        }
        int envio = 0;
        if (c.esDomicilio()) {
            envio = pricing.calcularCostoEnvio(OrderPricingService.metodoNormalPorDestino("ENVIO_NORMAL_GAM", c.provincia, c.canton));
        }
        irA(s, c, RESUMEN);
        bot.enviarMensaje(s.getChatId(), TelegramCompradorUi.resumen(ls, c, envio, onvoService.esSandbox()), TelegramCompradorUi.tecladoResumen());
    }

    // ── Pago y cancelación ────────────────────────────────────────────────────

    private void pagar(TelegramCompradorSesion s, TelegramCompradorCtx c) {
        var r = pedidoService.iniciarPago(s, c);
        if (!r.ok()) {
            bot.enviarMensaje(s.getChatId(), r.mensaje(), TelegramCompradorUi.tecladoResumen());
            return;
        }
        bot.enviarMensaje(s.getChatId(), "💳 Tu pedido *" + TelegramCompradorUi.esc(r.numeroPedido()) + "* está reservado por "
                + vencimientoMinutos + " minutos. Total: *" + FormatoColones.colones(r.total()) + "*.\n\n"
                + "Pagá con el botón: el pago se hace en la página segura de ONVO (modo de prueba, no se cobra dinero real). "
                + "Por este chat nunca te voy a pedir datos de tarjeta.\n\nSi no pagás a tiempo, se libera la reserva.",
            List.of(List.of(Map.of("text", "💳 Pagar ahora", "url", r.urlPago())),
                List.of(TelegramClienteBotService.boton("❌ Cancelar pedido", "c:x"))));
    }

    /** /cancelar o botón ❌: antes de pagar libera todo; ya pagado, aplican las reglas de pedidos de la tienda. */
    void cancelar(TelegramCompradorSesion s) {
        if (PAGADO.equals(s.getPaso())) {
            bot.enviarMensaje(s.getChatId(), "Tu pedido ya está pagado. Para cambios o cancelación comunicate con la tienda.");
            return;
        }
        if (ESPERANDO_PAGO.equals(s.getPaso()) && s.getPedidoId() != null) {
            String numero = pedidoRepository.findById(s.getPedidoId()).map(p -> p.getNumeroPedido()).orElse(null);
            if (numero == null || !pedidoService.cancelarNoPagado(numero)) {
                bot.enviarMensaje(s.getChatId(), "No pude cancelar el pedido ahora. Si ya pagaste, comunicate con la tienda; si no, la reserva se libera sola al vencer.");
                return;
            }
            s.setPedidoId(null);
            bot.enviarMensaje(s.getChatId(), "Listo, cancelé tu pedido y liberé los productos.");
        } else {
            bot.enviarMensaje(s.getChatId(), "Listo, cancelado. Cuando quieras volver a pedir, tocá el enlace de la tienda.");
        }
        s.setPaso(CATALOGO);
        s.setContexto(null);
        s.setUltimaActividad(LocalDateTime.now(Constants.ZONA_CR));
        sesionRepository.save(s);
    }

    // ── Soporte ───────────────────────────────────────────────────────────────

    private void irA(TelegramCompradorSesion s, TelegramCompradorCtx c, String paso) {
        s.setPaso(paso);
        guardar(s, c);
    }

    private void guardar(TelegramCompradorSesion s, TelegramCompradorCtx c) {
        s.setContexto(c.aJson());
        s.setUltimaActividad(LocalDateTime.now(Constants.ZONA_CR));
        sesionRepository.save(s);
    }

    private void repetirPaso(TelegramCompradorSesion s) {
        TelegramCompradorCtx c = TelegramCompradorCtx.desde(s.getContexto());
        long chat = s.getChatId();
        switch (s.getPaso()) {
            case CATALOGO -> mostrarCatalogo(s, c, 0);
            case ENTREGA -> bot.enviarMensaje(chat, TelegramCompradorUi.preguntaEntrega(), TelegramCompradorUi.tecladoEntrega(pedidoService.ofreceRetiro(s.getEmpresaId())));
            case NOMBRE -> bot.enviarMensaje(chat, "¿A nombre de quién va el pedido? Escribí tu nombre.");
            case TELEFONO -> bot.enviarMensaje(chat, "¿Cuál es tu teléfono de Costa Rica? (8 dígitos)");
            case CORREO -> bot.enviarMensaje(chat, "¿A qué correo te mandamos el comprobante?");
            case PROVINCIA -> bot.enviarMensaje(chat, "¿En qué provincia es la entrega?", TelegramCompradorUi.tecladoProvincias());
            case CANTON -> bot.enviarMensaje(chat, "¿En qué cantón? Escribilo (ej: Belén).");
            case UBICACION -> bot.enviarMensaje(chat, TelegramCompradorUi.pedirUbicacion());
            case CONFIRMA_UBI -> bot.enviarMensaje(chat, TelegramCompradorUi.confirmarUbicacion(c), TelegramCompradorUi.tecladoConfirmarUbicacion());
            case RESUMEN -> mostrarResumen(s, c);
            default -> { }
        }
    }

    private static int entero(String[] p, int i, int def) {
        if (i >= p.length) return def;
        try {
            return Integer.parseInt(p[i]);
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static long numero(String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return -1;
        }
    }
}
