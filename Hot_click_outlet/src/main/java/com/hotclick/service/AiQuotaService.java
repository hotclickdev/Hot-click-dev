package com.hotclick.service;

import com.hotclick.model.AiUso;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AiUsoRepository;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Enforces monthly AI call limits per SaaS plan.
 *
 * Plan limits (calls/month):
 *   GRATUITO   → 0   (AI disabled)
 *   PRO        → 50
 *   ENTERPRISE → 500
 *   ADMIN_IT   → unlimited
 */
@Service
public class AiQuotaService {

    private static final Map<String, Integer> LIMITES = Map.of(
        "GRATUITO",   0,
        "PRO",        50,
        "ENTERPRISE", 500
    );

    @Autowired private AiUsoRepository   aiUsoRepository;
    @Autowired private EmpresaRepository empresaRepository;

    /** Returns true if the empresa can make another AI call this month. */
    public boolean puedeUsarAi(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) return false;

        int limite = limiteParaPlan(empresa.getPlanSaas());
        if (limite < 0) return true; // unlimited (ADMIN_IT sentinel)
        if (limite == 0) return false;

        LocalDate hoy = LocalDate.now();
        AiUso uso = aiUsoRepository.findByEmpresaIdAndAnioAndMes(
            empresaId, hoy.getYear(), hoy.getMonthValue()).orElse(null);
        int llamadas = (uso != null) ? uso.getLlamadas() : 0;
        return llamadas < limite;
    }

    /** Atomically increments usage counters. Safe under PgBouncer transaction mode (short TX). */
    @Transactional
    public void registrarUso(Long empresaId, int tokensEntrada, int tokensSalida) {
        LocalDate hoy = LocalDate.now();
        aiUsoRepository.upsertIncrement(empresaId, hoy.getYear(), hoy.getMonthValue(),
            1, tokensEntrada, tokensSalida);
    }

    public Map<String, Object> getUsoMes(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        LocalDate hoy = LocalDate.now();
        AiUso uso = aiUsoRepository.findByEmpresaIdAndAnioAndMes(
            empresaId, hoy.getYear(), hoy.getMonthValue()).orElse(null);

        String plan    = empresa != null ? empresa.getPlanSaas() : "GRATUITO";
        int limite     = limiteParaPlan(plan);
        int llamadas   = (uso != null) ? uso.getLlamadas() : 0;
        int teInput    = (uso != null) ? uso.getTokensEntrada() : 0;
        int tsOutput   = (uso != null) ? uso.getTokensSalida() : 0;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("plan",          plan);
        m.put("llamadas",      llamadas);
        m.put("limite",        limite);
        m.put("tokensEntrada", teInput);
        m.put("tokensSalida",  tsOutput);
        m.put("habilitado",    limite != 0);
        m.put("porcentaje",    limite > 0 ? Math.min(100, llamadas * 100 / limite) : 0);
        return m;
    }

    /**
     * Atomic check-and-reserve: llama reservarSlot() que hace el UPSERT con WHERE llamadas < limite.
     * Llamar ANTES del HTTP call a Claude. Devuelve true si el slot fue reservado.
     * Reemplaza el par puedeUsarAi() + registrarUso() eliminando el race condition TOCTOU.
     */
    @Transactional
    public boolean verificarYReservar(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) return false;

        int limite = limiteParaPlan(empresa.getPlanSaas());
        if (limite < 0) return true;  // unlimited (ADMIN_IT)
        if (limite == 0) return false;

        LocalDate hoy = LocalDate.now();
        List<Object[]> result = aiUsoRepository.reservarSlot(
            empresaId, hoy.getYear(), hoy.getMonthValue(), limite);
        return !result.isEmpty();
    }

    /**
     * Actualiza solo los contadores de tokens después del HTTP call a Claude.
     * llamadas ya fue incrementado por verificarYReservar(). NO llamar registrarUso() después.
     */
    @Transactional
    public void actualizarTokens(Long empresaId, int tokensEntrada, int tokensSalida) {
        LocalDate hoy = LocalDate.now();
        aiUsoRepository.actualizarTokens(empresaId, hoy.getYear(), hoy.getMonthValue(),
            tokensEntrada, tokensSalida);
    }

    private int limiteParaPlan(String plan) {
        if (plan == null) return 0;
        // ADMIN_IT is stored as "ADMIN_IT" in planSaas; treat as unlimited
        if ("ADMIN_IT".equals(plan)) return -1;
        return LIMITES.getOrDefault(plan.toUpperCase(), 0);
    }
}
