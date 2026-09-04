package com.hotclick.service.billing;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.BillingLedgerRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaSaasRepository;
import com.hotclick.repository.SuscripcionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminBillingService {

    private static final int LEDGER_PAGE = 40;
    private static final int FACTURAS_PAGE = 30;

    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final FacturaSaasRepository facturaRepo;
    private final BillingLedgerRepository ledgerRepo;

    public AdminBillingService(EmpresaRepository empresaRepo,
                               SuscripcionRepository suscripcionRepo,
                               FacturaSaasRepository facturaRepo,
                               BillingLedgerRepository ledgerRepo) {
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
        this.facturaRepo = facturaRepo;
        this.ledgerRepo = ledgerRepo;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listarConsola() {
        List<Empresa> empresas = empresasDeTenants();
        Map<Long, Suscripcion> subPorEmpresa = suscripcionesVigentes();
        Map<Long, Long> fallos = fallosPorEmpresa();

        List<Map<String, Object>> filas = new ArrayList<>();
        for (Empresa e : empresas) {
            long nFallos = fallos.getOrDefault(e.getId(), 0L);
            filas.add(AdminBillingMapper.filaLista(e, subPorEmpresa.get(e.getId()), nFallos));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("empresas", filas);
        out.put("kpis", AdminBillingMapper.kpisDeFilas(filas));
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalleEmpresa(Long empresaId) {
        Empresa e = empresaRepo.findByIdWithPlan(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        if (AdminBillingMapper.esEmpresaPlataforma(e)) {
            throw new RecursoNoEncontradoException("Empresa de plataforma sin billing de tenant");
        }

        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        long fallos = facturaRepo.countByEmpresaIdAndEstado(empresaId, "FALLIDO")
            + ledgerRepo.countByEmpresaIdAndTipo(empresaId, BillingLedger.TIPO_COBRO_FALLIDO);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("empresa", AdminBillingMapper.filaLista(e, sub, fallos));
        out.put("suscripcion", AdminBillingMapper.detalleSuscripcion(sub));
        out.put("facturas", facturaRepo
            .findByEmpresaIdOrderByFechaCreacionDesc(empresaId, PageRequest.of(0, FACTURAS_PAGE))
            .getContent()
            .stream()
            .map(AdminBillingMapper::mapaFactura)
            .toList());
        out.put("ledger", ledgerRepo
            .findByEmpresaIdOrderByFechaEventoDesc(empresaId, PageRequest.of(0, LEDGER_PAGE))
            .stream()
            .map(AdminBillingMapper::mapaLedger)
            .toList());
        return out;
    }

    private List<Empresa> empresasDeTenants() {
        return empresaRepo.findAllWithPlanOrderByFechaRegistroDesc().stream()
            .filter(e -> !AdminBillingMapper.esEmpresaPlataforma(e))
            .toList();
    }

    private Map<Long, Suscripcion> suscripcionesVigentes() {
        return suscripcionRepo.findVigentesConPlanYEmpresa().stream()
            .collect(Collectors.toMap(
                s -> s.getEmpresa().getId(),
                s -> s,
                (a, b) -> a.getFechaCreacion().isAfter(b.getFechaCreacion()) ? a : b));
    }

    private Map<Long, Long> fallosPorEmpresa() {
        Map<Long, Long> factura = aMapaConteo(facturaRepo.countPorEmpresaAndEstado("FALLIDO"));
        Map<Long, Long> ledger = aMapaConteo(
            ledgerRepo.countPorEmpresaAndTipo(BillingLedger.TIPO_COBRO_FALLIDO));
        ledger.forEach((id, n) -> factura.merge(id, n, Long::sum));
        return factura;
    }

    private static Map<Long, Long> aMapaConteo(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row[0] == null || row[1] == null) continue;
            map.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return map;
    }
}
