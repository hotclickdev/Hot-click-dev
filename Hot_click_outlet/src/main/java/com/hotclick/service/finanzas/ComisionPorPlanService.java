package com.hotclick.service.finanzas;

import com.hotclick.repository.WalletTransaccionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * S6-18: comisión cobrada por semana (lunes a domingo, hora CR) y por plan.
 * Solo suma movimientos reales del ledger (CREDITO_VENTA); no estima ni proyecta montos.
 * El plan es el actual del negocio (el ledger no guarda el plan vigente al momento de la venta).
 */
@Service
public class ComisionPorPlanService {

    public static final int MAX_DIAS = 366;
    static final String SIN_PLAN = "SIN_PLAN";

    private final WalletTransaccionRepository repo;

    public ComisionPorPlanService(WalletTransaccionRepository repo) {
        this.repo = repo;
    }

    /** @throws IllegalArgumentException si el rango es inválido o mayor a {@link #MAX_DIAS}. */
    @Transactional(readOnly = true)
    public List<Fila> calcular(LocalDate desde, LocalDate hasta) {
        if (desde == null || hasta == null) throw new IllegalArgumentException("Rango requerido");
        if (hasta.isBefore(desde)) throw new IllegalArgumentException("«hasta» no puede ser anterior a «desde»");
        if (ChronoUnit.DAYS.between(desde, hasta) > MAX_DIAS) {
            throw new IllegalArgumentException("El rango máximo es de " + MAX_DIAS + " días");
        }
        Map<String, Fila> acc = new TreeMap<>();
        for (Object[] r : repo.findVentasConPlan(desde.atStartOfDay(), hasta.plusDays(1).atStartOfDay())) {
            String plan = plan((String) r[0], (String) r[1]);
            LocalDate semana = ((LocalDateTime) r[2]).toLocalDate()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            Fila f = acc.computeIfAbsent(semana + "|" + plan, k -> new Fila(semana, plan));
            f.ventas++;
            f.totalBruto += n(r[3]);
            f.comisionSaas += n(r[4]);
            f.comisionPasarela += n(r[5]);
        }
        return new ArrayList<>(acc.values());
    }

    private static String plan(String nombre, String planSaas) {
        if (nombre != null && !nombre.isBlank()) return nombre;
        if (planSaas != null && !planSaas.isBlank()) return planSaas;
        return SIN_PLAN;
    }

    private static long n(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    public static final class Fila {
        private final LocalDate semana;
        private final String plan;
        private long ventas;
        private long totalBruto;
        private long comisionSaas;
        private long comisionPasarela;

        Fila(LocalDate semana, String plan) { this.semana = semana; this.plan = plan; }

        public LocalDate getSemana() { return semana; }
        public String getPlan() { return plan; }
        public long getVentas() { return ventas; }
        public long getTotalBruto() { return totalBruto; }
        public long getComisionSaas() { return comisionSaas; }
        public long getComisionPasarela() { return comisionPasarela; }
    }
}
