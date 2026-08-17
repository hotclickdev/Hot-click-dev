package com.hotclick.service.extraccion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.ExtraccionService;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
class ExtraccionJsonLdDetalleExtractor {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionJsonLdDetalleExtractor.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    /** Extrae datos de JSON-LD schema.org (Product, HowTo) del documento HTML. */
    void extraerDeJsonLD(Document doc, ExtraccionService.DetallesProducto d) {
        for (Element script : doc.select("script[type=application/ld+json]")) {
            try {
                JsonNode root = JSON.readTree(script.html());
                if (root.isObject() && root.has("@graph")) root = root.get("@graph");
                if (root.isArray()) {
                    for (JsonNode node : root) aplicarSchema(node, d);
                } else {
                    aplicarSchema(root, d);
                }
            } catch (Exception e) { log.debug("json-ld parse error: {}", e.getMessage()); }
        }
    }

    void aplicarSchema(JsonNode node, ExtraccionService.DetallesProducto d) {
        String type = node.path("@type").asText("");
        if (type.contains("Product")) {
            if (d.nombre == null || d.nombre.isBlank()) {
                String n = node.path("name").asText("").trim();
                if (!n.isBlank()) d.nombre = n;
            }
            if (d.descripcionCorta == null) {
                String desc = node.path("description").asText("").trim();
                if (desc.length() > 20) d.descripcionCorta = desc;
            }
            if (d.marca == null) {
                JsonNode brand = node.path("brand");
                String bn = brand.isObject() ? brand.path("name").asText("") : brand.asText("");
                if (!bn.isBlank()) d.marca = bn.trim();
            }
            if (d.especificaciones == null) {
                JsonNode props = node.path("additionalProperty");
                if (props.isArray() && props.size() > 0) {
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode p : props) {
                        String k = p.path("name").asText("").trim();
                        String v = p.path("value").asText("").trim();
                        if (!k.isBlank() && !v.isBlank()) sb.append(k).append(": ").append(v).append("\n");
                        if (sb.length() > 450) break;
                    }
                    if (sb.length() > 0) d.especificaciones = sb.toString().trim();
                }
            }
        } else if (type.contains("HowTo")) {
            if (d.comoUsar == null) {
                JsonNode steps = node.path("step");
                if (steps.isArray()) {
                    List<String> texts = new ArrayList<>();
                    for (JsonNode s : steps) {
                        String t = s.path("text").asText(s.path("name").asText("")).trim();
                        if (!t.isBlank()) texts.add(t);
                        if (texts.size() >= 3) break;
                    }
                    if (!texts.isEmpty()) d.comoUsar = String.join(" ", texts);
                }
            }
        }
    }
}
