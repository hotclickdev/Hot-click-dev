package com.hotclick.service;

import com.hotclick.model.PrecioSugerido;
import com.hotclick.model.Producto;
import com.hotclick.repository.PrecioSugeridoRepository;
import com.hotclick.service.ExtraccionService.PrecioExtraido;
import com.hotclick.service.ExtraccionService.ResultadoExtraccion;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PrecioSugeridoService {

    private static final double IVA = 0.13;
    private static final double IMPORTACION = 0.25;

    @Autowired private PrecioSugeridoRepository repo;

    @Transactional
    public List<PrecioSugerido> guardarPrecios(Producto producto, ResultadoExtraccion extraccion) {
        repo.deleteByProductoId(producto.getId());

        for (PrecioExtraido pe : extraccion.precios) {
            PrecioSugerido ps = new PrecioSugerido();
            ps.setProducto(producto);
            ps.setFuente(pe.fuente);
            ps.setUrlFuente(pe.url);
            ps.setPrecioUsd(pe.precioUsd);
            ps.setPrecioCrc(pe.precioCrc);
            ps.setTipoCambioUsado(extraccion.tcUsado);
            ps.setPrecioConIva(aplicarIva(pe.precioCrc));
            ps.setPrecioConImportacion(aplicarImportacion(pe.precioCrc));
            ps.setPrecioSugeridoFinal(calcularFinal(pe.precioCrc));
            repo.save(ps);
        }

        return repo.findByProductoIdOrderByFechaExtraccionDesc(producto.getId());
    }

    public int calcularFinal(int precioCrc) {
        // IVA 13% + importación 25% + margen 20%
        return (int) (precioCrc * (1 + IVA + IMPORTACION) * 1.20);
    }

    private int aplicarIva(int precio) {
        return (int) (precio * (1 + IVA));
    }

    private int aplicarImportacion(int precio) {
        return (int) (precio * (1 + IMPORTACION));
    }
}
