package com.hotclick.service.tenant;

import com.hotclick.utils.Constants;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Helpers puros de agregación / formato para el drill-down de uso por tenant.
 * Sin I/O — testeable sin Spring.
 */
public final class TenantUsoAgregacion {

    /** Claude Haiku 3.5: $0.80/M input · $4.00/M output (mismo criterio que observabilidad). */
    public static final double PRECIO_INPUT_POR_M = 0.80;
    public static final double PRECIO_OUTPUT_POR_M = 4.00;

    /** Empresa seed interna de plataforma — no es tenant del marketplace. */
    public static final long EMPRESA_PLATAFORMA_ID = 1L;

    public static final String NOTA_ALMACENAMIENTO =
        "Proxy: productos activos + imágenes de catálogo (no hay bytes por tenant en BD).";

    public record PeriodoUso(int anio, int mes, LocalDate inicio, LocalDate fin) {}

    private TenantUsoAgregacion() {}

    public static PeriodoUso periodo(Integer anio, Integer mes) {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        int a = anio != null ? anio : hoy.getYear();
        int m = mes != null ? mes : hoy.getMonthValue();
        if (m < 1 || m > 12) {
            throw new IllegalArgumentException("mes inválido");
        }
        if (a < 2000 || a > 2100) {
            throw new IllegalArgumentException("anio inválido");
        }
        LocalDate inicio = LocalDate.of(a, m, 1);
        return new PeriodoUso(a, m, inicio, inicio.plusMonths(1));
    }

    public static int creditosRestantes(int limite, long llamadas) {
        if (limite < 0) return -1;
        return (int) Math.max(0, limite - llamadas);
    }

    public static Map<String, Object> rankingDesdeFilas(
            int anio, int mes, List<Map<String, Object>> filas) {
        List<Map<String, Object>> tenants = new ArrayList<>();
        long gmvTotal = 0;
        long pedidosTotal = 0;
        long tokensTotal = 0;
        for (Map<String, Object> f : filas) {
            long id = ((Number) f.get("empresaId")).longValue();
            if (esEmpresaPlataforma(id)) continue;
            tenants.add(f);
            gmvTotal += ((Number) f.get("gmv")).longValue();
            pedidosTotal += ((Number) f.get("pedidos")).longValue();
            tokensTotal += ((Number) f.get("tokensMes")).longValue();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("anio", anio);
        out.put("mes", mes);
        out.put("tenants", tenants);
        out.put("resumen", Map.of(
            "tenants", tenants.size(),
            "gmvTotal", gmvTotal,
            "pedidosTotal", pedidosTotal,
            "tokensMesTotal", tokensTotal
        ));
        return out;
    }

    public static Map<String, Object> detalleDesdeFila(PeriodoUso periodo, Map<String, Object> fila) {
        Map<String, Object> out = new LinkedHashMap<>(fila);
        int limite = ((Number) fila.get("limiteAi")).intValue();
        long llamadas = ((Number) fila.get("llamadasAi")).longValue();
        out.put("creditosRestantes", creditosRestantes(limite, llamadas));
        out.put("anio", periodo.anio());
        out.put("mes", periodo.mes());
        out.put("notaAlmacenamiento", NOTA_ALMACENAMIENTO);
        return out;
    }

    /** Porcentaje de cuota IA (0–100). Límite ≤0 o ilimitado (-1) → 0. */
    public static int pctCuota(long llamadas, int limite) {
        if (limite <= 0) return 0;
        long pct = llamadas * 100L / limite;
        return (int) Math.min(100, pct);
    }

    /** Costo estimado USD a partir de tokens de entrada/salida. */
    public static double costoUsd(long tokensEntrada, long tokensSalida) {
        return (tokensEntrada / 1_000_000.0 * PRECIO_INPUT_POR_M)
             + (tokensSalida  / 1_000_000.0 * PRECIO_OUTPUT_POR_M);
    }

    /** Redondea a 4 decimales (mismo criterio que AiControlController). */
    public static double redondearCostoUsd(double costo) {
        return Math.round(costo * 10_000.0) / 10_000.0;
    }

    /**
     * Límite de créditos IA: -1 ilimitado (ADMIN), Plan.maxCreditosAi, o legacy.
     */
    public static int resolverLimite(Integer maxCreditosAi, String planSaas) {
        if (planSaas != null && "ADMIN".equalsIgnoreCase(planSaas)) {
            return -1;
        }
        if (maxCreditosAi != null) {
            return maxCreditosAi;
        }
        if (planSaas == null) return 0;
        return switch (planSaas.toUpperCase()) {
            case "ENTERPRISE" -> 500;
            case "PRO" -> 50;
            default -> 0;
        };
    }

    public static boolean esEmpresaPlataforma(long empresaId) {
        return empresaId == EMPRESA_PLATAFORMA_ID;
    }

    /** Mapa base de fila de uso (sin I/O). */
    public static Map<String, Object> filaUso(
            long empresaId,
            String nombre,
            String slug,
            String estadoEmpresa,
            String plan,
            long gmv,
            long pedidos,
            long gmvMes,
            long pedidosMes,
            long llamadasAi,
            long tokensEntrada,
            long tokensSalida,
            int limiteAi,
            long productos,
            long imagenes
    ) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("empresaId", empresaId);
        m.put("nombre", nombre);
        m.put("slug", slug);
        m.put("estadoEmpresa", estadoEmpresa);
        m.put("plan", plan);
        m.put("gmv", gmv);
        m.put("pedidos", pedidos);
        m.put("gmvMes", gmvMes);
        m.put("pedidosMes", pedidosMes);
        m.put("llamadasAi", llamadasAi);
        m.put("tokensEntrada", tokensEntrada);
        m.put("tokensSalida", tokensSalida);
        m.put("tokensMes", tokensEntrada + tokensSalida);
        m.put("limiteAi", limiteAi);
        m.put("pctCuotaAi", pctCuota(llamadasAi, limiteAi));
        m.put("costoAiUsd", redondearCostoUsd(costoUsd(tokensEntrada, tokensSalida)));
        m.put("productos", productos);
        m.put("imagenes", imagenes);
        return m;
    }
}
