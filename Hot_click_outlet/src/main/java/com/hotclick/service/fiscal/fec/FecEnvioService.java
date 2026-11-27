package com.hotclick.service.fiscal.fec;

import com.hotclick.model.FecCompra;
import com.hotclick.repository.FecCompraRepository;
import com.hotclick.service.FirmaDigitalService;
import com.hotclick.service.HaciendaApiClient;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.hacienda.FecSchemaValidator;
import com.hotclick.service.hacienda.HaciendaLogSanitizer;
import com.hotclick.service.hacienda.ResultadoEnvioHacienda;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

/**
 * Firma, valida y envía las FEC generadas por el mismo camino que el resto de comprobantes (HaciendaApiClient,
 * con su Resilience4j). Todo está detrás del interruptor: con régimen SIMPLIFICADO o {@code fec_habilitada}
 * apagada no firma ni toca la red. Sin el XSD oficial de FEC en el repo tampoco envía.
 */
@Service
public class FecEnvioService {

    static final int MAX_INTENTOS = 5;
    private static final Logger log = LoggerFactory.getLogger(FecEnvioService.class);

    private final ConfiguracionFiscalService config;
    private final FecCompraRepository repo;
    private final FirmaDigitalService firma;
    private final FecSchemaValidator validador;
    private final HaciendaApiClient hacienda;

    public FecEnvioService(ConfiguracionFiscalService config, FecCompraRepository repo, FirmaDigitalService firma,
                           FecSchemaValidator validador, HaciendaApiClient hacienda) {
        this.config = config;
        this.repo = repo;
        this.firma = firma;
        this.validador = validador;
        this.hacienda = hacienda;
    }

    /** Envía las GENERADA y consulta las ENVIADA. Devuelve cuántas FEC se enviaron (0 con la FEC apagada). */
    public int procesar() {
        if (!config.fecActiva()) {
            log.info("[fec] FEC desactivada: régimen SIMPLIFICADO o interruptor apagado; no se envía nada");
            return 0;
        }
        int enviadas = 0;
        for (FecCompra f : repo.findPorEstados(List.of(FecCompra.GENERADA))) {
            if (f.getIntentosEnvio() < MAX_INTENTOS && enviar(f)) enviadas++;
        }
        for (FecCompra f : repo.findPorEstados(List.of(FecCompra.ENVIADA))) {
            consultar(f);
        }
        return enviadas;
    }

    boolean enviar(FecCompra f) {
        f.setIntentosEnvio(f.getIntentosEnvio() + 1);
        try {
            String firmado = firma.firmar(f.getXml(), f.getEmpresa());
            validador.validar(firmado);
            ResultadoEnvioHacienda r = hacienda.enviar(firmado, f.getClaveNumerica(), f.getEmpresa());
            if (r.recibido()) {
                f.setEstado(FecCompra.ENVIADA);
                f.setFechaEnvio(LocalDateTime.now(Constants.ZONA_CR));
                f.setMensajeHacienda(null);
            } else {
                f.setMensajeHacienda(truncar(r.motivo()));
            }
        } catch (Exception e) {
            f.setMensajeHacienda(truncar(HaciendaLogSanitizer.error(e)));
            log.warn("[fec] fec={} no se pudo enviar: {}", f.getId(), HaciendaLogSanitizer.error(e));
        }
        repo.save(f);
        return FecCompra.ENVIADA.equals(f.getEstado());
    }

    private void consultar(FecCompra f) {
        String estado;
        try {
            estado = hacienda.consultarEstado(f.getClaveNumerica(), f.getEmpresa());
        } catch (Exception e) {
            log.warn("[fec] fec={} sin consulta de estado: {}", f.getId(), HaciendaLogSanitizer.error(e));
            return;
        }
        switch (estado == null ? "" : estado.toLowerCase(Locale.ROOT)) {
            case "aceptado" -> cerrar(f, FecCompra.ACEPTADA);
            case "rechazado" -> cerrar(f, FecCompra.RECHAZADA);
            default -> { /* sigue en proceso; se consulta en la próxima corrida */ }
        }
    }

    private void cerrar(FecCompra f, String estado) {
        f.setEstado(estado);
        f.setFechaRespuesta(LocalDateTime.now(Constants.ZONA_CR));
        repo.save(f);
    }

    private static String truncar(String s) {
        return s == null ? null : s.length() > 1000 ? s.substring(0, 1000) : s;
    }
}
