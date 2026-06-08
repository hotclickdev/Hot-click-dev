package com.hotclick.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Lógica de negocio para sesiones de pago QR del POS.
 * El cajero crea la sesión, el cliente escanea y paga (SINPE o Stripe).
 */
@Service
public class PosQrService {

    private static final Logger log = LoggerFactory.getLogger(PosQrService.class);

    @Autowired private PosQrSesionRepository  posQrRepo;
    @Autowired private UsuarioRepository       usuarioRepo;
    @Autowired private EmpresaRepository       empresaRepo;
    @Autowired private TurnoCajaRepository     turnoCajaRepo;
    @Autowired private ProductoRepository      productoRepo;
    @Autowired private PedidoRepository        pedidoRepo;
    @Autowired private BodegaRepository        bodegaRepo;
    @Autowired private StockService            stockService;
    @Autowired private TurnoCajaService        turnoCajaService;
    @Autowired private StripeService           stripeService;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    private final ObjectMapper mapper = new ObjectMapper();

    // ─── Crear sesión (cajero) ────────────────────────────────────────────────

    @Transactional
    public PosQrSesion crearSesion(Long usuarioId, Long empresaId, Long turnoId,
                                   String metodoPago, List<Map<String, Object>> items,
                                   String notas) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("El carrito no puede estar vacío");
        }
        if (!"SINPE".equals(metodoPago) && !"TARJETA".equals(metodoPago)) {
            throw new IllegalArgumentException("Método de pago debe ser SINPE o TARJETA");
        }

        Usuario usuario  = usuarioRepo.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        Empresa empresa  = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        int total = items.stream()
            .mapToInt(i -> ((Number) i.getOrDefault("precioUnitario", 0)).intValue()
                        * ((Number) i.getOrDefault("cantidad", 1)).intValue())
            .sum();

        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken(UUID.randomUUID().toString().replace("-", ""));
        sesion.setEmpresa(empresa);
        sesion.setUsuario(usuario);
        sesion.setTotal(total);
        sesion.setMetodoPago(metodoPago);
        sesion.setEstado("PENDIENTE");
        sesion.setFechaCreacion(LocalDateTime.now());
        sesion.setFechaExpiracion(LocalDateTime.now().plusMinutes(30));
        sesion.setNotas(notas);

        if (turnoId != null) {
            turnoCajaRepo.findById(turnoId).ifPresent(sesion::setTurno);
        }

        try {
            sesion.setItemsJson(mapper.writeValueAsString(items));
        } catch (Exception e) {
            throw new RuntimeException("Error serializando items");
        }

        PosQrSesion saved = posQrRepo.save(sesion);
        log.info("[POS-QR] Sesión {} creada por usuario={} empresa={} método={} total={}",
            saved.getToken(), usuarioId, empresaId, metodoPago, total);
        return saved;
    }

    // ─── Info pública (cliente escanea QR) ───────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getInfoPublica(String token) {
        PosQrSesion sesion = findSesionActiva(token);
        Empresa empresa = sesion.getEmpresa();

        List<Map<String, Object>> items;
        try {
            items = mapper.readValue(sesion.getItemsJson(), new TypeReference<>() {});
        } catch (Exception e) {
            items = List.of();
        }

        String sinpeNumero = empresa.getNumeroWhatsapp() != null
            ? empresa.getNumeroWhatsapp() : "50689745370";

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("token",        sesion.getToken());
        r.put("estado",       sesion.getEstado());
        r.put("metodoPago",   sesion.getMetodoPago());
        r.put("total",        sesion.getTotal());
        r.put("items",        items);
        r.put("expiracion",   sesion.getFechaExpiracion().toString());
        r.put("empresaNombre", empresa.getNombreComercial() != null
            ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        r.put("logoUrl",      empresa.getLogoUrl());
        r.put("colorPrimario", empresa.getColorPrimario());
        // SINPE: número de teléfono y referencia (primeros 8 chars del token)
        r.put("sinpeNumero",  sinpeNumero);
        r.put("sinpeRef",     sesion.getToken().substring(0, 8).toUpperCase());
        return r;
    }

    // ─── Stripe checkout (cliente) ────────────────────────────────────────────

    @Transactional
    public String crearStripeCheckout(String token) {
        PosQrSesion sesion = findSesionActiva(token);
        if (!"TARJETA".equals(sesion.getMetodoPago())) {
            throw new IllegalStateException("Esta sesión no es de pago con tarjeta");
        }

        String successUrl = appUrl + "/pos/pago/" + token + "?resultado=exito";
        String cancelUrl  = appUrl + "/pos/pago/" + token + "?resultado=cancelado";

        try {
            List<Map<String, Object>> items = mapper.readValue(
                sesion.getItemsJson(), new TypeReference<>() {});

            String checkoutUrl = stripeService.crearCheckoutPOS(
                sesion.getTotal(), items, successUrl, cancelUrl,
                sesion.getEmpresa().getId(), token);

            // Guardar stripe_session_id se hace dentro del crearCheckoutPOS
            // El token ya está en los metadatos de la sesión Stripe
            posQrRepo.save(sesion);
            return checkoutUrl;
        } catch (Exception e) {
            log.error("[POS-QR] Error creando Stripe checkout para token={}: {}", token, e.getMessage());
            throw new RuntimeException("Error al crear sesión de pago: " + e.getMessage());
        }
    }

    // ─── Verificar estado (polling) ───────────────────────────────────────────

    @Transactional
    public String verificarEstado(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if ("PAGADO".equals(sesion.getEstado()) || "CANCELADO".equals(sesion.getEstado())) {
            return sesion.getEstado();
        }

        // Verificar expiración
        if (LocalDateTime.now().isAfter(sesion.getFechaExpiracion())) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            return "EXPIRADO";
        }

        // Para TARJETA: verificar con Stripe si el stripe_session_id existe y está pagado
        if ("TARJETA".equals(sesion.getMetodoPago()) && sesion.getStripeSessionId() != null) {
            try {
                boolean pagado = stripeService.checkoutSessionPagada(sesion.getStripeSessionId());
                if (pagado) {
                    completarVentaTarjeta(sesion);
                    return "PAGADO";
                }
            } catch (Exception e) {
                log.warn("[POS-QR] Error verificando Stripe session {}: {}", sesion.getStripeSessionId(), e.getMessage());
            }
        }

        return sesion.getEstado();
    }

    // ─── Confirmar SINPE (cajero) ─────────────────────────────────────────────

    @Transactional
    public PosQrSesion confirmarSinpe(String token, Long usuarioId, Long empresaId, String notas) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if (!"PENDIENTE".equals(sesion.getEstado())) {
            throw new IllegalStateException("La sesión no está pendiente (estado: " + sesion.getEstado() + ")");
        }
        if (!sesion.getEmpresa().getId().equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }

        completarVentaSinpe(sesion, usuarioId, notas);
        return sesion;
    }

    // ─── Cancelar (cajero) ────────────────────────────────────────────────────

    @Transactional
    public void cancelar(String token, Long empresaId) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));
        if (!sesion.getEmpresa().getId().equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }
        sesion.setEstado("CANCELADO");
        posQrRepo.save(sesion);
    }

    // ─── helpers privados ─────────────────────────────────────────────────────

    private PosQrSesion findSesionActiva(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("QR no encontrado"));
        if ("EXPIRADO".equals(sesion.getEstado()) || "CANCELADO".equals(sesion.getEstado())) {
            throw new NoSuchElementException("El QR ha expirado o fue cancelado");
        }
        if (LocalDateTime.now().isAfter(sesion.getFechaExpiracion()) && "PENDIENTE".equals(sesion.getEstado())) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            throw new NoSuchElementException("El QR ha expirado");
        }
        return sesion;
    }

    @Transactional
    protected void completarVentaTarjeta(PosQrSesion sesion) {
        crearPedidoPOS(sesion, "TARJETA");
    }

    @Transactional
    protected void completarVentaSinpe(PosQrSesion sesion, Long usuarioId, String notas) {
        if (notas != null) sesion.setNotas(notas);
        crearPedidoPOS(sesion, "SINPE");
    }

    private void crearPedidoPOS(PosQrSesion sesion, String metodoPago) {
        try {
            List<Map<String, Object>> items = mapper.readValue(
                sesion.getItemsJson(), new TypeReference<>() {});

            Empresa empresa  = sesion.getEmpresa();
            Long empresaId   = empresa.getId();
            String correo    = sesion.getUsuario().getCorreo();

            Usuario cliente  = usuarioRepo.findById(999L)
                .orElseThrow(() -> new RuntimeException("Usuario mostrador no encontrado"));
            Bodega bodega    = bodegaRepo.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO).stream().findFirst()
                .orElseThrow(() -> new RuntimeException("No hay bodega configurada"));

            Pedido pedido = new Pedido();
            pedido.setNumeroPedido(Constants.generarNumeroPedido("POS-QR-"));
            pedido.setFechaPedido(LocalDateTime.now());
            pedido.setUsuarioFinal(cliente);
            pedido.setBodega(bodega);
            pedido.setEmpresa(empresa);
            pedido.setOrigen("POS");
            pedido.setEstadoPedido("ENTREGADO");
            pedido.setMetodoEnvio("RETIRO");
            pedido.setMetodoPago(metodoPago);
            pedido.setCostoEnvio(0);
            pedido.setDescuentoTotal(0);
            pedido.setAplicaImpuesto(false);
            pedido.setMontoImpuesto(0);
            pedido.setEstado(Constants.ESTADO_ACTIVO);

            int subtotal = 0;
            int costoTotal = 0;
            List<PedidoItem> pedidoItems = new ArrayList<>();

            for (Map<String, Object> itemMap : items) {
                Long productoId = ((Number) itemMap.get("productoId")).longValue();
                int cantidad    = ((Number) itemMap.getOrDefault("cantidad", 1)).intValue();
                int precio      = ((Number) itemMap.getOrDefault("precioUnitario", 0)).intValue();

                Producto producto = productoRepo.findByIdForUpdate(productoId)
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productoId));

                if (producto.getStockDisponible() < cantidad) {
                    throw new RuntimeException("Stock insuficiente para " + producto.getNombreProducto());
                }

                stockService.descontarPorVentaPOS(producto, cantidad, pedido.getNumeroPedido(), correo);

                PedidoItem pi = new PedidoItem();
                pi.setPedido(pedido);
                pi.setProducto(producto);
                pi.setCantidad(cantidad);
                pi.setPrecioUnitarioMomento(precio);
                pi.setCostoUnitarioMomento(producto.getPrecioCompra());
                pi.setSubtotalItem(precio * cantidad);
                pi.setUtilidadItem((precio - producto.getPrecioCompra()) * cantidad);
                pi.setDescuentoAplicado(0);
                pi.setEstado(Constants.ESTADO_ACTIVO);
                pedidoItems.add(pi);

                subtotal   += precio * cantidad;
                costoTotal += producto.getPrecioCompra() * cantidad;
            }

            int totalPedido   = subtotal;
            int utilidad      = totalPedido - costoTotal;
            pedido.setItems(pedidoItems);
            pedido.setSubtotal(subtotal);
            pedido.setTotalPedido(totalPedido);
            pedido.setCostoTotalProductos(costoTotal);
            pedido.setUtilidadBruta(utilidad);
            pedido.setMargenGananciaPedido(
                costoTotal > 0
                    ? java.math.BigDecimal.valueOf(utilidad * 100.0 / costoTotal)
                        .setScale(2, java.math.RoundingMode.HALF_UP)
                    : java.math.BigDecimal.ZERO);

            Pedido saved = pedidoRepo.save(pedido);

            sesion.setEstado("PAGADO");
            sesion.setPedidoId(saved.getId());
            posQrRepo.save(sesion);

            // Actualizar turno si está abierto
            if (sesion.getTurno() != null) {
                try {
                    turnoCajaService.actualizarTotales(
                        sesion.getTurno().getId(), metodoPago, totalPedido);
                } catch (Exception e) {
                    log.warn("[POS-QR] No se pudo actualizar turno: {}", e.getMessage());
                }
            }

            log.info("[POS-QR] Venta {} registrada — método={} total={}", saved.getNumeroPedido(), metodoPago, totalPedido);

        } catch (Exception e) {
            log.error("[POS-QR] Error creando pedido POS: {}", e.getMessage(), e);
            throw new RuntimeException("Error al registrar la venta: " + e.getMessage());
        }
    }
}
