package com.hotclick.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PedidoService {

    private static final Logger log = LoggerFactory.getLogger(PedidoService.class);

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private N8nWebhookService n8nWebhookService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private ObjectMapper objectMapper;

    @CacheEvict(value = "dashboard-metricas",
        key = "#pedido.empresa != null ? #pedido.empresa.id.toString() : 'global'")
    @Transactional
    public Pedido crearPedido(Pedido pedido) {
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now());
        if (pedido.getEstadoPedido() == null) {
            pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        }
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        return pedidoRepository.save(pedido);
    }

    @CacheEvict(value = "dashboard-metricas", key = "#empresa.id.toString()")
    @Transactional
    public Pedido crearPedidoManual(ManualPedidoDTO dto, com.hotclick.model.Empresa empresa) {
        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + dto.getUsuarioId()));

        Long bodegaId = dto.getBodegaId() != null ? dto.getBodegaId() : 1L;
        Bodega bodega = bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RuntimeException("Bodega no encontrada"));

        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now());
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setMetodoEnvio(dto.getMetodoEnvio() != null ? dto.getMetodoEnvio() : Constants.ENVIO_RETIRO);
        pedido.setMetodoPago(dto.getMetodoPago() != null ? dto.getMetodoPago() : "SINPE");
        pedido.setCostoEnvio(dto.getCostoEnvio() != null ? dto.getCostoEnvio() : 0);
        pedido.setEstadoPedido(dto.getEstadoPedido() != null ? dto.getEstadoPedido() : Constants.PEDIDO_PENDIENTE);
        pedido.setNotas(dto.getNotas());
        if (dto.getOrigen() != null) pedido.setOrigen(dto.getOrigen());
        pedido.setDescuentoTotal(0);
        pedido.setAplicaImpuesto(false);
        pedido.setMontoImpuesto(0);
        pedido.setEstado(Constants.ESTADO_ACTIVO);

        int subtotal = 0;
        int costoTotalProductos = 0;
        List<PedidoItem> items = new ArrayList<>();

        // Batch-load todos los productos del pedido en una sola query — evita N+1
        List<Long> productoIds = dto.getItems().stream()
            .map(ManualPedidoDTO.ItemDTO::getProductoId).toList();
        Map<Long, Producto> productoMap = productoRepository.findAllById(productoIds).stream()
            .collect(java.util.stream.Collectors.toMap(Producto::getId, p -> p));

        for (ManualPedidoDTO.ItemDTO itemDto : dto.getItems()) {
            Producto producto = productoMap.get(itemDto.getProductoId());
            if (producto == null) throw new RuntimeException("Producto no encontrado: " + itemDto.getProductoId());

            int precio   = itemDto.getPrecioUnitario() != null ? itemDto.getPrecioUnitario() : producto.getPrecioVenta();
            int costo    = producto.getPrecioCompra();
            int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;

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

            subtotal           += precio * cantidad;
            costoTotalProductos += costo * cantidad;
        }

        pedido.setItems(items);
        pedido.setSubtotal(subtotal);
        int envio = pedido.getCostoEnvio() != null ? pedido.getCostoEnvio() : 0;
        pedido.setTotalPedido(subtotal + envio);
        pedido.setCostoTotalProductos(costoTotalProductos);
        pedido.setUtilidadBruta(subtotal - costoTotalProductos);
        pedido.setEmpresa(empresa);

        Pedido saved = pedidoRepository.save(pedido);
        saved.getItems().size();
        if (Constants.PEDIDO_PAGADO.equals(saved.getEstadoPedido())) {
            n8nWebhookService.notificarPedidoNuevo(saved);
        }
        return saved;
    }

    @Transactional
    public Pedido cambiarEstado(Long id, String nuevoEstado, String nota) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setEstadoPedido(nuevoEstado);
        if (nota != null && !nota.isBlank()) {
            appendNotificacion(pedido, nuevoEstado, nota);
        }
        pedido = pedidoRepository.save(pedido);
        pedido.getItems().size(); // force-initialize items within session
        // Inicializar proxy LAZY de usuarioFinal para que el @Async email no falle
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        if (nota != null && !nota.isBlank()) {
            notificacionEmailService.enviarSeguimientoEstado(pedido, nota);
        }
        if (Constants.PEDIDO_ENTREGADO.equals(nuevoEstado)) {
            n8nWebhookService.notificarPedidoEntregado(pedido);
        }
        return pedido;
    }

    private void appendNotificacion(Pedido pedido, String estado, String nota) {
        try {
            String raw = pedido.getNotificaciones();
            List<Map<String, Object>> list = objectMapper.readValue(
                (raw != null && !raw.isBlank()) ? raw : "[]",
                new TypeReference<List<Map<String, Object>>>() {}
            );
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("estado", estado);
            entry.put("nota",   nota);
            entry.put("fecha",  LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            list.add(entry);
            pedido.setNotificaciones(objectMapper.writeValueAsString(list));
        } catch (Exception e) {
            log.warn("No se pudo guardar notificacion en pedido {}: {}", pedido.getId(), e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Pedido buscarPorId(Long id) {
        Pedido p = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        p.getItems().size(); // force-initialize within session
        return p;
    }

    @Transactional(readOnly = true)
    public Page<Pedido> listarPorUsuario(Long usuarioId, Pageable pageable) {
        // Usa fetch join en la query de count/sort paginada — la carga de items ocurre en una sola query adicional
        return pedidoRepository.findByUsuarioFinalIdOrderByFechaPedidoDesc(usuarioId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPendientes(Long empresaId) {
        if (empresaId != null) {
            // JOIN FETCH items en una sola query — elimina N+1 del .size() anterior
            return pedidoRepository.findByEmpresaIdAndEstadoPedidoWithItems(
                empresaId, Constants.PEDIDO_PENDIENTE, Constants.ESTADO_ACTIVO);
        }
        return pedidoRepository.findByEstadoPedidoAndEstado(Constants.PEDIDO_PENDIENTE, Constants.ESTADO_ACTIVO);
    }

    @Transactional
    public Pedido asignarGuia(Long id, String numeroGuia) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setNumeroGuia(numeroGuia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + numeroGuia);
        pedido.setFechaEnvio(LocalDateTime.now());
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        pedido.getItems().size();
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    @Transactional
    public Pedido procesarEnvio(Long id, String guia, Integer costoEnvio) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setNumeroGuia(guia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + guia);
        pedido.setFechaEnvio(LocalDateTime.now());
        if (costoEnvio != null) pedido.setCostoEnvio(costoEnvio);
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        pedido.getItems().size();
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    @Transactional
    public void eliminarPedido(Long id) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedidoRepository.delete(pedido);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarResumenPaginado(int page, int size) {
        return listarResumenPaginadoPorEmpresa(page, size, null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarResumenPaginadoPorEmpresa(int page, int size, Long empresaId) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaPedido").descending());
        var content = empresaId != null
            ? pedidoRepository.findByEmpresaIdOrderByFechaPedidoDesc(empresaId, pageable).getContent()
            : pedidoRepository.findAllByOrderByFechaPedidoDesc(pageable).getContent();
        return content.stream().map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",            p.getId());
                m.put("numeroPedido",  p.getNumeroPedido());
                m.put("fechaCreacion", p.getFechaPedido());
                m.put("estado",        p.getEstadoPedido());
                m.put("total",         p.getTotalPedido());
                m.put("metodoPago",    p.getMetodoPago());
                m.put("metodoEnvio",   p.getMetodoEnvio());
                m.put("costoEnvio",    p.getCostoEnvio());
                m.put("nombreCliente", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getNombre() : "—");
                m.put("clienteCorreo", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getCorreo() : "—");
                m.put("items", List.of());
                return m;
            }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosConDetallesByEmpresa(Long empresaId) {
        return pedidoRepository.findAllWithDetailsByEmpresaId(empresaId).stream()
            .map(this::mapPedidoDetalle).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosConDetalles() {
        return pedidoRepository.findAllWithDetails().stream()
            .map(this::mapPedidoDetalle).collect(Collectors.toList());
    }

    private Map<String, Object> mapPedidoDetalle(Pedido p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            p.getId());
        m.put("numeroPedido",  p.getNumeroPedido());
        m.put("fechaCreacion", p.getFechaPedido());
        m.put("estado",        p.getEstadoPedido());
        m.put("total",         p.getTotalPedido());
        m.put("metodoPago",    p.getMetodoPago());
        m.put("metodoEnvio",   p.getMetodoEnvio());
        m.put("costoEnvio",    p.getCostoEnvio());
        m.put("numeroGuia",    p.getNumeroGuia());
        m.put("notas",         p.getNotas());
        try {
            String rawN = p.getNotificaciones();
            m.put("notificaciones", objectMapper.readValue(
                (rawN != null && !rawN.isBlank()) ? rawN : "[]",
                new TypeReference<List<Map<String, Object>>>() {}));
        } catch (Exception ignored) { m.put("notificaciones", List.of()); }
        m.put("clienteId",     p.getUsuarioFinal() != null ? p.getUsuarioFinal().getId()       : null);
        m.put("nombreCliente", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getNombre()   : "—");
        m.put("clienteCorreo", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getCorreo()   : "—");
        m.put("clienteTel",    p.getUsuarioFinal() != null ? p.getUsuarioFinal().getTelefono() : "");
        List<Map<String, Object>> items = p.getItems().stream().map(i -> {
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("productoId",      i.getProducto() != null ? i.getProducto().getId() : null);
            im.put("nombreProducto",  i.getProducto() != null ? i.getProducto().getNombreProducto() : "—");
            im.put("imagenUrl",       i.getProducto() != null ? i.getProducto().getImagenPrincipalUrl() : null);
            im.put("categoriaId",     i.getProducto() != null && i.getProducto().getCategoria() != null ? i.getProducto().getCategoria().getId() : null);
            im.put("categoriaNombre", i.getProducto() != null && i.getProducto().getCategoria() != null ? i.getProducto().getCategoria().getNombreCategoria() : "—");
            im.put("cantidad",        i.getCantidad());
            im.put("precioUnitario",  i.getPrecioUnitarioMomento());
            return im;
        }).collect(Collectors.toList());
        m.put("items", items);
        return m;
    }
}
