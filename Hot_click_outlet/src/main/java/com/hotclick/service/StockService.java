package com.hotclick.service;

import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.MovimientoStock;
import com.hotclick.model.Producto;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Servicio central de inventario.
 *
 * Gestiona tres operaciones sobre stockActual / stockReservado:
 *   1. reservar()          – cuando el usuario agrega un ítem al carrito
 *   2. liberarReserva()    – cuando vacía el carrito o se cancela el checkout
 *   3. descontarPorVenta() – cuando la venta se confirma (descuenta real + libera reserva si aplica)
 *
 * Cada operación registra un MovimientoStock para auditoría completa.
 *
 * Uso de locks: este servicio opera sobre instancias de Producto ya bloqueadas
 * (vía findByIdForUpdate) por el caller. No debe llamarse sin lock previo cuando
 * se modifica stockActual o stockReservado.
 */
@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    @Autowired private ProductoRepository         productoRepository;
    @Autowired private MovimientoStockRepository  movimientoStockRepository;

    // ── Operaciones públicas ─────────────────────────────────────────────────────

    /**
     * Incrementa stockReservado al agregar ítem al carrito.
     * Valida contra stockDisponible = stockActual − stockReservado.
     */
    @Transactional
    public void reservar(Producto producto, int cantidad, String referencia, String operadorCorreo) {
        int disponible = producto.getStockDisponible();
        if (disponible < cantidad) {
            throw new StockInsuficienteException(producto.getNombreProducto(), disponible, cantidad);
        }

        int resAntes  = producto.getStockReservado();
        int resDespues = resAntes + cantidad;
        producto.setStockReservado(resDespues);
        productoRepository.save(producto);

        registrar(producto, MovimientoStock.RESERVA, cantidad,
            producto.getStockActual(), producto.getStockActual(),
            resAntes, resDespues,
            referencia, operadorCorreo);

        log.info("Reserva — producto id={} '{}': reservado {} → {}",
            producto.getId(), producto.getNombreProducto(), resAntes, resDespues);
    }

    /**
     * Decrementa stockReservado al vaciar/cancelar el carrito.
     * Seguro ante concurrencia: nunca baja de 0.
     */
    @Transactional
    public void liberarReserva(Producto producto, int cantidad, String referencia, String operadorCorreo) {
        int resAntes   = producto.getStockReservado();
        int resDespues = Math.max(0, resAntes - cantidad);
        producto.setStockReservado(resDespues);
        productoRepository.save(producto);

        registrar(producto, MovimientoStock.LIBERACION_RESERVA, cantidad,
            producto.getStockActual(), producto.getStockActual(),
            resAntes, resDespues,
            referencia, operadorCorreo);

        log.info("Liberación reserva — producto id={} '{}': reservado {} → {}",
            producto.getId(), producto.getNombreProducto(), resAntes, resDespues);
    }

    /**
     * Descuenta stockActual tras una venta confirmada.
     * Si {@code liberarReservaPrevia=true} también decrementa stockReservado
     * (para ventas que provienen de un carrito con reserva activa).
     *
     * Precondición: el producto fue obtenido con findByIdForUpdate (lock pesimista).
     */
    @Transactional
    public void descontarPorVenta(Producto producto, int cantidad,
                                  boolean liberarReservaPrevia,
                                  String referencia, String operadorCorreo) {
        int actAntes  = producto.getStockActual();
        int actDespues = actAntes - cantidad;
        producto.setStockActual(actDespues);

        int resAntes   = producto.getStockReservado();
        int resDespues = liberarReservaPrevia
            ? Math.max(0, resAntes - cantidad)
            : resAntes;
        producto.setStockReservado(resDespues);

        if (Boolean.TRUE.equals(producto.getEsUnico())) {
            producto.setVendido(true);
        }
        productoRepository.save(producto);

        registrar(producto, MovimientoStock.VENTA, cantidad,
            actAntes, actDespues,
            resAntes, resDespues,
            referencia, operadorCorreo);

        log.info("Venta — producto id={} '{}': actual {} → {}, reservado {} → {}",
            producto.getId(), producto.getNombreProducto(),
            actAntes, actDespues, resAntes, resDespues);
    }

    /**
     * Ajuste manual de entrada (reposición de inventario).
     */
    @Transactional
    public void ajustarEntrada(Long productoId, int cantidad, String notas, String operadorCorreo) {
        Producto producto = productoRepository.findByIdForUpdate(productoId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productoId));
        if (producto.getEstado() != Constants.ESTADO_ACTIVO) {
            throw new RuntimeException("Producto no activo");
        }
        int actAntes   = producto.getStockActual();
        int actDespues = actAntes + cantidad;
        producto.setStockActual(actDespues);
        productoRepository.save(producto);

        MovimientoStock m = buildMovimiento(producto, MovimientoStock.AJUSTE_ENTRADA, cantidad,
            actAntes, actDespues, producto.getStockReservado(), producto.getStockReservado(),
            "ajuste-manual", operadorCorreo);
        m.setNotas(notas);
        movimientoStockRepository.save(m);

        log.info("Ajuste entrada — producto id={}: actual {} → {}", productoId, actAntes, actDespues);
    }

    // ── Consulta de auditoría ────────────────────────────────────────────────────

    public java.util.List<MovimientoStock> historialPorProducto(Long productoId) {
        return movimientoStockRepository.findByProductoIdOrderByFechaMovimientoDesc(productoId);
    }

    // ── Helpers internos ─────────────────────────────────────────────────────────

    private void registrar(Producto producto, String tipo, int cantidad,
                            int actAntes, int actDespues,
                            int resAntes, int resDespues,
                            String referencia, String operadorCorreo) {
        movimientoStockRepository.save(
            buildMovimiento(producto, tipo, cantidad,
                actAntes, actDespues, resAntes, resDespues,
                referencia, operadorCorreo));
    }

    private MovimientoStock buildMovimiento(Producto producto, String tipo, int cantidad,
                                            int actAntes, int actDespues,
                                            int resAntes, int resDespues,
                                            String referencia, String operadorCorreo) {
        MovimientoStock m = new MovimientoStock();
        m.setProducto(producto);
        m.setTipoMovimiento(tipo);
        m.setCantidad(cantidad);
        m.setStockActualAntes(actAntes);
        m.setStockActualDespues(actDespues);
        m.setStockReservadoAntes(resAntes);
        m.setStockReservadoDespues(resDespues);
        m.setReferencia(referencia);
        m.setOperadorCorreo(operadorCorreo);
        m.setFechaMovimiento(LocalDateTime.now());
        return m;
    }
}
