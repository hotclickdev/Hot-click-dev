package com.hotclick.service;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SelfCheckoutService {

    private static final Logger log = LoggerFactory.getLogger(SelfCheckoutService.class);

    private final MesaRepository     mesaRepo;
    private final PedidoRepository   pedidoRepo;
    private final ProductoRepository  productoRepo;
    private final BodegaRepository    bodegaRepo;
    private final UsuarioRepository   usuarioRepo;
    private final CacheManager        cacheManager;
    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    public SelfCheckoutService(MesaRepository mesaRepo, PedidoRepository pedidoRepo,
                               ProductoRepository productoRepo, BodegaRepository bodegaRepo,
                               UsuarioRepository usuarioRepo, CacheManager cacheManager) {
        this.mesaRepo    = mesaRepo;
        this.pedidoRepo  = pedidoRepo;
        this.productoRepo = productoRepo;
        this.bodegaRepo  = bodegaRepo;
        this.usuarioRepo = usuarioRepo;
        this.cacheManager = cacheManager;
    }

    /** Info pública de la mesa + empresa (para la landing del QR). */
    @Transactional(readOnly = true)
    public Map<String, Object> getMesaInfo(String token) {
        Mesa mesa = findMesaActiva(token);
        Empresa empresa = mesa.getEmpresa();

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("mesaId",       mesa.getId());
        r.put("mesaNombre",   mesa.getNombre());
        r.put("mesaTipo",     mesa.getTipo());
        r.put("empresaId",    empresa.getId());
        r.put("empresaNombre", empresa.getNombreComercial() != null
                ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        r.put("logoUrl",      empresa.getLogoUrl());
        r.put("colorPrimario", empresa.getColorPrimario());
        r.put("colorSecundario", empresa.getColorSecundario());
        r.put("numeroWhatsapp", empresa.getNumeroWhatsapp());
        r.put("qrUrl", appUrl + "/checkout/qr/" + token);
        return r;
    }

    /** Catálogo de productos activos de la empresa de la mesa. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCatalogo(String token) {
        Mesa mesa = findMesaActiva(token);
        List<Producto> productos = productoRepo.findActivosByEmpresaId(mesa.getEmpresa().getId());
        return productos.stream()
            .filter(p -> p.getStockActual() == null || p.getStockActual() > 0)
            .map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",             p.getId());
                m.put("nombre",         p.getNombreProducto());
                m.put("descripcion",    p.getDescripcionCorta());
                m.put("precio",         p.getPrecioVenta());
                m.put("imagenUrl",      p.getImagenPrincipalUrl());
                m.put("stock",          p.getStockActual());
                m.put("sku",            p.getSku());
                m.put("categoria",      p.getCategoria() != null ? p.getCategoria().getNombreCategoria() : null);
                return m;
            }).toList();
    }

    /**
     * Crea un pedido desde el terminal de autoservicio.
     * No requiere autenticación — el usuarioFinal es el primer usuario activo de la empresa
     * (referencia interna; el cliente real se registra en clienteNombre/clienteTel).
     */
    @Transactional
    public Map<String, Object> crearPedido(String token, String clienteNombre, String clienteTel,
                                           String notas, List<Map<String, Object>> items) {
        Mesa mesa = findMesaActiva(token);
        Empresa empresa = mesa.getEmpresa();

        // Buscar usuario proxy (primer usuario de la empresa)
        List<Usuario> usuarios = usuarioRepo.findByEmpresaIdOrderByIdDesc(empresa.getId());
        if (usuarios.isEmpty())
            throw new IllegalStateException("La empresa no tiene usuarios configurados");
        Usuario proxy = usuarios.get(usuarios.size() - 1); // el más antiguo

        // Bodega principal de la empresa
        List<Bodega> bodegas = bodegaRepo.findByEmpresaIdAndEstado(empresa.getId(), 1);
        if (bodegas.isEmpty())
            throw new IllegalStateException("La empresa no tiene bodegas activas");
        Bodega bodega = bodegas.get(0);

        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("QR-"));
        pedido.setFechaPedido(LocalDateTime.now());
        pedido.setUsuarioFinal(proxy);
        pedido.setBodega(bodega);
        pedido.setEmpresa(empresa);
        pedido.setOrigen("QR");
        pedido.setMesaNombre(mesa.getNombre());
        pedido.setClienteNombre(clienteNombre);
        pedido.setClienteTel(clienteTel);
        pedido.setNotas(notas);
        pedido.setMetodoEnvio("EN_TIENDA");
        pedido.setMetodoPago("EFECTIVO");
        pedido.setCostoEnvio(0);
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setDescuentoTotal(0);
        pedido.setAplicaImpuesto(false);
        pedido.setMontoImpuesto(0);
        pedido.setEstado(Constants.ESTADO_ACTIVO);

        int subtotal = 0, costoTotal = 0;
        List<PedidoItem> pedidoItems = new ArrayList<>();

        for (Map<String, Object> item : items) {
            Long productoId = ((Number) item.get("productoId")).longValue();
            int cantidad    = ((Number) item.get("cantidad")).intValue();

            Producto producto = productoRepo.findById(productoId)
                .orElseThrow(() -> new NoSuchElementException("Producto " + productoId + " no encontrado"));

            if (!producto.getEmpresa().getId().equals(empresa.getId()))
                throw new SecurityException("Producto no pertenece a esta empresa");

            int precio = producto.getPrecioVenta();
            int costo  = producto.getPrecioCompra() != null ? producto.getPrecioCompra() : 0;

            PedidoItem pi = new PedidoItem();
            pi.setPedido(pedido);
            pi.setProducto(producto);
            pi.setCantidad(cantidad);
            pi.setPrecioUnitarioMomento(precio);
            pi.setCostoUnitarioMomento(costo);
            pi.setSubtotalItem(precio * cantidad);
            pi.setUtilidadItem((precio - costo) * cantidad);
            pi.setDescuentoAplicado(0);
            pi.setEstado(Constants.ESTADO_ACTIVO);
            pedidoItems.add(pi);

            subtotal   += precio * cantidad;
            costoTotal += costo  * cantidad;
        }

        if (pedidoItems.isEmpty())
            throw new IllegalArgumentException("El pedido debe tener al menos un producto");

        pedido.setItems(pedidoItems);
        pedido.setSubtotal(subtotal);
        pedido.setTotalPedido(subtotal);
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal);

        Pedido saved = pedidoRepo.save(pedido);
        evictDashboard(empresa.getId());
        log.info("[self-checkout] Pedido {} creado desde mesa='{}' empresa={}",
            saved.getNumeroPedido(), mesa.getNombre(), empresa.getId());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("pedidoId",     saved.getId());
        result.put("numeroPedido", saved.getNumeroPedido());
        result.put("total",        saved.getTotalPedido());
        result.put("mesa",         mesa.getNombre());
        result.put("estado",       saved.getEstadoPedido());
        return result;
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

    private Mesa findMesaActiva(String token) {
        return mesaRepo.findByQrToken(token)
            .filter(m -> Boolean.TRUE.equals(m.getActivo()))
            .orElseThrow(() -> new NoSuchElementException("QR inválido o desactivado"));
    }
}
