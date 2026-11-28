package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.consola.QuincenaAdminService;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.Periodo;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Genera las facturas pendientes de una quincena (idempotente) y marca VENCIDA lo que pasó el plazo. No cobra nada. */
@Service
public class FacturaNegocioGeneracionService {

    static final int MAX_EMPRESAS = 10_000;

    private final PedidoRepository pedidos;
    private final FacturaNegocioRepository repo;
    private final FacturaNegocioGeneracionLotes lotes;

    public FacturaNegocioGeneracionService(PedidoRepository pedidos, FacturaNegocioRepository repo,
                                           FacturaNegocioGeneracionLotes lotes) {
        this.pedidos = pedidos;
        this.repo = repo;
        this.lotes = lotes;
    }

    public Map<String, Object> generar(Periodo periodo) {
        List<Long> ids = pedidos.empresasConVentasParaFacturaNegocio(periodo.desde().atStartOfDay(),
            periodo.hasta().plusDays(1).atStartOfDay(), QuincenaAdminService.ESTADOS, Constants.EMPRESA_PLATAFORMA_ID,
            PageRequest.of(0, MAX_EMPRESAS));
        int creadas = lotes.generar(ids, periodo);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("desde", periodo.desde());
        r.put("hasta", periodo.hasta());
        r.put("negocios", ids.size());
        r.put("creadas", creadas);
        return r;
    }

    @Transactional
    public int vencer(LocalDate hoy) {
        return repo.marcarVencidas(hoy, LocalDateTime.now(Constants.ZONA_CR));
    }
}
