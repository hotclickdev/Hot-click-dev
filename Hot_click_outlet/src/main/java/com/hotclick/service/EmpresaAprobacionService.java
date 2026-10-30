package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
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
    @Autowired private UbicacionDespachoService      ubicacionDespachoService;
    @Autowired private CupoEmprendedorAprobacionService cupoEmprendedorAprobacionService;

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Empresa aprobarYPublicar(Long empresaId) {
        // Lock pesimista: el estado se lee fresco y el job de impago espera al commit (sin carrera).
        Empresa e = empresaRepository.findByIdForUpdate(empresaId)
            .orElseThrow(() -> new IllegalStateException("Empresa no encontrada: " + empresaId));
        // Aprobar/publicar nunca reactiva un impago: solo el pago ONVO confirmado (SuspensionImpago.reactivarSiSuspendida).
        if (com.hotclick.service.suscripcion.SuspensionImpago.estaSuspendida(e.getEstadoEmpresa())) {
            throw new com.hotclick.exception.ReactivacionSinPagoException();
        }
        ubicacionDespachoService.exigirParaPublicar(empresaId);
        // Puesto y trial Emprendedor cuentan desde acá (correo verificado, un puesto por persona). Si el propietario no
        // verificó su correo lanza y se revierte toda la aprobación sin consumir puesto.
        var cupo = cupoEmprendedorAprobacionService.resolverAlAprobar(e);
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(cupo != CupoEmprendedorAprobacionService.Resultado.REQUIERE_MEMBRESIA);
        if (Constants.ESTADO_PLAN_PRUEBA_CERRADA.equals(e.getEstadoPlan())) {
            e.setEstadoPlan("ACTIVO");
            e.setFechaVencPlan(null);
            e.setTrialHasta(null);
        }
        if (e.getFechaAprobacion() == null) e.setFechaAprobacion(ahora);
        empresaRepository.save(e);
        productoRepository.publicarProductosDeEmpresa(empresaId);
        solicitudAprobacionRepository.aprobarPendientesProductoDeEmpresa(empresaId, ahora);
        // El catálogo público se cachea 60s (Caffeine "productos-publicos"); sin el
        // evict, los productos recién publicados tardarían en aparecer.
        productoService.evictProductosPublicos();
        return e;
    }

    /**
     * Rechazo de un negocio. Marca RECHAZADO y libera su puesto de trial si lo tenía, en la misma transacción y bajo el
     * lock de la empresa (con el contador atómico, sin doble liberación). Devuelve null si la empresa no existe.
     */
    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Empresa rechazar(Long empresaId) {
        Empresa e = empresaRepository.findByIdForUpdate(empresaId).orElse(null);
        if (e == null) return null;
        cupoEmprendedorAprobacionService.liberarAlRechazar(e);
        e.setEstadoEmpresa("RECHAZADO");
        return empresaRepository.save(e);
    }
}
