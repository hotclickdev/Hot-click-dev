package com.hotclick.service.telegram;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
class TelegramPlanConsulta {

    @Autowired private EmpresaRepository empresaRepository;

    boolean tieneCrm(Long empresaId) {
        Plan plan = planDe(empresaId);
        return plan != null && Boolean.TRUE.equals(plan.getTieneCrm());
    }

    boolean tieneIa(Long empresaId) {
        Plan plan = planDe(empresaId);
        if (plan == null) return true;
        if (!Boolean.TRUE.equals(plan.getTieneAi())) return false;
        Integer creditos = plan.getMaxCreditosAi();
        return creditos == null || creditos != 0;
    }

    private Plan planDe(Long empresaId) {
        if (empresaId == null) return null;
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        return empresa != null ? empresa.getPlan() : null;
    }
}
