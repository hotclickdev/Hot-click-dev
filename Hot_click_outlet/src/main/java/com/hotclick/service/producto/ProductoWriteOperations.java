package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
public class ProductoWriteOperations {

    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProductoDtoMapper dtoMapper;
    @Autowired private ProductoCacheEvictor cacheEvictor;
    @Autowired private ProductoGuardadoNotifier guardadoNotifier;

    @Transactional
    public Producto crearProducto(Object source, ProductoRequestDTO dto, String adminCorreo, Empresa empresa) {
        cacheEvictor.evictProductosPublicos();
        if (dto.getCategoriaId() == null)
            throw new IllegalArgumentException("Debe seleccionar una categoría");

        Producto p = new Producto();
        dtoMapper.mapDtoToProducto(dto, p);
        p.setEstado(Constants.ESTADO_ACTIVO);
        if (p.getSku() == null) {
            p.setSku("HC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        p.setCategoria(categoriaRepository.findById(dto.getCategoriaId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Categoría", dto.getCategoriaId())));

        if (dto.getBodegaId() != null) {
            p.setBodega(bodegaRepository.findById(dto.getBodegaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega", dto.getBodegaId())));
        } else if (empresa != null) {
            List<Bodega> bodsEmpresa = bodegaRepository
                .findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresa.getId(), Constants.ESTADO_ACTIVO);
            if (bodsEmpresa.isEmpty())
                throw new IllegalArgumentException("No tenés bodegas creadas. Creá una bodega antes de publicar.");
            p.setBodega(bodsEmpresa.get(0));
        } else {
            throw new IllegalArgumentException("Debe seleccionar una bodega");
        }
        p.setAdminCliente(usuarioRepository.findByCorreo(adminCorreo)
            .orElseThrow(() -> new RecursoNoEncontradoException("Admin", adminCorreo)));
        p.setEmpresa(empresa);
        Producto saved = productoRepository.save(p);
        guardadoNotifier.publish(source, saved, empresa != null ? empresa.getId() : null);
        return saved;
    }

    @Transactional
    public void eliminarProducto(Long id) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
        p.setEstado(Constants.ESTADO_INACTIVO);
        productoRepository.save(p);
        cacheEvictor.evictProductosPublicos();
    }

    @Transactional
    public Producto toggleDestacado(Long id, Boolean valor) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
        p.setDestacado(valor);
        Producto saved = productoRepository.save(p);
        cacheEvictor.evictProductosPublicos();
        return saved;
    }

    /**
     * Aplica o quita oferta a un producto. Si enOferta=true, calcula precioOferta
     * a partir de porcentajeDescuento (o viceversa) según cuál venga informado.
     */
    @Transactional
    public Producto aplicarOferta(Long id, boolean enOferta, Integer porcentajeDescuento, Integer precioOferta) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
        p.setEnOferta(enOferta);
        if (enOferta) {
            if (porcentajeDescuento != null && porcentajeDescuento > 0) {
                p.setPorcentajeDescuento(porcentajeDescuento);
                p.setPrecioOferta((int) Math.round(p.getPrecioVenta() * (1 - porcentajeDescuento / 100.0)));
            } else if (precioOferta != null) {
                p.setPrecioOferta(precioOferta);
                int diff = p.getPrecioVenta() - precioOferta;
                p.setPorcentajeDescuento(diff > 0 ? (int) Math.round(diff * 100.0 / p.getPrecioVenta()) : 0);
            }
        } else {
            p.setPrecioOferta(null);
            p.setPorcentajeDescuento(null);
        }
        Producto saved = productoRepository.save(p);
        cacheEvictor.evictProductosPublicos();
        return saved;
    }

    @Transactional
    public Producto marcarComoVendido(Long id) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
        p.setVendido(true);
        p.setStockActual(0);
        Producto saved = productoRepository.save(p);
        cacheEvictor.evictProductosPublicos();
        return saved;
    }

    @Transactional
    public Producto toggleCarrusel(Long id, Boolean valor, Integer orden) {
        Producto p = productoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", id));
        p.setEnCarrusel(valor);
        if (orden != null) p.setOrdenCarrusel(orden);
        Producto saved = productoRepository.save(p);
        cacheEvictor.evictProductosPublicos();
        return saved;
    }
}
