package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.hotclick.dto.TelegramFlujoEstado.*;

/**
 * Máquina de estados de los flujos multi-paso del bot de Telegram para clientes:
 * registrar una venta rápida, dar de alta un producto con fotos, y consultar
 * clientes con sugerencias de cross-sell.
 *
 * TelegramBotUpdateService actúa de router (webhook → vinculación → rate limit)
 * y delega aquí todo callback con prefijo vta:/prd:/cli:/flx: y todo texto o foto
 * cuando el contexto guardado es un borrador JSON (ver TelegramFlujoEstado).
 *
 * Seguridad:
 *  - El router entrega empresaId ya validado (membresía activa revalidada).
 *  - Las operaciones de escritura (venta, producto) exigen PROPIETARIO o ADMIN,
 *    revalidado al INICIAR y al CONFIRMAR (defensa en profundidad).
 *  - Ver clientes también exige PROPIETARIO/ADMIN: expone PII (teléfonos).
 *  - Toda query va parametrizada y filtrada por empresaId.
 *  - Las fotos solo se aceptan en el paso FOTOS del alta de producto; la escritura
 *    del borrador en ese paso usa lock pesimista (un álbum llega como varios
 *    updates simultáneos y sin lock los appends se pisarían).
 *  - Si se cancela un alta con fotos ya subidas, los objetos quedan huérfanos en
 *    S3 (aceptado — mismo comportamiento que el import de catálogo).
 *
 * Los flujos guiados NO dependen de la IA; solo el cross-sell la usa, con
 * fallback SQL si el proveedor está caído.
 */
@Service
public class TelegramFlujoService {

    private static final Logger log = LoggerFactory.getLogger(TelegramFlujoService.class);

    private static final int  PAGINA          = 8;
    private static final int  MAX_FOTOS       = 5;
    private static final long MAX_FOTO_BYTES  = 10L * 1024 * 1024;
    private static final List<String> METODOS_PAGO = List.of("SINPE", "EFECTIVO", "TARJETA");

    private static final String BTN_CANCELAR = "flx:x";

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private VentaService                  ventaService;
    @Autowired private ProductoService               productoService;
    @Autowired private PedidoService                 pedidoService;
    @Autowired private StockService                  stockService;
    @Autowired private ProductoImagenService         productoImagenService;
    @Autowired private SupabaseStorageService        storageService;
    @Autowired private UsuarioService                usuarioService;
    @Autowired private UsuarioRepository             usuarioRepository;
    @Autowired private PedidoRepository              pedidoRepository;
    @Autowired private EmpresaRepository             empresaRepository;
    @Autowired private BodegaRepository              bodegaRepository;
    @Autowired private CategoriaRepository           categoriaRepository;
    @Autowired private MarcaRepository               marcaRepository;
    @Autowired private TenantService                 tenantService;
    @Autowired private TextModerationService         textModerationService;
    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private AiCopilotService              aiCopilotService;
    @Autowired private JdbcTemplate                  jdbc;
    @Autowired private ObjectMapper                  objectMapper;

    /** Self-proxy: @Async y @Transactional(REQUIRES_NEW) no aplican en llamadas internas. */
    @Autowired @Lazy private TelegramFlujoService self;

    // ── Permisos ──────────────────────────────────────────────────────────────

    /**
     * PROPIETARIO o ADMIN de la empresa. Incluye al dueño directo (usuario.empresaId)
     * aunque no tenga fila en miembro_empresa — mismo criterio que empresaValidada.
     */
    public boolean esPropietarioOAdmin(Usuario usuario, Long empresaId) {
        if (usuario == null || empresaId == null) return false;
        if (empresaId.equals(usuario.getEmpresaId())) return true;
        return miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(usuario.getId(), empresaId, 1)
            .map(m -> "PROPIETARIO".equals(m.getRolEnEmpresa()) || "ADMIN".equals(m.getRolEnEmpresa()))
            .orElse(false);
    }

    // ── Entradas desde el router ──────────────────────────────────────────────

    /** @return true si el callback era de un flujo de este servicio y fue atendido. */
    public boolean manejarCallback(TelegramVinculacion v, Long empresaId, String data) {
        if (BTN_CANCELAR.equals(data)) {
            cancelar(v);
            return true;
        }
        if (data.startsWith("vta:")) { callbackVenta(v, empresaId, data.substring(4));    return true; }
        if (data.startsWith("prd:")) { callbackProducto(v, empresaId, data.substring(4)); return true; }
        if (data.startsWith("cli:")) { callbackClientes(v, empresaId, data.substring(4)); return true; }
        if (data.startsWith("acn:")) { callbackAccion(v, empresaId, data.substring(4));   return true; }
        return false;
    }

    /** Texto libre cuando hay un borrador activo. El router ya filtró comandos (/cancelar, /menu…). */
    public void manejarTexto(TelegramVinculacion v, Long empresaId, String texto) {
        TelegramFlujoEstado e = estadoVigente(v);
        if (e == null) return;
        if (FLUJO_VENTA.equals(e.getF()))        textoVenta(v, empresaId, e, texto);
        else if (FLUJO_PRODUCTO.equals(e.getF())) textoProducto(v, empresaId, e, texto);
        else if (FLUJO_ACCION.equals(e.getF())) {
            bot.enviarMensaje(v.getChatId(), "Tocá *Confirmar* o *Cancelar* arriba, o escribí /cancelar.");
        }
    }

    /**
     * Foto entrante — como foto comprimida (`photo`) o como archivo/documento de
     * imagen (`document` con mime_type image/*, común al mandar desde Telegram
     * Desktop sin comprimir). @return true si se consumió (estábamos en el paso
     * FOTOS del alta de producto); false para que el router aplique el rechazo
     * estándar.
     */
    public boolean manejarFoto(TelegramVinculacion v, Long empresaId, JsonNode msg) {
        // Chequeo barato sin lock: ¿hay un borrador de producto esperando fotos?
        Optional<TelegramFlujoEstado> rapido = TelegramFlujoEstado.deserializar(v.getContexto(), objectMapper);
        if (rapido.isEmpty() || !FLUJO_PRODUCTO.equals(rapido.get().getF())
                || !P_PRD_FOTOS.equals(rapido.get().getP())) {
            return false;
        }

        // Relectura con lock: el borrador se reescribe por cada foto y un álbum
        // llega como updates casi simultáneos.
        Optional<TelegramVinculacion> conLock = vinculacionRepository
            .findWithLockByChatIdAndEstado(v.getChatId(), TelegramVinculacion.ACTIVA);
        if (conLock.isEmpty()) return false;
        TelegramVinculacion vl = conLock.get();

        TelegramFlujoEstado e = estadoVigente(vl);
        if (e == null || !FLUJO_PRODUCTO.equals(e.getF()) || !P_PRD_FOTOS.equals(e.getP())) return false;

        List<String> fotos = e.getDraftSeguro().getFotos();
        if (fotos.size() >= MAX_FOTOS) {
            bot.enviarMensaje(vl.getChatId(), "Ya tenés " + MAX_FOTOS + " fotos (el máximo). Tocá *Listo* para continuar.",
                tecladoFotos(fotos.size()));
            return true;
        }

        // El array photo viene ordenado de menor a mayor resolución — se toma la
        // más grande que respete el límite de tamaño. Si vino como documento
        // (imagen sin comprimir), se usa directo su file_id/file_size.
        String fileId = null;
        if (msg.has("photo")) {
            JsonNode sizes = msg.path("photo");
            for (int i = sizes.size() - 1; i >= 0; i--) {
                long fs = sizes.get(i).path("file_size").asLong(Long.MAX_VALUE);
                if (fs <= MAX_FOTO_BYTES) { fileId = sizes.get(i).path("file_id").asText(null); break; }
            }
        } else if (msg.has("document")) {
            JsonNode doc = msg.path("document");
            long fs = doc.path("file_size").asLong(Long.MAX_VALUE);
            if (fs <= MAX_FOTO_BYTES) fileId = doc.path("file_id").asText(null);
        }
        if (fileId == null) {
            bot.enviarMensaje(vl.getChatId(), "Esa foto es demasiado pesada (máx 10 MB). Probá con otra.");
            return true;
        }

        bot.enviarAccionEscribiendo(vl.getChatId());
        byte[] bytes = bot.descargarArchivo(fileId, MAX_FOTO_BYTES);
        if (bytes == null) {
            bot.enviarMensaje(vl.getChatId(), "No pude descargar la foto. Mandala de nuevo, por favor.");
            return true;
        }

        try {
            // Telegram recomprime las fotos a JPEG; subirImagenDescargada valida
            // magic bytes y re-encodea igual que un upload del panel.
            String url = storageService.subirImagenDescargada(bytes, "telegram.jpg", "image/jpeg", "productos/telegram");
            fotos.add(url);
            guardar(vl, e);
            bot.enviarMensaje(vl.getChatId(),
                "Foto " + fotos.size() + " recibida ✅" + (fotos.size() < MAX_FOTOS
                    ? " Podés mandar otra (máx " + MAX_FOTOS + ") o tocar *Listo*."
                    : " Tocá *Listo* para continuar."),
                tecladoFotos(fotos.size()));
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo subiendo foto de chat {} — {}", vl.getChatId(), ex.getMessage());
            bot.enviarMensaje(vl.getChatId(), "No pude guardar la foto (" + ex.getMessage() + "). Probá con otra imagen.");
        }
        return true;
    }

    // ── FLUJO VENTA ───────────────────────────────────────────────────────────

    private void callbackVenta(TelegramVinculacion v, Long empresaId, String sub) {
        if ("new".equals(sub)) {
            if (denegarSiNoGestiona(v, empresaId)) return;
            TelegramFlujoEstado e = TelegramFlujoEstado.nuevaVenta(ahora());
            guardar(v, e);
            mostrarPaginaProductos(v, empresaId, 0);
            return;
        }

        TelegramFlujoEstado e = estadoVigente(v);
        if (e == null || !FLUJO_VENTA.equals(e.getF())) {
            bot.enviarMensaje(v.getChatId(), "Ese botón ya no está vigente. Escribí /menu para empezar de nuevo.");
            return;
        }

        if (sub.startsWith("pg:")) {
            Integer pg = parseEntero(sub.substring(3), 0, 10_000);
            mostrarPaginaProductos(v, empresaId, pg != null ? pg : 0);
        } else if (sub.startsWith("p:")) {
            seleccionarProductoVenta(v, empresaId, e, sub.substring(2));
        } else if ("add".equals(sub)) {
            e.setP(P_VTA_PRODUCTO);
            e.setPid(null);
            guardar(v, e);
            mostrarPaginaProductos(v, empresaId, 0);
        } else if ("cont".equals(sub)) {
            if (e.getItemsSeguro().isEmpty()) {
                bot.enviarMensaje(v.getChatId(), "Todavía no agregaste ningún producto.");
                mostrarPaginaProductos(v, empresaId, 0);
                return;
            }
            e.setP(P_VTA_PAGO);
            guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "¿Cómo te pagaron?", List.of(
                List.of(TelegramClienteBotService.boton("📱 SINPE", "vta:pay:SINPE"),
                        TelegramClienteBotService.boton("💵 Efectivo", "vta:pay:EFECTIVO")),
                List.of(TelegramClienteBotService.boton("💳 Tarjeta", "vta:pay:TARJETA"),
                        TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        } else if (sub.startsWith("pay:")) {
            String metodo = sub.substring(4);
            if (!METODOS_PAGO.contains(metodo)) return;
            e.setPago(metodo);
            e.setP(P_VTA_CLIENTE);
            guardar(v, e);
            bot.enviarMensaje(v.getChatId(),
                "¿A quién le vendiste? Asociar el cliente sirve para su historial de compras (opcional).",
                List.of(
                    List.of(TelegramClienteBotService.boton("🔍 Buscar cliente", "vta:cliq"),
                            TelegramClienteBotService.boton("➕ Cliente nuevo", "vta:clinew")),
                    List.of(TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli"),
                            TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        } else if ("cliq".equals(sub)) {
            e.setP(P_VTA_CLIENTE_BUSCAR);
            guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre, teléfono o correo del cliente:");
        } else if ("clinew".equals(sub)) {
            e.setP(P_VTA_CLIENTE_NUEVO);
            guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre y teléfono del cliente (ej: _Ana Mora 8888-8888_):");
        } else if ("nocli".equals(sub)) {
            e.setCli(null);
            mostrarResumenVenta(v, empresaId, e);
        } else if (sub.startsWith("cli:")) {
            Long clienteId = parseLong(sub.substring(4));
            if (clienteId == null || !clientePerteneceAEmpresa(clienteId, empresaId)) {
                bot.enviarMensaje(v.getChatId(), "Ese cliente no pertenece a tu negocio.");
                return;
            }
            e.setCli(clienteId);
            mostrarResumenVenta(v, empresaId, e);
        } else if ("ok".equals(sub)) {
            confirmarVenta(v, empresaId, e);
        }
    }

    private void textoVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        switch (e.getP()) {
            case P_VTA_CANTIDAD -> {
                Integer cant = parseEntero(texto, 1, 1_000_000);
                if (cant == null) {
                    bot.enviarMensaje(v.getChatId(), "Esperaba una cantidad (ej: 2). Escribila de nuevo o /cancelar.");
                    return;
                }
                Map<String, Object> prod = productoVendible(e.getPid(), empresaId);
                if (prod == null) {
                    e.setPid(null);
                    e.setP(P_VTA_PRODUCTO);
                    guardar(v, e);
                    bot.enviarMensaje(v.getChatId(), "Ese producto ya no está disponible. Elegí otro:");
                    mostrarPaginaProductos(v, empresaId, 0);
                    return;
                }
                int disp = ((Number) prod.get("disp")).intValue();
                if (cant > disp) {
                    bot.enviarMensaje(v.getChatId(), "Solo hay *" + disp + "* disponibles de *"
                        + esc((String) prod.get("nombre_producto")) + "*. Escribí una cantidad menor o /cancelar.");
                    return;
                }
                // Si el producto ya estaba en la venta, se suma la cantidad
                TelegramFlujoEstado.ItemBorrador existente = e.getItemsSeguro().stream()
                    .filter(i -> e.getPid().equals(i.getPid())).findFirst().orElse(null);
                if (existente != null) existente.setC(existente.getC() + cant);
                else e.getItemsSeguro().add(new TelegramFlujoEstado.ItemBorrador(e.getPid(), cant));
                e.setPid(null);
                e.setP(P_VTA_PRODUCTO);
                guardar(v, e);
                bot.enviarMensaje(v.getChatId(),
                    "Agregado: *" + cant + " × " + esc((String) prod.get("nombre_producto")) + "*\n\n" + resumenItems(e, empresaId),
                    List.of(List.of(
                        TelegramClienteBotService.boton("➕ Agregar otro", "vta:add"),
                        TelegramClienteBotService.boton("✅ Continuar", "vta:cont")),
                        List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
            }
            case P_VTA_CLIENTE_BUSCAR -> {
                if (texto.length() < 2) {
                    bot.enviarMensaje(v.getChatId(), "Escribí al menos 2 letras para buscar.");
                    return;
                }
                List<Usuario> encontrados = usuarioRepository.buscarClientesByEmpresa(texto, empresaId);
                if (encontrados.isEmpty()) {
                    bot.enviarMensaje(v.getChatId(), "No encontré clientes con \"" + esc(texto) + "\".", List.of(
                        List.of(TelegramClienteBotService.boton("➕ Crearlo como nuevo", "vta:clinew"),
                                TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli"))));
                    return;
                }
                List<List<Map<String, Object>>> teclado = new ArrayList<>();
                encontrados.stream().limit(6).forEach(c -> teclado.add(List.of(
                    TelegramClienteBotService.boton(recortar(nombreCompleto(c), 40), "vta:cli:" + c.getId()))));
                teclado.add(List.of(TelegramClienteBotService.boton("➕ Cliente nuevo", "vta:clinew"),
                                    TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli")));
                bot.enviarMensaje(v.getChatId(), "¿Cuál de estos es?", teclado);
            }
            case P_VTA_CLIENTE_NUEVO -> {
                String[] nombreTel = separarNombreTelefono(texto);
                if (nombreTel[0].isBlank()) {
                    bot.enviarMensaje(v.getChatId(), "Necesito al menos el nombre (ej: _Ana Mora 8888-8888_).");
                    return;
                }
                try {
                    Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
                    Usuario nuevo = self.crearClienteTx(nombreTel[0], nombreTel[1], empresa);
                    e.setCli(nuevo.getId());
                    bot.enviarMensaje(v.getChatId(), "Cliente *" + esc(nombreCompleto(nuevo)) + "* registrado ✅");
                    mostrarResumenVenta(v, empresaId, e);
                } catch (Exception ex) {
                    log.error("[telegram-flujo] fallo creando cliente en chat {} — {}", v.getChatId(), ex.getMessage());
                    bot.enviarMensaje(v.getChatId(), "No pude registrar el cliente. Probá de nuevo o tocá *Sin cliente*.",
                        List.of(List.of(TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli"))));
                }
            }
            default -> bot.enviarMensaje(v.getChatId(),
                "Usá los botones del mensaje anterior para continuar, o /cancelar para salir.");
        }
    }

    private void seleccionarProductoVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String idCrudo) {
        Long productoId = parseLong(idCrudo);
        Map<String, Object> prod = productoId != null ? productoVendible(productoId, empresaId) : null;
        if (prod == null) {
            bot.enviarMensaje(v.getChatId(), "Ese producto no está disponible.");
            mostrarPaginaProductos(v, empresaId, 0);
            return;
        }
        e.setPid(productoId);
        e.setP(P_VTA_CANTIDAD);
        guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "¿Cuántas unidades de *" + esc((String) prod.get("nombre_producto"))
            + "*? (disponibles: " + prod.get("disp") + ")\n\nEscribí solo el número, o /cancelar.");
    }

    private void mostrarPaginaProductos(TelegramVinculacion v, Long empresaId, int pagina) {
        List<Map<String, Object>> filas = jdbc.queryForList("""
            SELECT id_producto, nombre_producto, precio_venta,
                   (stock_actual - COALESCE(stock_reservado, 0)) AS disp
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND vendido = FALSE
              AND (stock_actual - COALESCE(stock_reservado, 0)) > 0
            ORDER BY nombre_producto ASC
            LIMIT ? OFFSET ?
            """, empresaId, PAGINA + 1, pagina * PAGINA);

        if (filas.isEmpty() && pagina == 0) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "No tenés productos con stock disponible para vender.");
            return;
        }
        boolean hayMas = filas.size() > PAGINA;
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        filas.stream().limit(PAGINA).forEach(p -> teclado.add(List.of(TelegramClienteBotService.boton(
            recortar((String) p.get("nombre_producto"), 30) + " · " + colones(p.get("precio_venta")) + " · x" + p.get("disp"),
            "vta:p:" + p.get("id_producto")))));

        List<Map<String, Object>> nav = new ArrayList<>();
        if (pagina > 0) nav.add(TelegramClienteBotService.boton("⬅️ Anterior", "vta:pg:" + (pagina - 1)));
        if (hayMas)     nav.add(TelegramClienteBotService.boton("Siguiente ➡️", "vta:pg:" + (pagina + 1)));
        if (!nav.isEmpty()) teclado.add(nav);
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));

        bot.enviarMensaje(v.getChatId(), "¿Qué producto vendiste? (tocá uno)", teclado);
    }

    private void mostrarResumenVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        e.setP(P_VTA_CONFIRMAR);
        guardar(v, e);
        StringBuilder sb = new StringBuilder("🧾 *Confirmá la venta:*\n\n");
        sb.append(resumenItems(e, empresaId));
        sb.append("\nPago: *").append(e.getPago() != null ? e.getPago() : "—").append("*\n");
        if (e.getCli() != null) {
            usuarioRepository.findById(e.getCli())
                .ifPresent(c -> sb.append("Cliente: *").append(esc(nombreCompleto(c))).append("*\n"));
        } else {
            sb.append("Cliente: sin asociar\n");
        }
        bot.enviarMensaje(v.getChatId(), sb.toString(), List.of(
            List.of(TelegramClienteBotService.boton("✅ Confirmar venta", "vta:ok")),
            List.of(TelegramClienteBotService.boton("➕ Agregar otro producto", "vta:add"),
                    TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
    }

    private void confirmarVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        if (denegarSiNoGestiona(v, empresaId)) return;
        if (e.getItemsSeguro().isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "La venta no tiene productos. Escribí /menu para empezar de nuevo.");
            limpiar(v);
            return;
        }

        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setMetodoPago(e.getPago() != null ? e.getPago() : "EFECTIVO");
        dto.setClienteId(e.getCli());
        // PAGADO y no COMPLETADO: las vistas del bot y las finanzas filtran IN ('PAGADO','ENTREGADO')
        dto.setEstadoInicial(Constants.PEDIDO_PAGADO);
        dto.setNotas("Venta registrada por Telegram");
        List<VentaRequestDTO.ItemVentaDTO> items = new ArrayList<>();
        for (TelegramFlujoEstado.ItemBorrador ib : e.getItemsSeguro()) {
            VentaRequestDTO.ItemVentaDTO item = new VentaRequestDTO.ItemVentaDTO();
            item.setProductoId(ib.getPid());
            item.setCantidad(ib.getC());
            items.add(item);
        }
        dto.setItems(items);

        try {
            // REQUIRES_NEW via self-proxy: si la venta falla (p.ej. stock), solo se
            // revierte su transacción — la del webhook sigue viva para guardar el
            // borrador intacto y responder al usuario.
            Pedido pedido = self.crearVentaTx(dto, v.getUsuario().getCorreo(), empresaId);
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "✅ Venta *" + esc(pedido.getNumeroPedido()) + "* registrada.\n\n"
                + "Total: *" + colones(pedido.getTotalPedido()) + "*\n"
                + "Utilidad: *" + colones(pedido.getUtilidadBruta()) + "*\n\n"
                + "Ya aparece en 💰 Ventas de hoy y en Finanzas.",
                List.of(List.of(TelegramClienteBotService.boton("📋 Menú", "menu"))));
        } catch (StockInsuficienteException ex) {
            bot.enviarMensaje(v.getChatId(), "⚠️ " + esc(ex.getMessage())
                + "\n\nEl stock cambió desde que armaste la venta. Ajustá las cantidades:", List.of(
                List.of(TelegramClienteBotService.boton("➕ Elegir productos", "vta:add"),
                        TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo confirmando venta en chat {} — {}", v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude registrar la venta: " + esc(ex.getMessage())
                + "\nProbá de nuevo en unos minutos o registrala desde el panel.");
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Pedido crearVentaTx(VentaRequestDTO dto, String correoOperador, Long empresaId) {
        return ventaService.crearVenta(dto, correoOperador, empresaId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Usuario crearClienteTx(String nombre, String telefono, Empresa empresa) {
        return usuarioService.crearClienteRapido(nombre, telefono, null, empresa);
    }

    private String resumenItems(TelegramFlujoEstado e, Long empresaId) {
        StringBuilder sb = new StringBuilder();
        int total = 0;
        for (TelegramFlujoEstado.ItemBorrador ib : e.getItemsSeguro()) {
            List<Map<String, Object>> fila = jdbc.queryForList(
                "SELECT nombre_producto, precio_venta FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
                ib.getPid(), empresaId);
            if (fila.isEmpty()) continue;
            int precio = ((Number) fila.get(0).get("precio_venta")).intValue();
            int sub = precio * ib.getC();
            total += sub;
            sb.append("• ").append(ib.getC()).append(" × ")
              .append(esc((String) fila.get(0).get("nombre_producto")))
              .append(" — ").append(colones(sub)).append("\n");
        }
        sb.append("\nTotal: *").append(colones(total)).append("*\n");
        return sb.toString();
    }

    private Map<String, Object> productoVendible(Long productoId, Long empresaId) {
        if (productoId == null) return null;
        List<Map<String, Object>> filas = jdbc.queryForList("""
            SELECT nombre_producto, (stock_actual - COALESCE(stock_reservado, 0)) AS disp
            FROM hot_click_producto_tb
            WHERE id_producto = ? AND fk_id_empresa = ? AND fk_id_estado = 1 AND vendido = FALSE
            """, productoId, empresaId);
        if (filas.isEmpty() || ((Number) filas.get(0).get("disp")).intValue() <= 0) return null;
        return filas.get(0);
    }

    // ── FLUJO PRODUCTO ────────────────────────────────────────────────────────

    private void callbackProducto(TelegramVinculacion v, Long empresaId, String sub) {
        if ("new".equals(sub)) {
            if (denegarSiNoGestiona(v, empresaId)) return;
            if (bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO).isEmpty()) {
                bot.enviarMensaje(v.getChatId(), "Tu negocio no tiene bodegas activas. Creá una desde el panel antes de publicar productos.");
                return;
            }
            try {
                tenantService.verificarLimiteProductos(empresaId);
            } catch (RuntimeException ex) {
                bot.enviarMensaje(v.getChatId(), esc(ex.getMessage()));
                return;
            }
            guardar(v, TelegramFlujoEstado.nuevoProducto(ahora()));
            bot.enviarMensaje(v.getChatId(), "➕ *Nuevo producto*\n\n¿Cómo se llama? (3 a 200 caracteres)\n\nEscribí /cancelar en cualquier momento para salir.");
            return;
        }

        TelegramFlujoEstado e = estadoVigente(v);
        if (e == null || !FLUJO_PRODUCTO.equals(e.getF())) {
            bot.enviarMensaje(v.getChatId(), "Ese botón ya no está vigente. Escribí /menu para empezar de nuevo.");
            return;
        }
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();

        if ("skip".equals(sub) && P_PRD_DESCRIPCION.equals(e.getP())) {
            e.setP(P_PRD_PRECIO_VENTA);
            guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)");
        } else if (sub.startsWith("catpg:")) {
            Integer pg = parseEntero(sub.substring(6), 0, 10_000);
            mostrarCategorias(v, empresaId, pg != null ? pg : 0);
        } else if (sub.startsWith("cat:")) {
            Long catId = parseLong(sub.substring(4));
            Categoria cat = catId != null ? categoriaRepository.findById(catId).orElse(null) : null;
            boolean valida = cat != null && cat.getEstado() != null && cat.getEstado() == Constants.ESTADO_ACTIVO
                && (cat.getEmpresaId() == null || empresaId.equals(cat.getEmpresaId()));
            if (!valida) {
                bot.enviarMensaje(v.getChatId(), "Esa categoría no está disponible.");
                mostrarCategorias(v, empresaId, 0);
                return;
            }
            d.setCat(catId);
            e.setP(P_PRD_MARCA);
            guardar(v, e);
            mostrarMarcas(v, empresaId);
        } else if (sub.startsWith("mar:")) {
            Long marcaId = parseLong(sub.substring(4));
            boolean valida = marcaId != null && marcaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO)
                .stream().anyMatch(m -> marcaId.equals(m.getId()));
            if (!valida) {
                bot.enviarMensaje(v.getChatId(), "Esa marca no está disponible.");
                mostrarMarcas(v, empresaId);
                return;
            }
            d.setMarca(marcaId);
            irAPasoFotos(v, e);
        } else if ("martxt".equals(sub)) {
            e.setP(P_PRD_MARCA_TEXTO);
            guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre de la marca:");
        } else if ("marno".equals(sub)) {
            d.setMarca(null);
            d.setMarcaTxt(null);
            irAPasoFotos(v, e);
        } else if ("fok".equals(sub)) {
            if (d.getFotos().isEmpty()) {
                bot.enviarMensaje(v.getChatId(), "Mandá al menos una foto del producto para continuar.");
                return;
            }
            mostrarResumenProducto(v, empresaId, e);
        } else if ("ok".equals(sub)) {
            confirmarProducto(v, empresaId, e);
        }
    }

    private void textoProducto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        switch (e.getP()) {
            case P_PRD_NOMBRE -> {
                if (texto.length() < 3 || texto.length() > 200) {
                    bot.enviarMensaje(v.getChatId(), "El nombre debe tener entre 3 y 200 caracteres. Escribilo de nuevo:");
                    return;
                }
                if (!textModerationService.moderar(texto).safe()) {
                    bot.enviarMensaje(v.getChatId(), "Ese nombre no está permitido en la plataforma. Escribí otro:");
                    return;
                }
                d.setNom(texto);
                e.setP(P_PRD_DESCRIPCION);
                guardar(v, e);
                bot.enviarMensaje(v.getChatId(), "Descripción corta (máx 255 caracteres):", List.of(
                    List.of(TelegramClienteBotService.boton("⏭️ Omitir", "prd:skip"),
                            TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
            }
            case P_PRD_DESCRIPCION -> {
                String desc = texto.length() > 255 ? texto.substring(0, 255) : texto;
                if (!textModerationService.moderar(desc).safe()) {
                    bot.enviarMensaje(v.getChatId(), "Esa descripción no está permitida en la plataforma. Escribí otra u *Omitir*:");
                    return;
                }
                d.setDesc(desc);
                e.setP(P_PRD_PRECIO_VENTA);
                guardar(v, e);
                bot.enviarMensaje(v.getChatId(), "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)");
            }
            case P_PRD_PRECIO_VENTA -> {
                Integer pv = parseEntero(texto, 1, 100_000_000);
                if (pv == null) {
                    bot.enviarMensaje(v.getChatId(), "Esperaba un precio en colones (ej: 8500). Escribilo de nuevo:");
                    return;
                }
                d.setPv(pv);
                e.setP(P_PRD_PRECIO_COMPRA);
                guardar(v, e);
                bot.enviarMensaje(v.getChatId(), "¿Cuánto te costó a vos? (precio de compra en colones — sirve para calcular tu ganancia)");
            }
            case P_PRD_PRECIO_COMPRA -> {
                Integer pc = parseEntero(texto, 0, 100_000_000);
                if (pc == null) {
                    bot.enviarMensaje(v.getChatId(), "Esperaba un número en colones (ej: 5000). Escribilo de nuevo:");
                    return;
                }
                d.setPc(pc);
                e.setP(P_PRD_STOCK);
                guardar(v, e);
                String aviso = pc > (d.getPv() != null ? d.getPv() : 0)
                    ? "⚠️ Ojo: el costo es mayor que el precio de venta — venderías con pérdida.\n\n" : "";
                bot.enviarMensaje(v.getChatId(), aviso + "¿Cuántas unidades tenés en stock?");
            }
            case P_PRD_STOCK -> {
                Integer stk = parseEntero(texto, 0, 1_000_000);
                if (stk == null) {
                    bot.enviarMensaje(v.getChatId(), "Esperaba un número (ej: 10). Escribilo de nuevo:");
                    return;
                }
                d.setStk(stk);
                e.setP(P_PRD_CATEGORIA);
                guardar(v, e);
                mostrarCategorias(v, empresaId, 0);
            }
            case P_PRD_MARCA_TEXTO -> {
                d.setMarcaTxt(texto.length() > 100 ? texto.substring(0, 100) : texto);
                irAPasoFotos(v, e);
            }
            default -> bot.enviarMensaje(v.getChatId(),
                "Usá los botones del mensaje anterior para continuar, o /cancelar para salir.");
        }
    }

    private void mostrarCategorias(TelegramVinculacion v, Long empresaId, int pagina) {
        List<Categoria> todas = categoriaRepository.findByEmpresaIdOrNoEmpresaAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        if (todas.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "No hay categorías disponibles. Creá una desde el panel primero.");
            return;
        }
        int desde = Math.min(pagina * PAGINA, Math.max(0, todas.size() - 1));
        List<Categoria> visibles = todas.subList(desde, Math.min(desde + PAGINA, todas.size()));

        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        for (int i = 0; i + 1 < visibles.size(); i += 2) {
            teclado.add(List.of(
                TelegramClienteBotService.boton(recortar(visibles.get(i).getNombreCategoria(), 24), "prd:cat:" + visibles.get(i).getId()),
                TelegramClienteBotService.boton(recortar(visibles.get(i + 1).getNombreCategoria(), 24), "prd:cat:" + visibles.get(i + 1).getId())));
        }
        if (visibles.size() % 2 == 1) {
            Categoria ult = visibles.get(visibles.size() - 1);
            teclado.add(List.of(TelegramClienteBotService.boton(recortar(ult.getNombreCategoria(), 24), "prd:cat:" + ult.getId())));
        }
        List<Map<String, Object>> nav = new ArrayList<>();
        if (pagina > 0)                                  nav.add(TelegramClienteBotService.boton("⬅️ Anterior", "prd:catpg:" + (pagina - 1)));
        if (desde + PAGINA < todas.size())               nav.add(TelegramClienteBotService.boton("Siguiente ➡️", "prd:catpg:" + (pagina + 1)));
        if (!nav.isEmpty()) teclado.add(nav);
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));
        bot.enviarMensaje(v.getChatId(), "¿En qué categoría va?", teclado);
    }

    private void mostrarMarcas(TelegramVinculacion v, Long empresaId) {
        List<Marca> marcas = marcaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        marcas.stream().limit(PAGINA).forEach(m -> teclado.add(List.of(
            TelegramClienteBotService.boton(recortar(m.getNombreMarca(), 40), "prd:mar:" + m.getId()))));
        teclado.add(List.of(TelegramClienteBotService.boton("✏️ Escribir marca", "prd:martxt"),
                            TelegramClienteBotService.boton("🚫 Sin marca", "prd:marno")));
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));
        bot.enviarMensaje(v.getChatId(), "¿De qué marca es?", teclado);
    }

    private void irAPasoFotos(TelegramVinculacion v, TelegramFlujoEstado e) {
        e.setP(P_PRD_FOTOS);
        guardar(v, e);
        bot.enviarMensaje(v.getChatId(),
            "📷 Mandame de 1 a " + MAX_FOTOS + " fotos del producto, una por mensaje.\n"
            + "La primera será la imagen principal. Cuando termines tocá *Listo*.",
            tecladoFotos(0));
    }

    private List<List<Map<String, Object>>> tecladoFotos(int cuantas) {
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        if (cuantas > 0) teclado.add(List.of(TelegramClienteBotService.boton("✅ Listo (" + cuantas + " foto" + (cuantas == 1 ? "" : "s") + ")", "prd:fok")));
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));
        return teclado;
    }

    private void mostrarResumenProducto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        e.setP(P_PRD_CONFIRMAR);
        guardar(v, e);

        String categoria = d.getCat() != null
            ? categoriaRepository.findById(d.getCat()).map(Categoria::getNombreCategoria).orElse("—") : "—";
        String marca = d.getMarca() != null
            ? marcaRepository.findById(d.getMarca()).map(Marca::getNombreMarca).orElse("—")
            : (d.getMarcaTxt() != null ? d.getMarcaTxt() : "Sin marca");

        bot.enviarMensaje(v.getChatId(), "📦 *Revisá el producto:*\n\n"
            + "Nombre: *" + esc(d.getNom()) + "*\n"
            + "Descripción: " + (d.getDesc() != null ? esc(d.getDesc()) : "—") + "\n"
            + "Precio venta: *" + colones(d.getPv()) + "*\n"
            + "Costo: " + colones(d.getPc()) + "\n"
            + "Stock: *" + d.getStk() + "*\n"
            + "Categoría: " + esc(categoria) + "\n"
            + "Marca: " + esc(marca) + "\n"
            + "Fotos: " + d.getFotos().size(),
            List.of(List.of(TelegramClienteBotService.boton("✅ Publicar producto", "prd:ok")),
                    List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
    }

    private void confirmarProducto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        if (denegarSiNoGestiona(v, empresaId)) return;
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        if (d.getNom() == null || d.getPv() == null || d.getPc() == null || d.getCat() == null || d.getFotos().isEmpty()) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Al borrador le faltan datos. Escribí /menu y empezá de nuevo.");
            return;
        }
        if (!textModerationService.moderar(d.getNom(), d.getDesc()).safe()) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "El contenido del producto no está permitido en la plataforma.");
            return;
        }

        try {
            tenantService.verificarLimiteProductos(empresaId);
            Producto producto = self.crearProductoTx(d, empresaId, v.getUsuario());
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "✅ Producto *" + esc(producto.getNombreProducto()) + "* creado con "
                + d.getFotos().size() + " foto" + (d.getFotos().size() == 1 ? "" : "s") + ".\n\n"
                + "Queda *pendiente de aprobación* del equipo HotClick para publicarse en el catálogo — igual que desde el panel.",
                List.of(List.of(TelegramClienteBotService.boton("📋 Menú", "menu"))));
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo creando producto en chat {} — {}", v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude crear el producto: " + esc(ex.getMessage())
                + "\nEl borrador sigue guardado — tocá *Publicar* para reintentar o /cancelar.",
                List.of(List.of(TelegramClienteBotService.boton("✅ Publicar producto", "prd:ok"),
                                TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        }
    }

    /**
     * Crea el producto + imágenes + solicitud de aprobación en una transacción
     * propia (REQUIRES_NEW): si falla, la transacción del webhook sobrevive para
     * responder al usuario con el borrador intacto.
     *
     * Mismo gobierno que el panel (ProductoController.crearProducto): el producto
     * de un emprendedor nace con visibleCatalogo=false y una SolicitudAprobacion
     * PUBLISH pendiente.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Producto crearProductoTx(TelegramFlujoEstado.ProductoBorrador d, Long empresaId, Usuario usuario) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalStateException("Empresa no encontrada"));

        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setNombreProducto(d.getNom());
        dto.setDescripcionCorta(d.getDesc());
        dto.setPrecioVenta(d.getPv());
        dto.setPrecioCompra(d.getPc());
        dto.setStockActual(d.getStk() != null ? d.getStk() : 0);
        dto.setCategoriaId(d.getCat());
        dto.setMarcaId(d.getMarca());
        dto.setMarcaTexto(d.getMarcaTxt());
        dto.setVisibleCatalogo(false);
        dto.setImagenPrincipalUrl(d.getFotos().isEmpty() ? null : d.getFotos().get(0));

        Producto producto = productoService.crearProducto(dto, usuario.getCorreo(), empresa);
        productoImagenService.sincronizar(producto.getId(), d.getFotos());

        SolicitudAprobacion solicitud = new SolicitudAprobacion();
        solicitud.setTipoEntidad("PRODUCTO");
        solicitud.setAccionSolicitada("PUBLISH");
        solicitud.setIdEntidad(producto.getId());
        solicitud.setEmpresa(empresa);
        solicitud.setUsuarioPide(usuario);
        solicitudAprobacionRepository.save(solicitud);

        return producto;
    }

    // ── FLUJO CLIENTES ────────────────────────────────────────────────────────

    private void callbackClientes(TelegramVinculacion v, Long empresaId, String sub) {
        // La lista expone PII (teléfonos) — mismo nivel de permiso que las escrituras.
        if (denegarSiNoGestiona(v, empresaId)) return;

        if (sub.startsWith("pg:")) {
            Integer pg = parseEntero(sub.substring(3), 0, 10_000);
            mostrarClientes(v, empresaId, pg != null ? pg : 0);
        } else if (sub.startsWith("v:")) {
            Long clienteId = parseLong(sub.substring(2));
            mostrarDetalleCliente(v, empresaId, clienteId);
        } else if (sub.startsWith("ia:")) {
            Long clienteId = parseLong(sub.substring(3));
            if (clienteId == null || !clientePerteneceAEmpresa(clienteId, empresaId)) return;
            bot.enviarMensaje(v.getChatId(), "Analizando su historial… ✍️");
            bot.enviarAccionEscribiendo(v.getChatId());
            self.sugerirCrossSellAsync(v.getChatId(), empresaId, clienteId);
        }
    }

    private void mostrarClientes(TelegramVinculacion v, Long empresaId, int pagina) {
        List<Usuario> todos = usuarioRepository.findClientesByEmpresa(empresaId);
        if (todos.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "Todavía no tenés clientes registrados. Se crean al registrar una venta con cliente o desde el CRM del panel.");
            return;
        }
        int desde = Math.min(pagina * PAGINA, Math.max(0, todos.size() - 1));
        List<Usuario> visibles = todos.subList(desde, Math.min(desde + PAGINA, todos.size()));

        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        visibles.forEach(c -> teclado.add(List.of(
            TelegramClienteBotService.boton(recortar(nombreCompleto(c), 40), "cli:v:" + c.getId()))));
        List<Map<String, Object>> nav = new ArrayList<>();
        if (pagina > 0)                       nav.add(TelegramClienteBotService.boton("⬅️ Anterior", "cli:pg:" + (pagina - 1)));
        if (desde + PAGINA < todos.size())    nav.add(TelegramClienteBotService.boton("Siguiente ➡️", "cli:pg:" + (pagina + 1)));
        if (!nav.isEmpty()) teclado.add(nav);
        teclado.add(List.of(TelegramClienteBotService.boton("📋 Menú", "menu")));

        bot.enviarMensaje(v.getChatId(), "👥 *Tus clientes* (" + todos.size() + ")\nTocá uno para ver su historial:", teclado);
    }

    private void mostrarDetalleCliente(TelegramVinculacion v, Long empresaId, Long clienteId) {
        if (clienteId == null || !clientePerteneceAEmpresa(clienteId, empresaId)) {
            bot.enviarMensaje(v.getChatId(), "Ese cliente no pertenece a tu negocio.");
            return;
        }
        Usuario c = usuarioRepository.findById(clienteId).orElse(null);
        if (c == null) return;

        Map<String, Object> stats = jdbc.queryForMap("""
            SELECT COUNT(*) AS pedidos, COALESCE(SUM(total_pedido), 0) AS total
            FROM hot_click_pedido_tb
            WHERE fk_id_usuario_final = ? AND fk_id_empresa = ?
              AND estado_pedido IN ('PAGADO','ENTREGADO','COMPLETADO')
            """, clienteId, empresaId);

        List<Map<String, Object>> compras = jdbc.queryForList("""
            SELECT pr.nombre_producto, SUM(pi.cantidad) AS unidades, MAX(p.fecha_pedido) AS ultima
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb p   ON pi.fk_id_pedido = p.id_pedido
            JOIN hot_click_producto_tb pr ON pi.fk_id_producto = pr.id_producto
            WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?
              AND p.estado_pedido IN ('PAGADO','ENTREGADO','COMPLETADO')
            GROUP BY pr.nombre_producto
            ORDER BY ultima DESC
            LIMIT 10
            """, clienteId, empresaId);

        StringBuilder sb = new StringBuilder("👤 *" + esc(nombreCompleto(c)) + "*\n");
        if (c.getTelefono() != null && !"00000000".equals(c.getTelefono())) {
            sb.append("📞 ").append(esc(c.getTelefono())).append("\n");
        }
        sb.append("\nCompras en tu negocio: *").append(stats.get("pedidos"))
          .append("* — Total: *").append(colones(stats.get("total"))).append("*\n");
        if (compras.isEmpty()) {
            sb.append("\nTodavía no tiene compras registradas.");
        } else {
            sb.append("\n*Qué te ha comprado:*\n");
            compras.forEach(f -> sb.append("• ").append(esc((String) f.get("nombre_producto")))
                .append(" × ").append(f.get("unidades")).append("\n"));
        }

        bot.enviarMensaje(v.getChatId(), sb.toString(), List.of(
            List.of(TelegramClienteBotService.boton("💡 Sugerir qué ofrecerle", "cli:ia:" + clienteId)),
            List.of(TelegramClienteBotService.boton("⬅️ Clientes", "cli:pg:0"),
                    TelegramClienteBotService.boton("📋 Menú", "menu"))));
    }

    /**
     * Cross-sell con IA fuera del hilo del webhook (la IA puede tardar hasta 25s).
     * Si el proveedor está caído cae al fallback SQL: productos con stock de las
     * categorías que el cliente ya compró y que aún no tiene.
     */
    @Async
    public void sugerirCrossSellAsync(Long chatId, Long empresaId, Long clienteId) {
        try {
            String respuesta = aiCopilotService.crossSellCliente(empresaId, clienteId);
            if (respuesta != null) {
                bot.enviarMensaje(chatId, respuesta, null, false);
                return;
            }
            String fallback = crossSellFallback(empresaId, clienteId);
            if (fallback != null) {
                bot.enviarMensaje(chatId, "La IA no está disponible en este momento — según su historial, podrías ofrecerle:\n\n" + fallback);
            } else {
                bot.enviarMensaje(chatId, "La IA no está disponible y no encontré productos relacionados con su historial para sugerir.");
            }
        } catch (Exception e) {
            log.error("[telegram-flujo] fallo cross-sell chat {} cliente {} — {}", chatId, clienteId, e.getMessage());
            bot.enviarMensaje(chatId, "No pude generar sugerencias en este momento. Intentá de nuevo en unos minutos.");
        }
    }

    private String crossSellFallback(Long empresaId, Long clienteId) {
        List<Map<String, Object>> filas = jdbc.queryForList("""
            SELECT pr.nombre_producto, pr.precio_venta
            FROM hot_click_producto_tb pr
            WHERE pr.fk_id_empresa = ? AND pr.fk_id_estado = 1 AND pr.visible_catalogo = TRUE
              AND (pr.stock_actual - COALESCE(pr.stock_reservado, 0)) > 0
              AND pr.fk_id_categoria IN (
                  SELECT DISTINCT pr2.fk_id_categoria
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p    ON pi.fk_id_pedido = p.id_pedido
                  JOIN hot_click_producto_tb pr2 ON pi.fk_id_producto = pr2.id_producto
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
              AND pr.id_producto NOT IN (
                  SELECT pi.fk_id_producto
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
            ORDER BY pr.id_producto DESC
            LIMIT 5
            """, empresaId, clienteId, empresaId, clienteId, empresaId);
        if (filas.isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        filas.forEach(f -> sb.append("• ").append(esc((String) f.get("nombre_producto")))
            .append(" — ").append(colones(f.get("precio_venta"))).append("\n"));
        return sb.toString();
    }

    // ── FLUJO ACCION (propuesta de mutación del chat de IA, propose→confirm→execute) ──

    /**
     * Registra una acción propuesta por el chat de IA como el borrador pendiente del
     * chat (mismo slot único que venta/producto/ajuste) y la muestra con botones
     * Confirmar/Cancelar. Nunca la ejecuta — eso solo pasa si el usuario confirma.
     */
    public void proponerAccion(TelegramVinculacion v, AccionPropuestaTelegram accion) {
        TelegramFlujoEstado e = TelegramFlujoEstado.nuevaAccion(
            ahora(), accion.tipo(), accion.entidadId(), accion.params(), accion.resumen());
        guardar(v, e);
        bot.enviarMensaje(v.getChatId(), accion.resumen(), List.of(
            List.of(TelegramClienteBotService.boton("✅ Confirmar", "acn:ok"),
                    TelegramClienteBotService.boton("❌ Cancelar", "acn:no"))));
    }

    private void callbackAccion(TelegramVinculacion v, Long empresaId, String sub) {
        if ("no".equals(sub)) { cancelar(v); return; }
        if ("ok".equals(sub)) { confirmarAccion(v, empresaId); }
    }

    private void confirmarAccion(TelegramVinculacion v, Long empresaId) {
        Optional<TelegramFlujoEstado> opt = TelegramFlujoEstado.deserializar(v.getContexto(), objectMapper);
        if (opt.isEmpty() || !FLUJO_ACCION.equals(opt.get().getF())) {
            bot.enviarMensaje(v.getChatId(), "Esa propuesta ya no está vigente. Escribí /menu para empezar de nuevo.");
            return;
        }
        TelegramFlujoEstado e = opt.get();
        if (e.vencido(ahora())) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Esa propuesta venció. Pedime de nuevo lo que necesitás.");
            return;
        }
        // Defensa en profundidad: re-validar permiso al confirmar, no solo al proponer
        // (el usuario pudo cambiar de rol o de empresa activa entre medio).
        if (denegarSiNoGestiona(v, empresaId)) return;

        try {
            switch (e.getAcc()) {
                case AccionPropuestaTelegram.PEDIDO_ESTADO   -> confirmarCambiarEstadoPedido(v, empresaId, e);
                case AccionPropuestaTelegram.PEDIDO_GUIA     -> confirmarAsignarGuia(v, empresaId, e);
                case AccionPropuestaTelegram.STOCK_AJUSTE    -> confirmarAjustarStock(v, empresaId, e);
                case AccionPropuestaTelegram.PRODUCTO_OFERTA -> confirmarAplicarOferta(v, empresaId, e);
                default -> {
                    limpiar(v);
                    bot.enviarMensaje(v.getChatId(), "No reconozco esa acción. Escribí /menu.");
                }
            }
        } catch (RecursoNoEncontradoException ex) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ya no encuentro ese registro — puede que haya cambiado. Pedime de nuevo lo que necesitás.");
        } catch (OptimisticLockingFailureException ex) {
            // El borrador NO se limpia — mismo patrón de resiliencia que confirmarProducto:
            // el usuario solo tiene que volver a tocar Confirmar para reintentar.
            bot.enviarMensaje(v.getChatId(), "El registro cambió justo ahora. Tocá *Confirmar* de nuevo para reintentar, o *Cancelar*.");
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo confirmando acción en chat {} — {}", v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude aplicar el cambio: " + esc(ex.getMessage()) + "\nReintentá o tocá *Cancelar*.");
        }
    }

    private void confirmarCambiarEstadoPedido(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        Pedido pedido = pedidoRepository.findById(e.getEid())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        if (pedido.getEmpresa() == null || !empresaId.equals(pedido.getEmpresa().getId())) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese pedido ya no pertenece a este negocio.");
            return;
        }
        String nuevoEstado = (String) e.getPar().get("nuevoEstado");
        String nota = (String) e.getPar().get("nota");
        Pedido actualizado = self.cambiarEstadoPedidoTx(e.getEid(), nuevoEstado, nota);
        limpiar(v);
        bot.enviarMensaje(v.getChatId(), "✅ Pedido *" + esc(actualizado.getNumeroPedido())
            + "* actualizado a *" + nuevoEstado + "*.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Pedido cambiarEstadoPedidoTx(Long pedidoId, String nuevoEstado, String nota) {
        return pedidoService.cambiarEstado(pedidoId, nuevoEstado, nota);
    }

    private void confirmarAsignarGuia(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        Pedido pedido = pedidoRepository.findById(e.getEid())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        if (pedido.getEmpresa() == null || !empresaId.equals(pedido.getEmpresa().getId())) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese pedido ya no pertenece a este negocio.");
            return;
        }
        String numeroGuia = (String) e.getPar().get("numeroGuia");
        Pedido actualizado = self.asignarGuiaTx(e.getEid(), numeroGuia);
        limpiar(v);
        bot.enviarMensaje(v.getChatId(), "✅ Guía *" + esc(numeroGuia) + "* asignada al pedido *"
            + esc(actualizado.getNumeroPedido()) + "*. Se notificó al cliente por email.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Pedido asignarGuiaTx(Long pedidoId, String numeroGuia) {
        return pedidoService.asignarGuia(pedidoId, numeroGuia);
    }

    private void confirmarAjustarStock(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            e.getEid(), empresaId);
        if (filas.isEmpty()) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese producto ya no pertenece a este negocio.");
            return;
        }
        int cantidadReal = ((Number) e.getPar().get("cantidadReal")).intValue();
        self.ajustarStockTx(e.getEid(), cantidadReal, v.getUsuario().getCorreo());
        limpiar(v);
        bot.enviarMensaje(v.getChatId(), "✅ Stock de *" + esc(String.valueOf(filas.get(0).get("nombre_producto")))
            + "* ajustado a *" + cantidadReal + "* unidades.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ajustarStockTx(Long productoId, int cantidadReal, String operadorCorreo) {
        stockService.ajustarAExistencia(productoId, cantidadReal, "telegram-ia", operadorCorreo);
    }

    private void confirmarAplicarOferta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            e.getEid(), empresaId);
        if (filas.isEmpty()) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese producto ya no pertenece a este negocio.");
            return;
        }
        Map<String, Object> par = e.getPar();
        boolean enOferta = Boolean.TRUE.equals(par.get("enOferta"));
        Integer pct    = par.get("porcentajeDescuento") != null ? ((Number) par.get("porcentajeDescuento")).intValue() : null;
        Integer precio = par.get("precioOferta") != null ? ((Number) par.get("precioOferta")).intValue() : null;
        self.aplicarOfertaTx(e.getEid(), enOferta, pct, precio);
        limpiar(v);
        bot.enviarMensaje(v.getChatId(), enOferta
            ? "✅ Oferta aplicada a *" + esc(String.valueOf(filas.get(0).get("nombre_producto"))) + "*."
            : "✅ Oferta retirada de *" + esc(String.valueOf(filas.get(0).get("nombre_producto"))) + "*.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void aplicarOfertaTx(Long productoId, boolean enOferta, Integer porcentajeDescuento, Integer precioOferta) {
        productoService.aplicarOferta(productoId, enOferta, porcentajeDescuento, precioOferta);
    }

    // ── Helpers comunes ───────────────────────────────────────────────────────

    /** true si NO puede gestionar (y ya se le avisó). */
    private boolean denegarSiNoGestiona(TelegramVinculacion v, Long empresaId) {
        if (esPropietarioOAdmin(v.getUsuario(), empresaId)) return false;
        bot.enviarMensaje(v.getChatId(), "Solo el propietario o un administrador del negocio puede usar esta función.");
        return true;
    }

    private boolean clientePerteneceAEmpresa(Long clienteId, Long empresaId) {
        if (pedidoRepository.existsByUsuarioFinalIdAndEmpresaId(clienteId, empresaId)) return true;
        return usuarioRepository.findById(clienteId)
            .map(u -> u.getEmpresaRegistro() != null && empresaId.equals(u.getEmpresaRegistro().getId()))
            .orElse(false);
    }

    /**
     * Borrador vigente del chat, o null (avisando al usuario) si no hay, está
     * corrupto o venció.
     */
    private TelegramFlujoEstado estadoVigente(TelegramVinculacion v) {
        Optional<TelegramFlujoEstado> opt = TelegramFlujoEstado.deserializar(v.getContexto(), objectMapper);
        if (opt.isEmpty()) {
            if (TelegramFlujoEstado.esBorrador(v.getContexto())) {
                limpiar(v);
                bot.enviarMensaje(v.getChatId(), "Se perdió el borrador anterior. Escribí /menu para empezar de nuevo.");
            }
            return null;
        }
        if (opt.get().vencido(ahora())) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese borrador venció. Escribí /menu para empezar de nuevo.");
            return null;
        }
        return opt.get();
    }

    private void guardar(TelegramVinculacion v, TelegramFlujoEstado e) {
        v.setContexto(e.serializar(objectMapper));
        vinculacionRepository.save(v);
    }

    private void limpiar(TelegramVinculacion v) {
        v.setContexto(null);
        vinculacionRepository.save(v);
    }

    private void cancelar(TelegramVinculacion v) {
        limpiar(v);
        bot.enviarMensaje(v.getChatId(), "Listo, cancelado. Escribí /menu cuando me necesités.");
    }

    private LocalDateTime ahora() {
        return LocalDateTime.now(Constants.ZONA_CR);
    }

    private String nombreCompleto(Usuario u) {
        String nombre = u.getNombre() != null ? u.getNombre() : "";
        String apellido = u.getApellidoPaterno() != null ? u.getApellidoPaterno() : "";
        return (nombre + " " + apellido).trim();
    }

    /** "Ana Mora 8888-8888" → ["Ana Mora", "8888-8888"]; sin teléfono → ["texto completo", null]. */
    static String[] separarNombreTelefono(String texto) {
        String limpio = texto.trim();
        java.util.regex.Matcher m = java.util.regex.Pattern
            .compile("^(.*?)\\s*([\\d][\\d\\-\\s]{6,})$").matcher(limpio);
        if (m.matches() && !m.group(1).isBlank()) {
            return new String[]{m.group(1).trim(), m.group(2).trim()};
        }
        return new String[]{limpio, null};
    }

    /** Parsea un entero tolerando ₡, puntos, comas y espacios; null si no cumple el rango. */
    static Integer parseEntero(String texto, int min, int max) {
        if (texto == null) return null;
        String limpio = texto.replaceAll("[₡.,\\s]", "");
        if (limpio.isEmpty() || !limpio.matches("\\d{1,9}")) return null;
        int valor = Integer.parseInt(limpio);
        return (valor >= min && valor <= max) ? valor : null;
    }

    private static Long parseLong(String texto) {
        try {
            return Long.parseLong(texto.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static String recortar(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private static String colones(Object monto) {
        long valor = monto instanceof Number n ? n.longValue() : 0;
        return String.format("₡%,d", valor);
    }

    /** Quita caracteres que rompen el Markdown de Telegram en valores dinámicos. */
    private static String esc(String s) {
        return s == null ? "" : s.replaceAll("[*_`\\[\\]]", "");
    }
}
