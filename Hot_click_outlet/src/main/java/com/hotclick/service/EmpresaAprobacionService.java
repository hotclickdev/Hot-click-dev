package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Aprobación de un negocio (empresa) del marketplace.
 *
 * Regla de negocio: aprobar una empresa significa hacerla visible al público
 * Y publicar sus productos activos en el catálogo principal — las tres
 * escrituras en una sola transacción. El registro del emprendedor fuerza
 * visibilidad_publica=false; sin restaurarla aquí, la empresa aprobada queda
 * fuera del gate del catálogo público (ProductoRepository.findByEstadoAndEmpresaAprobada)
 * y sus productos no se ven — incidente del 2026-07-12.
 *
 * Toda ruta que active una empresa (aprobación formal o cambio de estado del
 * admin) debe pasar por acá, no setear estado_empresa por su cuenta.
 */
@Service
public class EmpresaAprobacionService {

    @Autowired private EmpresaRepository             empresaRepository;
    @Autowired private ProductoRepository            productoRepository;
    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private ProductoService               productoService;

    @Transactional
    public Empresa aprobarYPublicar(Long empresaId) {
        Empresa e = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalStateException("Empresa no encontrada: " + empresaId));
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        if (e.getFechaAprobacion() == null) e.setFechaAprobacion(ahora);
        empresaRepository.save(e);
        productoRepository.publicarProductosDeEmpresa(empresaId);
        solicitudAprobacionRepository.aprobarPendientesProductoDeEmpresa(empresaId, ahora);
        // El catálogo público se cachea 60s (Caffeine "productos-publicos"); sin el
        // evict, los productos recién publicados tardarían en aparecer.
        productoService.evictProductosPublicos();
        return e;
    }
}
