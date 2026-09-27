package com.hotclick.service;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Ubicación de despacho (provincia, cantón y dirección) de un negocio: sin
 * ella no se aprueba el negocio ni se publican productos nuevos. La regla se
 * enciende con {@code hotclick.ubicacion-despacho.obligatoria} cuando los
 * negocios ya aprobados tienen su ubicación cargada; nunca oculta productos
 * que ya están publicados.
 */
@Service
public class UbicacionDespachoService {

    public static final String MENSAJE_FALTA_UBICACION =
        "Cargá la ubicación de despacho del negocio (provincia, cantón y dirección) antes de publicar.";

    @Value("${hotclick.ubicacion-despacho.obligatoria:false}")
    private boolean obligatoria;

    @Autowired private BodegaRepository  bodegaRepository;
    @Autowired private EmpresaRepository empresaRepository;

    public static boolean tieneUbicacion(Bodega bodega) {
        return bodega != null
            && noVacio(bodega.getProvincia())
            && noVacio(bodega.getCanton())
            && noVacio(bodega.getDireccionExacta());
    }

    @Transactional(readOnly = true)
    public boolean empresaTieneUbicacion(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa != null && tieneUbicacion(empresa.getBodegaVentaOnline())) return true;
        return bodegaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO).stream()
            .anyMatch(UbicacionDespachoService::tieneUbicacion);
    }

    public boolean isObligatoria() {
        return obligatoria;
    }

    /** Estado que ve el panel del negocio para avisar que falta la ubicación. */
    public record EstadoUbicacion(boolean tieneUbicacion, boolean obligatoria) {}

    /**
     * Sin negocio en el scope (admin de plataforma, staff o comprador) no hay
     * nada que cargar: se responde {@code tieneUbicacion = true} para no avisar.
     */
    @Transactional(readOnly = true)
    public EstadoUbicacion estadoDe(Long empresaId) {
        boolean tiene = empresaId == null || empresaTieneUbicacion(empresaId);
        return new EstadoUbicacion(tiene, obligatoria);
    }

    /** True si la regla está encendida y al negocio le falta la ubicación. */
    public boolean bloqueaPublicacion(Long empresaId) {
        return obligatoria && empresaId != null && !empresaTieneUbicacion(empresaId);
    }

    public void exigirParaPublicar(Long empresaId) {
        if (bloqueaPublicacion(empresaId)) {
            throw new IllegalStateException(MENSAJE_FALTA_UBICACION);
        }
    }

    /** Negocios activos sin ubicación de despacho, para el panel de admin. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> activosSinUbicacion() {
        return empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO").stream()
            .filter(e -> !empresaTieneUbicacion(e.getId()))
            .map(UbicacionDespachoService::resumen)
            .toList();
    }

    private static Map<String, Object> resumen(Empresa empresa) {
        Map<String, Object> fila = new LinkedHashMap<>();
        fila.put("id", empresa.getId());
        fila.put("nombreComercial", empresa.getNombreComercial());
        fila.put("visibilidadPublica", Boolean.TRUE.equals(empresa.getVisibilidadPublica()));
        return fila;
    }

    private static boolean noVacio(String valor) {
        return valor != null && !valor.isBlank();
    }
}
