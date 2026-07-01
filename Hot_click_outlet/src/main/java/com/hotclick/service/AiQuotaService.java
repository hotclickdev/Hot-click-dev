package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.AiUso;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
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
 * Controla el consumo mensual de créditos de IA por empresa.
 *
 * Límites leídos directamente de Plan.maxCreditosAi:
 *   -1 = ilimitado   (Comercio Expansión / Personalizado / ADMIN)
 *    0 = sin acceso  (Inicio Ferial)
 *   25 = 25/mes      (Emprendedor Pro)
 *
 * El flujo atómico correcto es:
 *   1. verificarYReservar()  — decrementa el slot ANTES del call HTTP a Claude
 *   2. actualizarTokens()    — actualiza tokens IN/OUT DESPUÉS del call
 * No llamar registrarUso() si ya se usó verificarYReservar().
 */
@Service
public class AiQuotaService {

    @Autowired private AiUsoRepository   aiUsoRepository;
    @Autowired private EmpresaRepository empresaRepository;

    // ── API pública ───────────────────────────────────────────────────────────

    /** Retorna true si la empresa puede hacer al menos un call de IA este mes. */
    @Transactional(readOnly = true)
    public boolean puedeUsarAi(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) return false;

        int limite = resolverLimite(empresa);
        if (limite < 0) return true;   // ilimitado
        if (limite == 0) return false;

        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        AiUso uso = aiUsoRepository.findByEmpresaIdAndAnioAndMes(
            empresaId, hoy.getYear(), hoy.getMonthValue()).orElse(null);
        int llamadas = (uso != null) ? uso.getLlamadas() : 0;
        return llamadas < limite;
    }

    /**
     * Check-and-reserve atómico: incrementa el contador de llamadas con
     * WHERE llamadas < limite (UPSERT condicional).
     * Llamar ANTES del request HTTP a Claude. Retorna true si el slot fue reservado.
     * Elimina el race condition TOCTOU que tendría puedeUsarAi() + registrarUso().
     */
    @Transactional
    public boolean verificarYReservar(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) return false;

        int limite = resolverLimite(empresa);
        if (limite < 0) return true;   // ilimitado
        if (limite == 0) return false;

        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        List<Object[]> result = aiUsoRepository.reservarSlot(
            empresaId, hoy.getYear(), hoy.getMonthValue(), limite);
        return !result.isEmpty();
    }

    /** Incrementa contadores completos (llamadas + tokens). Usar cuando NO se usó verificarYReservar(). */
    @Transactional
    public void registrarUso(Long empresaId, int tokensEntrada, int tokensSalida) {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        aiUsoRepository.upsertIncrement(empresaId, hoy.getYear(), hoy.getMonthValue(),
            1, tokensEntrada, tokensSalida);
    }

    /** Actualiza solo tokens IN/OUT después del call a Claude. Llamadas ya fue incrementado por verificarYReservar(). */
    @Transactional
    public void actualizarTokens(Long empresaId, int tokensEntrada, int tokensSalida) {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        aiUsoRepository.actualizarTokens(empresaId, hoy.getYear(), hoy.getMonthValue(),
            tokensEntrada, tokensSalida);
    }

    /** Resumen del consumo del mes actual para el dashboard. */
    @Transactional(readOnly = true)
    public Map<String, Object> getUsoMes(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        AiUso uso = aiUsoRepository.findByEmpresaIdAndAnioAndMes(
            empresaId, hoy.getYear(), hoy.getMonthValue()).orElse(null);

        int limite   = empresa != null ? resolverLimite(empresa) : 0;
        String plan  = empresa != null && empresa.getPlan() != null
                       ? empresa.getPlan().getNombre()
                       : (empresa != null ? empresa.getPlanSaas() : "Sin plan");
        int llamadas = (uso != null) ? uso.getLlamadas() : 0;
        int teInput  = (uso != null) ? uso.getTokensEntrada() : 0;
        int tsOutput = (uso != null) ? uso.getTokensSalida() : 0;

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

    // ── Resolución del límite ─────────────────────────────────────────────────

    /**
     * Resuelve el límite de créditos de IA para la empresa.
     * Prioridad:
     *   1. planSaas == "ADMIN"           → -1 (ilimitado, bypass total)
     *   2. empresa.getPlan().maxCreditosAi  → valor del Plan entity
     *   3. Fallback legacy por planSaas     → para empresas sin plan asignado
     */
    private int resolverLimite(Empresa empresa) {
        // ADMIN siempre es ilimitado independientemente del plan
        if ("ADMIN".equals(empresa.getPlanSaas())) return -1;

        Plan plan = empresa.getPlan();
        if (plan != null) return plan.getMaxCreditosAi();

        // Fallback para empresas que aún no tienen plan FK asignado
        return switch (empresa.getPlanSaas().toUpperCase()) {
            case "ENTERPRISE" -> 500;
            case "PRO"        -> 50;
            default           -> 0;
        };
    }
}
