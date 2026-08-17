package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FacturacionPollingService {

    private static final Logger log = LoggerFactory.getLogger(FacturacionPollingService.class);

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final EmpresaRepository empresaRepo;
    private final FacturacionEnvioProcessor envioProcessor;

    public FacturacionPollingService(ComprobanteFiscalRepository comprobanteRepo,
                                     EmpresaRepository empresaRepo,
                                     FacturacionEnvioProcessor envioProcessor) {
        this.comprobanteRepo = comprobanteRepo;
        this.empresaRepo     = empresaRepo;
        this.envioProcessor  = envioProcessor;
    }

    @Transactional
    public void consultarPendientesHacienda() {
        for (var empresa : empresaRepo.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")) {
            try {
                consultarPendientesDeEmpresa(empresa.getId());
            } catch (Exception e) {
                log.error("[facturacion] Error empresa={}: {}", empresa.getId(), e.getMessage());
            }
        }
    }

    private void consultarPendientesDeEmpresa(Long empresaId) {
        List<ComprobanteFiscal> pendientes = comprobanteRepo.findPendientesDeConsulta(empresaId);
        if (pendientes.isEmpty()) return;

        log.info("[facturacion] Polling Hacienda empresa={}: {} comprobantes pendientes", empresaId, pendientes.size());

        for (ComprobanteFiscal cf : pendientes) {
            try {
                if (ComprobanteFiscal.ESTADO_PENDIENTE.equals(cf.getEstado())) {
                    envioProcessor.procesarComprobante(cf.getId());
                } else if (ComprobanteFiscal.ESTADO_ENVIADO.equals(cf.getEstado())) {
                    envioProcessor.actualizarEstadoDesdeHacienda(cf);
                }
            } catch (Exception e) {
                log.error("[facturacion] Error en polling comprobante={}: {}", cf.getId(), e.getMessage());
            }
        }
    }
}
