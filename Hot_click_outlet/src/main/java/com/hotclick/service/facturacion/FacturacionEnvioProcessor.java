package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.service.FacturacionContingenciaService;
import com.hotclick.service.FirmaDigitalService;
import com.hotclick.service.HaciendaApiClient;
import com.hotclick.service.XmlFacturaBuilder;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class FacturacionEnvioProcessor {

    private static final Logger log = LoggerFactory.getLogger(FacturacionEnvioProcessor.class);
    private static final int MAX_INTENTOS = 5;

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final XmlFacturaBuilder xmlBuilder;
    private final FirmaDigitalService firmaService;
    private final HaciendaApiClient haciendaClient;
    private final FacturacionContingenciaService contingenciaService;

    public FacturacionEnvioProcessor(ComprobanteFiscalRepository comprobanteRepo,
                                     XmlFacturaBuilder xmlBuilder,
                                     FirmaDigitalService firmaService,
                                     HaciendaApiClient haciendaClient,
                                     FacturacionContingenciaService contingenciaService) {
        this.comprobanteRepo     = comprobanteRepo;
        this.xmlBuilder          = xmlBuilder;
        this.firmaService        = firmaService;
        this.haciendaClient      = haciendaClient;
        this.contingenciaService = contingenciaService;
    }

    @Transactional
    public void procesarComprobante(Long comprobanteId) {
        ComprobanteFiscal cf = comprobanteRepo.findById(comprobanteId).orElse(null);
        if (cf == null) return;

        if (!ComprobanteFiscal.ESTADO_PENDIENTE.equals(cf.getEstado())) {
            log.warn("[facturacion] Comprobante={} ya en estado {} — skip envío duplicado",
                comprobanteId, cf.getEstado());
            return;
        }

        Empresa empresa = cf.getEmpresa();
        Pedido  pedido  = cf.getPedido();

        if (!empresa.isConfiguracionFiscalCompleta()) {
            log.warn("[facturacion] empresa={} sin config fiscal completa — stub mode", empresa.getId());
        }

        cf.setIntentosEnvio(cf.getIntentosEnvio() + 1);
        cf.setEstado(ComprobanteFiscal.ESTADO_ENVIADO);
        comprobanteRepo.save(cf);

        try {
            String xmlSinFirmar = xmlBuilder.construir(cf, empresa, pedido);
            String xmlFirmado   = firmaService.firmar(xmlSinFirmar, empresa);

            boolean enviado = haciendaClient.enviar(xmlFirmado, cf.getClaveNumerica(), empresa);

            if (!enviado) {
                cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
                comprobanteRepo.save(cf);
                contingenciaService.encolar(comprobanteId);
            }
        } catch (Exception e) {
            cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
            cf.setMensajeHacienda(e.getMessage());
            comprobanteRepo.save(cf);
            contingenciaService.encolar(comprobanteId);
            log.error("[facturacion] Error enviando comprobante={}: {}", comprobanteId, e.getMessage());
        }
    }

    @Transactional
    public void actualizarEstadoDesdeHacienda(ComprobanteFiscal cf) {
        String estadoHacienda = haciendaClient.consultarEstado(cf.getClaveNumerica(), cf.getEmpresa());

        switch (estadoHacienda.toLowerCase()) {
            case "aceptado" -> {
                cf.setEstado(ComprobanteFiscal.ESTADO_ACEPTADO);
                cf.setFechaRespuesta(LocalDateTime.now(Constants.ZONA_CR));
                log.info("[facturacion] Comprobante ACEPTADO id={} clave={}", cf.getId(), cf.getClaveNumerica());
            }
            case "rechazado" -> {
                cf.setEstado(ComprobanteFiscal.ESTADO_RECHAZADO);
                cf.setFechaRespuesta(LocalDateTime.now(Constants.ZONA_CR));
                log.warn("[facturacion] Comprobante RECHAZADO id={} clave={}", cf.getId(), cf.getClaveNumerica());
            }
            case "en_procesamiento" -> log.debug("[facturacion] Comprobante en procesamiento id={}", cf.getId());
            default -> {
                cf.setIntentosEnvio(cf.getIntentosEnvio() + 1);
                if (cf.getIntentosEnvio() >= MAX_INTENTOS) {
                    cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
                    cf.setMensajeHacienda("Max intentos alcanzado. Último estado: " + estadoHacienda);
                    comprobanteRepo.save(cf);
                    contingenciaService.encolar(cf.getId());
                    return;
                }
            }
        }
        comprobanteRepo.save(cf);
    }
}
