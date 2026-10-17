package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * S4-23 (Frontend #180): ventas de una semana (lunes a domingo, hora CR) del propio negocio.
 * Bruto y comisión salen de lo que el ledger ya registró en cada venta (CREDITO_VENTA); el porcentaje y el
 * mínimo vienen del plan guardado. No recalcula ni inventa montos.
 */
@RestController
@RequestMapping("/api/negocio/ventas")
@PreAuthorize("hasRole('EMPRENDEDOR')")
public class NegocioVentasSemanaController {

    /** Tope de ventas por semana en la respuesta (protege el endpoint ante negocios muy grandes). */
    static final int MAX_LIST_VENTAS = 5000;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NegocioVentasSemanaController.class);

    private final CompanyScope companyScope;
    private final EmpresaRepository empresaRepository;
    private final WalletTransaccionRepository ledger;
    private final com.hotclick.repository.PedidoItemRepository pedidoItems;

    public NegocioVentasSemanaController(CompanyScope companyScope, EmpresaRepository empresaRepository,
                                         WalletTransaccionRepository ledger,
                                         com.hotclick.repository.PedidoItemRepository pedidoItems) {
        this.companyScope = companyScope;
        this.empresaRepository = empresaRepository;
        this.ledger = ledger;
        this.pedidoItems = pedidoItems;
    }

    @GetMapping("/semana")
    @Transactional(readOnly = true)
    public ResponseEntity<ResponseDTO> semana(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde) {
        Long empresaId = companyScope.requireEmpresaId();
        LocalDate base = desde != null ? desde : LocalDate.now(Constants.ZONA_CR);
        LocalDate lunes = base.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate domingo = lunes.plusDays(6);

        Plan plan = empresaRepository.findById(empresaId).map(Empresa::getPlan).orElse(null);
        BigDecimal pct = plan != null ? plan.getComisionPorcentaje() : null;
        Integer minimo = minimoDelPlan(plan);

        List<WalletTransaccion> filas = ledger
            .findByEmpresaIdAndTipoAndFechaCreacionGreaterThanEqualAndFechaCreacionLessThanOrderByFechaCreacionAsc(
                empresaId, WalletTransaccion.CREDITO_VENTA, lunes.atStartOfDay(), domingo.plusDays(1).atStartOfDay(),
                org.springframework.data.domain.PageRequest.of(0, MAX_LIST_VENTAS));
        Map<Long, String> productoPorPedido = productos(filas, empresaId);

        List<Map<String, Object>> ventas = new ArrayList<>();
        long tBruto = 0, tComision = 0, conMinimo = 0;
        for (WalletTransaccion t : filas) {
            long bruto = n(t.getTotalBruto());
            long comision = n(t.getComisionSaas()) + n(t.getComisionGw());
            Long porPct = pct != null ? BigDecimal.valueOf(bruto).multiply(pct)
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).longValue() : null;
            boolean minimoAplicado = minimo != null && porPct != null && porPct < minimo && n(t.getComisionSaas()) >= minimo;
            if (minimoAplicado) conMinimo++;
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("id", t.getId());
            v.put("fecha", t.getFechaCreacion().toString());
            v.put("producto", WalletTransaccion.REF_PEDIDO.equals(t.getReferenciaTipo())
                ? productoPorPedido.get(t.getReferenciaId()) : null);
            v.put("bruto", bruto);
            v.put("comisionPorcentaje", porPct);
            v.put("minimoAplicado", minimoAplicado);
            v.put("comision", comision);
            v.put("neto", bruto - comision);
            ventas.add(v);
            tBruto += bruto;
            tComision += comision;
        }
        Map<String, Object> totales = new LinkedHashMap<>();
        totales.put("bruto", tBruto);
        totales.put("comision", tComision);
        totales.put("neto", tBruto - tComision);
        totales.put("conMinimo", conMinimo);
        totales.put("cantidad", ventas.size());

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("desde", lunes.toString());
        d.put("hasta", domingo.toString());
        d.put("porcentaje", pct);
        d.put("minimoComision", minimo);
        d.put("ventas", ventas);
        d.put("totales", totales);
        return ResponseEntity.ok(ResponseDTO.success("Ventas de la semana", d));
    }

    /**
     * Nombre del producto vendido por pedido (un solo pedido → su producto; varios ítems → «Primero y N más»).
     * Una sola consulta para toda la semana. Sin pedido o sin ítems, el pedido no aparece y {@code producto} es null.
     */
    private Map<Long, String> productos(List<WalletTransaccion> filas, Long empresaId) {
        java.util.Set<Long> pedidoIds = new java.util.HashSet<>();
        for (WalletTransaccion t : filas) {
            if (WalletTransaccion.REF_PEDIDO.equals(t.getReferenciaTipo()) && t.getReferenciaId() != null) {
                pedidoIds.add(t.getReferenciaId());
            }
        }
        if (pedidoIds.isEmpty()) return Map.of();
        Map<Long, List<String>> nombres = new LinkedHashMap<>();
        for (Object[] r : pedidoItems.nombresProductoPorPedido(pedidoIds, empresaId)) {
            nombres.computeIfAbsent((Long) r[0], k -> new ArrayList<>()).add((String) r[1]);
        }
        Map<Long, String> etiqueta = new java.util.HashMap<>();
        nombres.forEach((id, lista) -> etiqueta.put(id, etiquetaProducto(lista)));
        return etiqueta;
    }

    /**
     * Mínimo de comisión desde la configuración del plan (decisión del dueño: ₡700, cargado en V168).
     * Si al plan le falta el valor (null o 0), devuelve null y deja un WARN con id y nombre del plan.
     */
    static Integer minimoDelPlan(Plan plan) {
        if (plan == null) return null;
        Integer m = plan.getComisionMinimaCrc();
        if (m != null && m > 0) return m;
        log.warn("[ventas-semana] Configuración faltante: el plan id={} nombre={} no tiene comisionMinimaCrc",
            plan.getId(), plan.getNombre());
        return null;
    }

    static String etiquetaProducto(List<String> nombres) {
        if (nombres == null || nombres.isEmpty()) return null;
        return nombres.size() == 1 ? nombres.get(0) : nombres.get(0) + " y " + (nombres.size() - 1) + " más";
    }

    private static long n(Long v) { return v == null ? 0L : v; }
}
