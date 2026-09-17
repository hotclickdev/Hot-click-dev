package com.hotclick.service.producto;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import org.springframework.stereotype.Component;

@Component
public class SkuAsignador {

    private final EmpresaRepository empresaRepository;
    private final ProductoRepository productoRepository;

    public SkuAsignador(EmpresaRepository empresaRepository, ProductoRepository productoRepository) {
        this.empresaRepository = empresaRepository;
        this.productoRepository = productoRepository;
    }

    public void asignarSiguiente(Producto producto, Empresa empresa) {
        if (empresa == null || empresa.getId() == null) {
            throw new IllegalArgumentException("El producto necesita un negocio para asignar SKU");
        }
        Empresa bloqueada = empresaRepository.findByIdForUpdate(empresa.getId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresa.getId()));
        int siguiente = productoRepository.maxNumeroLocalByEmpresaId(bloqueada.getId()) + 1;
        producto.setNumeroLocal(siguiente);
        producto.setSku(SkuEmpresa.formato(bloqueada.getId(), siguiente));
        producto.setEmpresa(bloqueada);
    }
}
