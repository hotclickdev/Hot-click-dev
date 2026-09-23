package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
class SuscripcionPlanSupport {

    /** Plan base activo post-V89 (FREE quedó inactivo). */
    private static final String PLAN_BASE = "EMPRENDEDOR";

    @Autowired private PlanRepository    planRepo;
    @Autowired private EmpresaRepository empresaRepo;
    @Autowired private CacheManager      cacheManager;

    @CacheEvict(value = "tenantInfo", key = "#empresa.id")
    void degradarAFree(Empresa empresa) {
        planRepo.findByNombre(PLAN_BASE).ifPresent(plan -> {
            empresa.setPlan(plan);
            empresa.setPlanSaas(PLAN_BASE);
            empresa.setEstadoPlan("VENCIDO");
            empresa.setFechaVencPlan(LocalDate.now(Constants.ZONA_CR));
            empresaRepo.save(empresa);
        });
    }

    void degradarPlanBatchConCache(List<Long> empresaIds, LocalDate hoy) {
        planRepo.findByNombre(PLAN_BASE).ifPresent(plan -> {
            empresaRepo.degradarPlanBatch(empresaIds, plan, PLAN_BASE, hoy);
            // Evicción programática: @CacheEvict no soporta colecciones de claves
            Cache tenantCache = cacheManager.getCache("tenantInfo");
            if (tenantCache != null) {
                empresaIds.forEach(id -> tenantCache.evict(id));
            }
        });
    }
}
