package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.pedido.PedidoManualEntregaStockService;
import com.hotclick.service.stock.StockMovimientoSupport;
import com.hotclick.sse.StockCambioEvent;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Objects;
import java.util.List;
import java.util.Map;

@Service
public class StockReservationService {

    private static final Logger log = LoggerFactory.getLogger(StockReservationService.class);

    private static final String MSG_PRODUCTO_NO_ENCONTRADO = "Producto no encontrado al confirmar pago";
    private static final String NOTA_VENTA_ONLINE = "Venta online pagada ";

    @Autowired private ProductoRepository productoRepository;
    @Autowired private StockMovimientoSupport movimientoSupport;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

    /**
     * QA-CONC-1: si el Producto ya estaba en el contexto (cargado con los ítems del pedido), la consulta
     * FOR UPDATE devuelve esa instancia con datos y @Version viejos → OptimisticLock al hacer flush.
     * Con el lock ya tomado, refrescar trae la fila actual y las confirmaciones quedan en serie.
     */
    private Producto bloquearActual(Long id, java.util.function.Supplier<RuntimeException> siFalta) {
        Producto p = productoRepository.findByIdForUpdate(id).orElseThrow(siFalta);
        if (entityManager != null && entityManager.contains(p)) entityManager.refresh(p);
        return p;
    }

    /**
     * Valida y RESERVA stock con bloqueo pesimista.
     * La reserva (stockReservado) impide que dos compradores simultáneos
     * agoten el mismo item. Solo se descuenta stockActual al confirmar el pago.
     */
    public StockReservationResult reserveForCheckout(List<PaymentCheckoutRequest.ItemDTO> items) {
        int subtotal   = 0;
        int costoTotal = 0;
        // Cache de productos cargados con SELECT FOR UPDATE — evita N+1 en el snapshot posterior
        Map<Long, Producto> productosMap = new HashMap<>();
        // P-05: un solo SELECT FOR UPDATE con ids únicos y ordenados → mismo orden de locks en todos los checkouts.
        List<Long> ids = idsOrdenados(items.stream().map(PaymentCheckoutRequest.ItemDTO::getProductoId).toList());
        Map<Long, Producto> bloqueados = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Producto p : productoRepository.findAllByIdsForUpdate(ids)) bloqueados.put(p.getId(), p);
        }
        List<PaymentCheckoutRequest.ItemDTO> enOrden = new ArrayList<>(items);
        enOrden.sort(Comparator.comparing(PaymentCheckoutRequest.ItemDTO::getProductoId,
            Comparator.nullsLast(Comparator.naturalOrder())));
        for (PaymentCheckoutRequest.ItemDTO item : enOrden) {
            Producto p = item.getProductoId() == null ? null : bloqueados.get(item.getProductoId());
            if (p == null) throw new RecursoNoEncontradoException("Producto", item.getProductoId());

            // ESC-1: mismo criterio que el catálogo público (activo, visible, negocio ACTIVO y público).
            if (!esPublicableEnMemoria(p) || Boolean.TRUE.equals(p.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + p.getNombreProducto());
            }
            // HOTFIX: «A cotizar» nunca se cobra a ₡1; solo con un precio cotizado explícito.
            if (p.esACotizar() && item.getPrecioUnitarioOverride() == null) {
                throw new IllegalArgumentException("«" + p.getNombreProducto() + "» es a cotizar: solicitá una cotización al vendedor");
            }
            // M-08: personalizado o bajo pedido se vende sin stock: no se exige ni se reserva (nada que liberar después).
            if (!Boolean.TRUE.equals(p.getEsPersonalizado())) {
                // Validar contra stockDisponible (stockActual - stockReservado)
                if (p.getStockDisponible() < item.getCantidad()) {
                    throw new StockInsuficienteException(p.getNombreProducto(), p.getStockDisponible(), item.getCantidad());
                }
                // Reservar unidades — se libera en cancelación/fallo, se consume en confirmación
                p.setStockReservado(p.getStockReservado() + item.getCantidad());
                productoRepository.save(p);
            }
            productosMap.put(p.getId(), p);

            int precioUnitario = item.getPrecioUnitarioOverride() != null
                ? item.getPrecioUnitarioOverride()
                : OrderPricingService.precioEfectivo(p);
            subtotal   += precioUnitario * item.getCantidad();
            costoTotal += p.getPrecioCompra() * item.getCantidad();
        }
        return new StockReservationResult(subtotal, costoTotal, productosMap);
    }

    /** P-05: ids únicos, sin nulos, ascendentes. */
    static List<Long> idsOrdenados(Collection<Long> ids) {
        return ids.stream().filter(Objects::nonNull).distinct().sorted().toList();
    }

    /** P-05: ítems ordenados por productoId para bloquear siempre en el mismo orden. */
    static List<PedidoItem> itemsOrdenados(List<PedidoItem> items) {
        List<PedidoItem> copia = new ArrayList<>(items);
        copia.sort(Comparator.comparing((PedidoItem i) -> i.getProducto() == null ? null : i.getProducto().getId(), Comparator.nullsLast(Comparator.naturalOrder())));
        return copia;
    }

    public void consumeForGiftCard(Pedido pedido) {
        boolean reservo = pedido.getStockReservadoEn() != null;
        pedido.setStockReservadoEn(null);
        for (PedidoItem item : itemsOrdenados(pedido.getItems())) {
            Producto p = productoRepository.findByIdForUpdate(item.getProducto().getId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", item.getProducto().getId()));
            p.setStockActual(Math.max(0, p.getStockActual() - item.getCantidad()));
            if (reservo) p.setStockReservado(Math.max(0, p.getStockReservado() - item.getCantidad()));
            if (Boolean.TRUE.equals(p.getEsUnico())) { p.setVendido(true); p.setVisibleCatalogo(false); }
            productoRepository.save(p);
        }
    }

    /**
     * M-08: ids de los productos del grupo a los que les falta stock para confirmar el cobro (vacío = alcanza).
     * Bloquea todas las filas en orden ascendente de id (mismo orden que el resto) y suma lo pedido por producto
     * entre todos los pedidos. Compara con stockActual (la reserva propia del cobro ya cuenta dentro de él).
     * Los productos personalizados o bajo pedido se venden sin stock y no entran en la revisión.
     */
    public List<Long> productosSinStock(List<Pedido> pedidos) {
        Map<Long, Integer> pedido = new HashMap<>();
        for (Pedido ped : pedidos) {
            for (PedidoItem item : ped.getItems()) {
                if (item.getProducto() == null || item.getProducto().getId() == null) continue;
                pedido.merge(item.getProducto().getId(), item.getCantidad(), Integer::sum);
            }
        }
        List<Long> faltantes = new ArrayList<>();
        if (pedido.isEmpty()) return faltantes;
        for (Producto p : productoRepository.findAllByIdsForUpdate(idsOrdenados(pedido.keySet()))) {
            if (entityManager != null && entityManager.contains(p)) entityManager.refresh(p);
            if (Boolean.TRUE.equals(p.getEsPersonalizado())) continue;
            int stock = p.getStockActual() == null ? 0 : p.getStockActual();
            if (stock < pedido.get(p.getId())) faltantes.add(p.getId());
        }
        return faltantes;
    }

    /**
     * Descuenta stockActual, libera la reserva de este pedido y deja un movimiento VENTA por línea
     * con el mismo registro que POS y P-07 ({@link StockMovimientoSupport}). Idempotente: si
     * {@code stockDescontadoEn} ya está puesto, no vuelve a descontar ni a escribir. Fail-closed:
     * sin empresa del pedido no toca stock; un producto de otro negocio no se bloquea ni se mueve.
     * El stock nunca queda negativo.
     */
    public void confirmAndConsumeStock(Pedido pedido, Object eventSource, ApplicationEventPublisher eventPublisher) {
        if (pedido == null || pedido.getStockDescontadoEn() != null) return;
        Long empresaId = pedido.getEmpresaId();
        if (empresaId == null) {
            log.error("Consumo de stock rechazado: pedido {} sin empresa", pedido.getNumeroPedido());
            return;
        }
        // ALTO-01: solo se descuenta de stockReservado lo que ESTE pedido reservó (un MANUAL nunca reservó).
        boolean reservo = pedido.getStockReservadoEn() != null;
        pedido.setStockReservadoEn(null);
        List<PedidoItem> lineas = lineasConProducto(pedido);
        Map<Long, Producto> propios = bloquearProductosDelPedido(empresaId, lineas);
        List<MovimientoStock> movimientos = new ArrayList<>();
        for (PedidoItem item : lineas) {
            Producto producto = propios.get(item.getProducto().getId());
            if (producto == null) continue;
            movimientos.add(consumirLinea(pedido, item, producto, reservo, eventSource, eventPublisher));
        }
        movimientoSupport.guardarLote(movimientos);
        pedido.setStockDescontadoEn(LocalDateTime.now(Constants.ZONA_CR));
    }

    private List<PedidoItem> lineasConProducto(Pedido pedido) {
        if (pedido.getItems() == null) return List.of();
        return itemsOrdenados(pedido.getItems()).stream()
            .filter(Objects::nonNull)
            .filter(i -> i.getProducto() != null && i.getProducto().getId() != null)
            .filter(i -> i.getCantidad() != null && i.getCantidad() > 0)
            .toList();
    }

    /** Dueño sin lock; el FOR UPDATE solo incluye productos de la empresa del pedido, en orden de id. */
    private Map<Long, Producto> bloquearProductosDelPedido(Long empresaId, List<PedidoItem> lineas) {
        List<Long> ids = idsOrdenados(lineas.stream().map(i -> i.getProducto().getId()).toList());
        List<Long> propios = idsDelTenant(empresaId, ids);
        Map<Long, Producto> map = new HashMap<>();
        if (propios.isEmpty()) return map;
        for (Producto p : productoRepository.findAllByIdsAndEmpresaForUpdate(propios, empresaId)) {
            if (entityManager != null && entityManager.contains(p)) entityManager.refresh(p);
            if (empresaId.equals(p.getEmpresaId())) map.put(p.getId(), p);
        }
        for (Long id : propios) {
            if (!map.containsKey(id)) throw new RecursoNoEncontradoException(MSG_PRODUCTO_NO_ENCONTRADO);
        }
        return map;
    }

    private List<Long> idsDelTenant(Long empresaId, List<Long> ids) {
        List<Long> propios = new ArrayList<>();
        for (Long id : ids) {
            Long dueno = productoRepository.findEmpresaIdById(id).orElse(null);
            if (dueno == null) throw new RecursoNoEncontradoException(MSG_PRODUCTO_NO_ENCONTRADO);
            if (!empresaId.equals(dueno)) {
                log.error("Producto {} no pertenece a la empresa {} del pedido; no se descuenta", id, empresaId);
                continue;
            }
            propios.add(id);
        }
        return propios;
    }

    private MovimientoStock consumirLinea(Pedido pedido, PedidoItem item, Producto producto, boolean reservo,
                                          Object eventSource, ApplicationEventPublisher eventPublisher) {
        Consumo consumo = calcularConsumo(producto, item.getCantidad());
        producto.setStockActual(consumo.despues());
        int resAntes = producto.getStockReservado();
        if (reservo) producto.setStockReservado(Math.max(0, resAntes - item.getCantidad()));
        if (Boolean.TRUE.equals(producto.getEsUnico())) {
            producto.setVendido(true);
            producto.setVisibleCatalogo(false);
        }
        productoRepository.save(producto);
        MovimientoStock movimiento = movimientoDeVenta(pedido, producto, consumo, resAntes, item.getCantidad());
        eventPublisher.publishEvent(new StockCambioEvent(
            eventSource, producto.getId(), producto.getEmpresaId(), consumo.despues()));
        return movimiento;
    }

    private Consumo calcularConsumo(Producto producto, int pedida) {
        int antes = producto.getStockActual() == null ? 0 : producto.getStockActual();
        if (antes >= pedida) return new Consumo(antes, antes - pedida, pedida);
        if (!Boolean.TRUE.equals(producto.getEsPersonalizado())) {
            log.error("OVERSELL: producto={} stockActual={} cantidad={}", producto.getId(), antes, pedida);
        }
        return new Consumo(antes, 0, Math.max(0, antes));
    }

    private MovimientoStock movimientoDeVenta(Pedido pedido, Producto producto, Consumo consumo,
                                              int resAntes, int pedida) {
        MovimientoStock m = movimientoSupport.buildMovimiento(producto, MovimientoStock.VENTA, consumo.descontada(),
            consumo.antes(), consumo.despues(), resAntes, producto.getStockReservado(),
            pedido.getNumeroPedido(), null);
        m.setReferenciaTipo(PedidoManualEntregaStockService.REFERENCIA_TIPO);
        m.setReferenciaId(pedido.getId());
        m.setNotas(notaVenta(pedido, pedida, consumo.descontada()));
        return m;
    }

    private static String notaVenta(Pedido pedido, int pedida, int descontada) {
        String nota = NOTA_VENTA_ONLINE + Objects.toString(pedido.getNumeroPedido(), "");
        int faltante = pedida - descontada;
        if (faltante <= 0) return nota;
        return nota + " — FALTANTE: " + faltante + " sin stock (revisar inventario)";
    }

    private record Consumo(int antes, int despues, int descontada) {}

    /**
     * Solo libera stockReservado sin tocar stockActual.
     * Usado en: pago cancelado, pago fallido, pago expirado.
     */
    public void liberarReservas(Pedido pedido) {
        if (pedido == null) return;
        // ALTO-01: un pedido sin reserva propia (MANUAL, ya liberado o ya consumido) no toca stockReservado:
        // restar igual se comía la reserva de otro pedido del mismo producto. Idempotente: la marca se limpia.
        if (pedido.getStockReservadoEn() == null) {
            log.info("Pedido {} sin reserva propia: no se libera stock reservado", pedido.getNumeroPedido());
            return;
        }
        pedido.setStockReservadoEn(null);
        Hibernate.initialize(pedido.getItems());

        for (PedidoItem item : itemsOrdenados(pedido.getItems())) {
            try {
                Producto producto;
                try {
                    producto = bloquearActual(item.getProducto().getId(), () -> new RecursoNoEncontradoException("Producto"));
                } catch (RecursoNoEncontradoException e) { continue; }

                if (Boolean.TRUE.equals(producto.getEsPersonalizado())) continue; // nunca reservó stock
                int nuevoReservado = Math.max(0, producto.getStockReservado() - item.getCantidad());
                producto.setStockReservado(nuevoReservado);
                productoRepository.save(producto);
            } catch (Exception e) {
                log.error("Error liberando reserva producto={}: {}", item.getProducto().getId(), e.getMessage());
            }
        }
        log.info("Reservas liberadas para pedido {}", pedido.getNumeroPedido());
    }

    /** ESC-1/IDOR-10: equivale a ProductoRepository.esPublicable sobre la entidad ya bloqueada. */
    public static boolean esPublicableEnMemoria(Producto p) {
        if (p.getEstado() == null || p.getEstado() != com.hotclick.utils.Constants.ESTADO_ACTIVO) return false;
        if (!Boolean.TRUE.equals(p.getVisibleCatalogo())) return false;
        com.hotclick.model.Empresa e = p.getEmpresa();
        return e == null || ("ACTIVO".equals(e.getEstadoEmpresa())
            && Boolean.TRUE.equals(e.getVisibilidadPublica())
            && com.hotclick.catalogo.CatalogoPublicoGate.membresiaConfirmada(e.getEstadoPlan()));
    }
}
