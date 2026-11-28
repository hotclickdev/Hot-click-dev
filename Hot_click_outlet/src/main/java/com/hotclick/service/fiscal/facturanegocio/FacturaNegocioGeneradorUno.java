package com.hotclick.service.fiscal.facturanegocio;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaNegocio;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.Periodo;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** Crea el registro de UN negocio para UNA quincena, si todavía no existe (idempotente). */
@Service
public class FacturaNegocioGeneradorUno {

    private final FacturaNegocioRepository repo;
    private final EmpresaRepository empresas;
    private final FacturaNegocioMontoService montos;
    private final ConfiguracionFiscalService config;
    private final ObjectMapper json;

    public FacturaNegocioGeneradorUno(FacturaNegocioRepository repo, EmpresaRepository empresas,
                                      FacturaNegocioMontoService montos, ConfiguracionFiscalService config,
                                      ObjectMapper json) {
        this.repo = repo;
        this.empresas = empresas;
        this.montos = montos;
        this.config = config;
        this.json = json;
    }

    /** @return true si lo creó; false si ya existía, si la empresa no existe o si no vendió productos. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean generar(Long empresaId, Periodo periodo) {
        if (repo.findByEmpresaIdAndPeriodoDesdeAndPeriodoHasta(empresaId, periodo.desde(), periodo.hasta()).isPresent()) {
            return false;
        }
        Empresa empresa = empresas.findById(empresaId).orElse(null);
        if (empresa == null) return false;
        FacturaNegocioMontoService.Monto m = montos.calcular(empresaId, periodo, config.reglasFactura().base());
        if (m.productos() <= 0) return false;
        boolean aplica = FacturaNegocioCalculo.leCorrespondeFacturar(empresa.getSituacionFiscal(), empresa.isFiscalVerificado());
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        FacturaNegocio f = new FacturaNegocio();
        f.setEmpresaId(empresaId);
        f.setPeriodoDesde(periodo.desde());
        f.setPeriodoHasta(periodo.hasta());
        f.setMontoCrc(m.monto());
        f.setFechaLimite(FacturaNegocioCalculo.fechaLimite(periodo.hasta(), config.reglas().diasEnviarFactura()));
        f.setEstado(aplica ? FacturaNegocio.PENDIENTE : FacturaNegocio.NO_APLICA);
        f.setDesgloseJson(desglose(m));
        f.setFechaCreacion(ahora);
        f.setFechaActualizacion(ahora);
        repo.save(f);
        return true;
    }

    private String desglose(FacturaNegocioMontoService.Monto m) {
        try {
            return json.writeValueAsString(m.desglose());
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
