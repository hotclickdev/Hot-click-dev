package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.service.FacturacionContingenciaService;
import com.hotclick.service.HaciendaApiClient;
import com.hotclick.service.hacienda.ComprobanteInvalidoException;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.HaciendaLogSanitizer;
import com.hotclick.service.hacienda.ResultadoEnvioHacienda;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.function.Consumer;

/**
 * Envío y consulta de comprobantes. NO es @Transactional: cada paso de BD es una transacción corta
 * (TransactionTemplate) y las llamadas HTTP a Hacienda quedan fuera de toda transacción.
 *
 * <p>El comprobante solo pasa a ENVIADO cuando Hacienda confirmó la recepción (2xx).
 */
@Service
public class FacturacionEnvioProcessor {

    private static final Logger log = LoggerFactory.getLogger(FacturacionEnvioProcessor.class);
    static final int MAX_INTENTOS = 5;

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final ComprobanteXmlPreparer preparer;
    private final HaciendaApiClient haciendaClient;
    private final FacturacionContingenciaService contingenciaService;
    private final TransactionTemplate tx;

    public FacturacionEnvioProcessor(ComprobanteFiscalRepository comprobanteRepo,
                                     ComprobanteXmlPreparer preparer,
                                     HaciendaApiClient haciendaClient,
                                     FacturacionContingenciaService contingenciaService,
                                     PlatformTransactionManager txManager) {
        this.comprobanteRepo     = comprobanteRepo;
        this.preparer            = preparer;
        this.haciendaClient      = haciendaClient;
        this.contingenciaService = contingenciaService;
        this.tx                  = new TransactionTemplate(txManager);
    }

    public void procesarComprobante(Long comprobanteId) {
        Boolean reclamado = tx.execute(s -> reclamar(comprobanteId));
        if (!Boolean.TRUE.equals(reclamado)) return;

        ComprobanteXmlPreparer.Preparado preparado;
        try {
            preparado = preparer.preparar(comprobanteId);
        } catch (HaciendaConfiguracionException e) {
            pendienteConfig(comprobanteId, HaciendaLogSanitizer.error(e));
            return;
        } catch (ComprobanteInvalidoException e) {
            // Datos que no cumplen el XSD: reintentar no sirve, hay que corregirlos.
            actualizar(comprobanteId, cf -> {
                cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
                cf.setMensajeHacienda(truncar(HaciendaLogSanitizer.error(e)));
            });
            log.error("[facturacion] comprobante={} no cumple el XSD oficial: {}", comprobanteId, HaciendaLogSanitizer.error(e));
            return;
        } catch (Exception e) {
            errorYContingencia(comprobanteId, HaciendaLogSanitizer.error(e));
            return;
        }

        try {
            ResultadoEnvioHacienda r = haciendaClient.enviar(preparado.xmlFirmado(), preparado.clave(), preparado.empresa());
            if (r.recibido()) {
                actualizar(comprobanteId, cf -> {
                    cf.setEstado(ComprobanteFiscal.ESTADO_ENVIADO);
                    cf.setMensajeHacienda(null);
                });
            } else {
                actualizar(comprobanteId, cf -> {
                    cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
                    cf.setMensajeHacienda(truncar(r.motivo()));
                });
            }
        } catch (HaciendaConfiguracionException e) {
            pendienteConfig(comprobanteId, HaciendaLogSanitizer.error(e));
        } catch (Exception e) {
            log.error("[facturacion] Error enviando comprobante={}: {}", comprobanteId, HaciendaLogSanitizer.error(e));
            errorYContingencia(comprobanteId, HaciendaLogSanitizer.error(e));
        }
    }

    public void actualizarEstadoDesdeHacienda(Long comprobanteId) {
        ComprobanteFiscal cf = tx.execute(s -> comprobanteRepo.findById(comprobanteId)
            .map(c -> { c.getEmpresa().getAmbienteHacienda(); return c; })
            .orElse(null));
        if (cf == null || !ComprobanteFiscal.ESTADO_ENVIADO.equals(cf.getEstado())) return;

        String estadoHacienda;
        try {
            estadoHacienda = haciendaClient.consultarEstado(cf.getClaveNumerica(), cf.getEmpresa());
        } catch (HaciendaConfiguracionException e) {
            log.warn("[facturacion] comprobante={} sin credenciales para consultar: {}", comprobanteId, HaciendaLogSanitizer.error(e));
            return;
        } catch (Exception e) {
            estadoHacienda = "error_consulta";
        }

        final String estado = estadoHacienda;
        boolean[] encolar = {false};
        actualizar(comprobanteId, c -> {
            switch (estado.toLowerCase(Locale.ROOT)) {
                case "aceptado" -> {
                    c.setEstado(ComprobanteFiscal.ESTADO_ACEPTADO);
                    c.setFechaRespuesta(LocalDateTime.now(Constants.ZONA_CR));
                }
                case "rechazado" -> {
                    c.setEstado(ComprobanteFiscal.ESTADO_RECHAZADO);
                    c.setFechaRespuesta(LocalDateTime.now(Constants.ZONA_CR));
                }
                case "en_procesamiento", "procesando", "recibido" ->
                    log.debug("[facturacion] Comprobante en procesamiento id={}", c.getId());
                default -> {
                    c.setIntentosEnvio(c.getIntentosEnvio() + 1);
                    if (c.getIntentosEnvio() >= MAX_INTENTOS) {
                        c.setEstado(ComprobanteFiscal.ESTADO_ERROR);
                        c.setMensajeHacienda("Max intentos alcanzado. Último estado: " + estado);
                        encolar[0] = true;
                    }
                }
            }
        });
        if (encolar[0]) contingenciaService.encolar(comprobanteId);
    }

    private boolean reclamar(Long comprobanteId) {
        ComprobanteFiscal cf = comprobanteRepo.findById(comprobanteId).orElse(null);
        if (cf == null) return false;
        String estado = cf.getEstado();
        if (!ComprobanteFiscal.ESTADO_PENDIENTE.equals(estado)
                && !ComprobanteFiscal.ESTADO_PENDIENTE_CONFIG.equals(estado)) {
            log.warn("[facturacion] Comprobante={} ya en estado {} — skip envío duplicado", comprobanteId, estado);
            return false;
        }
        Empresa empresa = cf.getEmpresa();
        if (!empresa.isConfiguracionFiscalCompleta()) {
            cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE_CONFIG);
            cf.setMensajeHacienda(MENSAJE_SIN_CONFIG);
            comprobanteRepo.save(cf);
            log.warn("[facturacion] empresa={} sin configuración fiscal completa — comprobante={} PENDIENTE_CONFIG",
                empresa.getId(), comprobanteId);
            return false;
        }
        return comprobanteRepo.reclamarEnvio(comprobanteId, cf.getIntentosEnvio()) == 1;
    }

    static final String MENSAJE_SIN_CONFIG =
        "Falta completar la configuración de Hacienda (usuario y clave de ATV, certificado y PIN). "
            + "Completala y el comprobante se envía solo.";

    private void pendienteConfig(Long id, String motivo) {
        actualizar(id, cf -> {
            cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE_CONFIG);
            cf.setMensajeHacienda(truncar(motivo));
        });
        log.warn("[facturacion] comprobante={} PENDIENTE_CONFIG: {}", id, motivo);
    }

    private void errorYContingencia(Long id, String motivo) {
        actualizar(id, cf -> {
            cf.setEstado(ComprobanteFiscal.ESTADO_ERROR);
            cf.setMensajeHacienda(truncar(motivo));
        });
        contingenciaService.encolar(id);
    }

    private void actualizar(Long id, Consumer<ComprobanteFiscal> cambio) {
        tx.executeWithoutResult(s -> comprobanteRepo.findById(id).ifPresent(cf -> {
            cambio.accept(cf);
            comprobanteRepo.save(cf);
        }));
    }

    private static String truncar(String s) {
        if (s == null) return null;
        return s.length() > 1000 ? s.substring(0, 1000) : s;
    }
}
