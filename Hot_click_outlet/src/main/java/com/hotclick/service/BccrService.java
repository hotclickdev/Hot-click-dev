package com.hotclick.service;
nimport com.hotclick.utils.Constants;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class BccrService {

    private static final Logger log = LoggerFactory.getLogger(BccrService.class);

    // Indicador 318 = Tipo de cambio de venta (USD)
    private static final String BCCR_URL =
        "https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicosXML" +
        "?Indicador=318&FechaInicio=%s&FechaFinal=%s&Nombre=HotClick&SubNiveles=N&CorreoElectronico=hotclick.cr@gmail.com&Token=NONE";

    @Value("${app.tc.usd.fallback:530}")
    private int fallback;

    private final AtomicInteger cachedTc = new AtomicInteger(0);
    private final AtomicLong cacheTime = new AtomicLong(0);
    private static final long CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

    public int getTipoCambioVenta() {
        long now = System.currentTimeMillis();
        if (cachedTc.get() > 0 && (now - cacheTime.get()) < CACHE_TTL_MS) {
            return cachedTc.get();
        }
        try {
            String hoy = LocalDate.now(Constants.ZONA_CR).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String url = String.format(BCCR_URL, hoy, hoy);
            RestTemplate rt = new RestTemplate();
            String xml = rt.getForObject(url, String.class);
            int tc = parseTcFromXml(xml);
            if (tc > 0) {
                cachedTc.set(tc);
                cacheTime.set(now);
                log.info("BCCR TC actualizado: {}", tc);
                return tc;
            }
        } catch (Exception e) {
            log.warn("Error consultando BCCR, usando fallback {}: {}", fallback, e.getMessage());
        }
        return fallback;
    }

    private int parseTcFromXml(String xml) {
        if (xml == null) return 0;
        // <NUM_VALOR>530.12</NUM_VALOR>
        int start = xml.indexOf("<NUM_VALOR>");
        int end = xml.indexOf("</NUM_VALOR>", start);
        if (start < 0 || end < 0) return 0;
        try {
            String val = xml.substring(start + 11, end).trim().replace(",", ".");
            return (int) Double.parseDouble(val);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
