package com.hotclick.service.territorio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Catálogo oficial de provincia, cantón y distrito.
 * Lo publica el Instituto Geográfico Nacional en el SNIT
 * (capa Distritos_CR, sin geometría).
 */
@Service
public class DivisionTerritorialService {

    private static final Logger log = LoggerFactory.getLogger(DivisionTerritorialService.class);
    private static final String CONSULTA =
            "https://services5.arcgis.com/4u1m1BBDkNDTVWsd/arcgis/rest/services/Distritos_CR/FeatureServer/0/query"
                    + "?where=1%3D1&outFields=nom_prov,canton,nom_distr&returnGeometry=false&f=json"
                    + "&resultRecordCount=1000&resultOffset=";
    private static final long CACHE_MS = Duration.ofHours(12).toMillis();

    private final RestTemplate http;
    private final ObjectMapper mapper = new ObjectMapper();
    private final AtomicReference<List<ProvinciaDivision>> cache = new AtomicReference<>();
    private final AtomicLong cacheEn = new AtomicLong();

    public DivisionTerritorialService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(20));
        this.http = new RestTemplate(factory);
    }

    public List<ProvinciaDivision> catalogo() {
        long ahora = System.currentTimeMillis();
        List<ProvinciaDivision> vigente = cache.get();
        if (vigente != null && ahora - cacheEn.get() < CACHE_MS) return vigente;
        List<ProvinciaDivision> fresco = List.copyOf(descargar());
        cache.set(fresco);
        cacheEn.set(ahora);
        return fresco;
    }

    private List<ProvinciaDivision> descargar() {
        List<FilaDivision> filas = new ArrayList<>();
        int offset = 0;
        while (offset < 5000) {
            int leidas = leerPagina(filas, offset);
            if (leidas < 1000) break;
            offset += leidas;
        }
        List<ProvinciaDivision> catalogo = CatalogoDivisionTerritorial.armar(filas);
        if (catalogo.isEmpty()) {
            throw new IllegalStateException("El IGN no devolvió la división territorial");
        }
        log.info("División territorial del IGN: {} provincias", catalogo.size());
        return catalogo;
    }

    private int leerPagina(List<FilaDivision> filas, int offset) {
        String json = http.getForObject(CONSULTA + offset, String.class);
        if (json == null || json.isBlank()) return 0;
        try {
            JsonNode features = mapper.readTree(json).path("features");
            if (!features.isArray()) return 0;
            for (JsonNode feature : features) {
                JsonNode attrs = feature.path("attributes");
                filas.add(new FilaDivision(
                        texto(attrs, "nom_prov"),
                        texto(attrs, "canton"),
                        texto(attrs, "nom_distr")));
            }
            return features.size();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo leer la división territorial del IGN", e);
        }
    }

    private static String texto(JsonNode attrs, String campo) {
        JsonNode valor = attrs.get(campo);
        return valor == null || valor.isNull() ? "" : valor.asText();
    }
}
