package com.hotclick.service.prueba;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;

/** Cierra las pruebas QA al mes y registra el pedido de autorización. */
@Service
public class PruebaPlanService {

    private final EmpresaRepository empresaRepository;
    private final CacheManager cacheManager;

    public PruebaPlanService(EmpresaRepository empresaRepository, CacheManager cacheManager) {
        this.empresaRepository = empresaRepository;
        this.cacheManager = cacheManager;
    }

    @Transactional
    public void cerrarSiVencio(Long empresaId) {
        if (empresaId == null) return;
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null || !esQa(empresa)) return;
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        if (!PruebaPlanCierre.debeCerrar(empresa.getEstadoPlan(), empresa.getFechaVencPlan(), hoy)) return;
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_PRUEBA_CERRADA);
        empresa.setEstadoEmpresa(Constants.ESTADO_PLAN_PRUEBA_CERRADA);
        empresa.setVisibilidadPublica(false);
        empresaRepository.save(empresa);
        evict(empresaId);
    }

    @Transactional
    public Map<String, String> solicitarAutorizacion(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalStateException("Negocio no encontrado"));
        if (!esQa(empresa) || !Constants.ESTADO_PLAN_PRUEBA_CERRADA.equals(empresa.getEstadoPlan())) {
            throw new IllegalStateException("La prueba todavía está abierta");
        }
        if (!"PENDIENTE_APROBACION".equals(empresa.getEstadoEmpresa())) {
            empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
            empresa.setVisibilidadPublica(false);
            empresaRepository.save(empresa);
            evict(empresaId);
        }
        return Map.of(
            "estadoPlan", empresa.getEstadoPlan(),
            "estadoEmpresa", empresa.getEstadoEmpresa());
    }

    static boolean esQa(Empresa empresa) {
        String correo = empresa.getCorreoEmpresa();
        if (correo == null) return false;
        String normalizado = correo.toLowerCase();
        return Constants.CORREO_QA_EMPRENDEDOR.equals(normalizado)
            || Constants.CORREO_QA_PYME.equals(normalizado)
            || Constants.CORREO_QA_NEGOCIO_PLUS.equals(normalizado);
    }

    private void evict(Long empresaId) {
        Cache cache = cacheManager.getCache("tenantInfo");
        if (cache != null) cache.evict(empresaId);
    }
}
