package com.hotclick.service;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Carrito;
import com.hotclick.model.CarritoItem;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CarritoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CarritoService {

    @Autowired private CarritoRepository  carritoRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired private StockService       stockService;

    /**
     * El carrito está aislado por empresa: un mismo usuario que compra en dos
     * negocios distintos (multi-tenant) no debe compartir carrito entre ambos.
     */
    @Transactional
    public Carrito obtenerCarritoActivo(Usuario usuario) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            throw new SecurityException("Contexto de empresa requerido para acceder al carrito");
        }
        return carritoRepository.findByUsuarioFinalIdAndEmpresaIdAndEstadoCarrito(
                usuario.getId(), empresaId, Constants.CARRITO_ACTIVO)
            .orElseGet(() -> crearCarrito(usuario, empresaId));
    }

    @Transactional
    public Carrito agregarItem(Long carritoId, Long productoId, Integer cantidad) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            throw new SecurityException("Contexto de empresa requerido para modificar el carrito");
        }
        Carrito carrito = carritoRepository.findByIdAndEmpresaId(carritoId, empresaId)
            .orElseThrow(() -> new TenantAccessDeniedException(
                "Acceso denegado: el carrito no pertenece a este comercio"));

        // SELECT FOR UPDATE: evita doble-reserva concurrente del mismo producto
        Producto producto = productoRepository.findByIdForUpdate(productoId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        if (producto.getEstado() != Constants.ESTADO_ACTIVO) {
            throw new RuntimeException("Producto no disponible");
        }
        if (Boolean.TRUE.equals(producto.getEsUnico()) && Boolean.TRUE.equals(producto.getVendido())) {
            throw new RuntimeException("Este artículo único ya fue vendido");
        }

        // Reservar stock (valida stockDisponible = stockActual - stockReservado >= cantidad)
        String referencia = "carrito-" + carritoId;
        stockService.reservar(producto, cantidad, referencia, "carrito-usuario");

        CarritoItem item = new CarritoItem();
        item.setCarrito(carrito);
        item.setProducto(producto);
        item.setCantidad(cantidad);
        item.setPrecioUnitarioMomento(producto.getPrecioVenta());
        item.setEstado(Constants.ESTADO_ACTIVO);
        carrito.getItems().add(item);

        int total = carrito.getItems().stream()
            .mapToInt(i -> i.getPrecioUnitarioMomento() * i.getCantidad())
            .sum();
        carrito.setTotalCarrito(total);
        carrito.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));

        return carritoRepository.save(carrito);
    }

    @Transactional
    public void vaciarCarrito(Long carritoId) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) {
            throw new SecurityException("Contexto de empresa requerido para modificar el carrito");
        }
        Carrito carrito = carritoRepository.findByIdAndEmpresaId(carritoId, empresaId)
            .orElseThrow(() -> new TenantAccessDeniedException(
                "Acceso denegado: el carrito no pertenece a este comercio"));

        // Liberar todas las reservas antes de borrar los ítems
        liberarReservasDeItems(carrito.getItems(), carritoId);

        carrito.getItems().clear();
        carrito.setTotalCarrito(0);
        carrito.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        carritoRepository.save(carrito);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Carrito crearCarrito(Usuario usuario, Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RuntimeException("Empresa no encontrada: " + empresaId));
        Carrito carrito = new Carrito();
        carrito.setUsuarioFinal(usuario);
        carrito.setEmpresa(empresa);
        carrito.setEstadoCarrito(Constants.CARRITO_ACTIVO);
        carrito.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        carrito.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        carrito.setEstado(Constants.ESTADO_ACTIVO);
        return carritoRepository.save(carrito);
    }

    private void liberarReservasDeItems(List<CarritoItem> items, Long carritoId) {
        String referencia = "liberacion-carrito-" + carritoId;
        items.forEach(item -> {
            Producto producto = item.getProducto(); // ya en sesión JPA — sin roundtrip extra
            if (producto != null) {
                stockService.liberarReserva(producto, item.getCantidad(), referencia, "sistema");
            }
        });
    }
}
