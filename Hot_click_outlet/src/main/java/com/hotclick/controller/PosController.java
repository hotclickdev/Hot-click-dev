package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.PosVentaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.StockService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/pos")
public class PosController {

    private static final Logger log = LoggerFactory.getLogger(PosController.class);

    @Autowired private JwtUtil            jwtUtil;
    @Autowired private UsuarioRepository  usuarioRepository;
    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired private BodegaRepository   bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository   pedidoRepository;
    @Autowired private StockService       stockService;
    @Autowired private TurnoCajaService   turnoCajaService;
    @Autowired private CacheManager       cacheManager;
    @Autowired private com.hotclick.security.CompanyScope companyScope;
    @Autowired private com.hotclick.service.TenantService tenantService;
    @Autowired private com.hotclick.service.TelegramNotificacionClienteService telegramNotificacionClienteService;

    @PostMapping("/venta")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    @Transactional
    public ResponseEntity<?> crearVenta(@RequestBody PosVentaDTO dto, HttpServletRequest request) {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("pos"))
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "El punto de venta requiere un plan PYME o superior. Ve a Configuración → Suscripción para mejorar tu plan."));
        try {
            Long usuarioId = extractUserId(request);
            Long empresaId = extractEmpresaId(request);
            String correo  = jwtUtil.extractUsername(request.getHeader("Authorization").substring(7));

            if (dto.getItems() == null || dto.getItems().isEmpty()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("El carrito no puede estar vacío"));
            }

            // ── Resolver usuario cliente ──────────────────────────────────
            Long clienteId = dto.getClienteId() != null ? dto.getClienteId() : 999L;
            Usuario cliente = usuarioRepository.findById(clienteId)
                .orElseGet(() -> usuarioRepository.findById(999L)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Usuario mostrador (id=999) no encontrado")));

            // ── Resolver bodega ───────────────────────────────────────────
            Long bodegaId = dto.getBodegaId() != null ? dto.getBodegaId() : 1L;
            Bodega bodega = bodegaRepository.findById(bodegaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega", bodegaId));

            // ── Resolver empresa ──────────────────────────────────────────
            Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));

            // ── Construir pedido ──────────────────────────────────────────
            Pedido pedido = new Pedido();
            pedido.setNumeroPedido(com.hotclick.utils.Constants.generarNumeroPedido("POS-"));
            pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
            pedido.setUsuarioFinal(cliente);
            pedido.setBodega(bodega);
            pedido.setEmpresa(empresa);
            pedido.setOrigen("POS");
            pedido.setEstadoPedido("ENTREGADO");
            pedido.setMetodoEnvio("RETIRO");
            pedido.setMetodoPago(dto.getMetodoPago() != null ? dto.getMetodoPago() : "EFECTIVO");
            pedido.setCostoEnvio(0);
            pedido.setDescuentoTotal(dto.getDescuentoGlobal() != null ? dto.getDescuentoGlobal() : 0);
            pedido.setAplicaImpuesto(false);
            pedido.setMontoImpuesto(0);
            pedido.setEstado(Constants.ESTADO_ACTIVO);
            if (dto.getNotas() != null) pedido.setNotas(dto.getNotas());

            // ── Procesar ítems y stock ────────────────────────────────────
            int subtotal = 0;
            int costoTotal = 0;
            List<PedidoItem> items = new ArrayList<>();

            for (PosVentaDTO.Item itemDto : dto.getItems()) {
                Producto producto = productoRepository.findByIdForUpdate(itemDto.getProductoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Producto", itemDto.getProductoId()));

                int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;
                int precio   = itemDto.getPrecioUnitario() != null
                    ? itemDto.getPrecioUnitario() : producto.getPrecioEfectivo();
                int costo    = producto.getPrecioCompra();

                int disponible = producto.getStockDisponible();
                if (disponible < cantidad) {
                    return ResponseEntity.badRequest().body(ResponseDTO.error(
                        "Stock insuficiente para '" + producto.getNombreProducto()
                        + "'. Disponible: " + disponible));
                }

                stockService.descontarPorVentaPOS(producto, cantidad,
                    pedido.getNumeroPedido(), correo);

                PedidoItem item = new PedidoItem();
                item.setPedido(pedido);
                item.setProducto(producto);
                item.setCantidad(cantidad);
                item.setPrecioUnitarioMomento(precio);
                item.setCostoUnitarioMomento(costo);
                item.setSubtotalItem(precio * cantidad);
                item.setUtilidadItem((precio - costo) * cantidad);
                item.setDescuentoAplicado(0);
                item.setEstado(Constants.ESTADO_ACTIVO);
                items.add(item);

                subtotal   += precio * cantidad;
                costoTotal += costo  * cantidad;
            }

            // ── Calcular totales ──────────────────────────────────────────
            int descuento    = pedido.getDescuentoTotal();
            int totalPedido  = subtotal - descuento;
            int utilidadBruta = totalPedido - costoTotal;
            BigDecimal margen = costoTotal > 0
                ? BigDecimal.valueOf(utilidadBruta * 100.0 / costoTotal).setScale(2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

            pedido.setItems(items);
            pedido.setSubtotal(subtotal);
            pedido.setTotalPedido(totalPedido);
            pedido.setCostoTotalProductos(costoTotal);
            pedido.setUtilidadBruta(utilidadBruta);
            pedido.setMargenGananciaPedido(margen);

            Pedido saved = pedidoRepository.save(pedido);
            saved.getItems().size(); // forzar inicialización dentro de la transacción
            evictDashboard(empresaId);

            // ── Actualizar turno si está abierto ──────────────────────────
            try {
                Optional<TurnoCaja> turnoOpt = turnoCajaService.getTurnoActivo(usuarioId);
                turnoOpt.ifPresent(t -> turnoCajaService.actualizarTotales(
                    t.getId(), pedido.getMetodoPago(), totalPedido));
            } catch (Exception e) {
                log.warn("[POS] No se pudo actualizar turno para venta {}: {}", saved.getId(), e.getMessage());
            }

            telegramNotificacionClienteService.notificarVenta(empresaId, saved.getNumeroPedido(),
                totalPedido, saved.getMetodoPago(), cliente.getNombre(), "POS");

            log.info("[POS] Venta {} creada por usuario {} — total ₡{}", saved.getNumeroPedido(), usuarioId, totalPedido);
            return ResponseEntity.ok(ResponseDTO.success("Venta registrada", saved));

        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[POS] Error al crear venta: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al procesar la venta"));
        }
    }

    @GetMapping("/historial")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> historialVentas(HttpServletRequest request) {
        try {
            Long empresaId = extractEmpresaId(request);
            List<com.hotclick.model.Pedido> ventas = pedidoRepository
                .findByEmpresaIdAndOrigenOrderByFechaPedidoDesc(empresaId, "POS");
            return ResponseEntity.ok(ResponseDTO.success("OK", ventas));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al cargar historial"));
        }
    }

    @SuppressWarnings("null")
    private void evictDashboard(Long empresaId) {
        Cache c = cacheManager.getCache("dashboard-metricas");
        if (c == null) return;
        if (empresaId != null) {
            c.evict(empresaId.toString());
        } else {
            c.evict("global");
        }
    }

    private Long extractUserId(HttpServletRequest request) {
        return jwtUtil.extractUserId(request.getHeader("Authorization").substring(7));
    }

    private Long extractEmpresaId(HttpServletRequest request) {
        Long id = jwtUtil.extractEmpresaId(request.getHeader("Authorization").substring(7));
        if (id == null) throw new IllegalStateException("No hay empresa en el token");
        return id;
    }
}
