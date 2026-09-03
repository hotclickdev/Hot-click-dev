package com.hotclick.service;

import com.hotclick.model.PayoutRequest;
import com.hotclick.model.ReporteProducto;
import com.hotclick.model.SolicitudRecoleccion;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PayoutRequestRepository;
import com.hotclick.repository.ReporteProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.repository.SolicitudRecoleccionRepository;
import com.hotclick.repository.TestimonioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Conteos de la bandeja de moderación.
 * Garantías y Servicios HOT quedan fuera a propósito (operación, no contenido).
 */
@Service
public class ModeracionResumenService {

    private final EmpresaRepository empresaRepository;
    private final SolicitudAprobacionRepository solicitudAprobacionRepository;
    private final SolicitudRecoleccionRepository recoleccionRepository;
    private final ComprobanteSinpeRepository comprobanteSinpeRepository;
    private final TestimonioRepository testimonioRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final ReporteProductoRepository reporteProductoRepository;

    public ModeracionResumenService(
            EmpresaRepository empresaRepository,
            SolicitudAprobacionRepository solicitudAprobacionRepository,
            SolicitudRecoleccionRepository recoleccionRepository,
            ComprobanteSinpeRepository comprobanteSinpeRepository,
            TestimonioRepository testimonioRepository,
            PayoutRequestRepository payoutRequestRepository,
            ReporteProductoRepository reporteProductoRepository) {
        this.empresaRepository = empresaRepository;
        this.solicitudAprobacionRepository = solicitudAprobacionRepository;
        this.recoleccionRepository = recoleccionRepository;
        this.comprobanteSinpeRepository = comprobanteSinpeRepository;
        this.testimonioRepository = testimonioRepository;
        this.payoutRequestRepository = payoutRequestRepository;
        this.reporteProductoRepository = reporteProductoRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> resumen() {
        Map<String, Object> data = new LinkedHashMap<>();
        long empresas = empresaRepository.countByEstadoEmpresa("PENDIENTE_APROBACION");
        long ofertas = solicitudAprobacionRepository.countByEstadoSolicitudAndTipoEntidad("PENDIENTE", "OFERTA");
        long recolecciones = recoleccionRepository.countByEstado(SolicitudRecoleccion.ESTADO_PENDIENTE);
        long sinpe = comprobanteSinpeRepository.countByEstado("PENDIENTE");
        long testimonios = testimonioRepository.countByEstado("PENDIENTE");
        long payouts = payoutRequestRepository.countByEstado(PayoutRequest.PENDIENTE);
        long reportes = reporteProductoRepository.countByEstado(ReporteProducto.PENDIENTE);
        data.put("empresas", empresas);
        data.put("ofertas", ofertas);
        data.put("recolecciones", recolecciones);
        data.put("sinpe", sinpe);
        data.put("testimonios", testimonios);
        data.put("payouts", payouts);
        data.put("reportesProducto", reportes);
        data.put("total", empresas + ofertas + recolecciones + sinpe + testimonios + payouts + reportes);
        return data;
    }
}
