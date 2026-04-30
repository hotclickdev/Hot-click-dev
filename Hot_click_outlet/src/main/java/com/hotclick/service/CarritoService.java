package com.hotclick.service;

import com.hotclick.model.Carrito;
import com.hotclick.model.CarritoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CarritoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class CarritoService {

    @Autowired
    private CarritoRepository carritoRepository;

    @Autowired
    private ProductoRepository productoRepository;

    public Carrito obtenerCarritoActivo(Usuario usuario) {
        return carritoRepository.findByUsuarioFinalIdAndEstadoCarrito(usuario.getId(), "ACTIVO")
            .orElseGet(() -> crearCarrito(usuario));
    }

    @Transactional
    private Carrito crearCarrito(Usuario usuario) {
        Carrito carrito = new Carrito();
        carrito.setUsuarioFinal(usuario);
        carrito.setEstadoCarrito("ACTIVO");
        carrito.setFechaCreacion(LocalDateTime.now());
        carrito.setFechaActualizacion(LocalDateTime.now());
        carrito.setEstado(Constants.ESTADO_ACTIVO);
        return carritoRepository.save(carrito);
    }

    @Transactional
    public Carrito agregarItem(Long carritoId, Long productoId, Integer cantidad) {
        Carrito carrito = carritoRepository.findById(carritoId)
            .orElseThrow(() -> new RuntimeException("Carrito no encontrado"));

        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        if (producto.getEstado() != Constants.ESTADO_ACTIVO) {
            throw new RuntimeException("Producto no disponible");
        }
        if (producto.getEsUnico() && producto.getVendido()) {
            throw new RuntimeException("Este artículo único ya fue vendido");
        }
        if (producto.getStockActual() < cantidad) {
            throw new RuntimeException("Stock insuficiente");
        }

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
        carrito.setFechaActualizacion(LocalDateTime.now());

        return carritoRepository.save(carrito);
    }

    @Transactional
    public void vaciarCarrito(Long carritoId) {
        Carrito carrito = carritoRepository.findById(carritoId)
            .orElseThrow(() -> new RuntimeException("Carrito no encontrado"));
        carrito.getItems().clear();
        carrito.setTotalCarrito(0);
        carritoRepository.save(carrito);
    }
}
