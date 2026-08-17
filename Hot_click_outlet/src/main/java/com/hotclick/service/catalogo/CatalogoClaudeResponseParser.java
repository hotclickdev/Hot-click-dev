package com.hotclick.service.catalogo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ProductoExtraidoDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CatalogoClaudeResponseParser {

    private static final Logger log = LoggerFactory.getLogger(CatalogoClaudeResponseParser.class);
    private static final int MAX_PRODUCTOS = 100;

    private final ObjectMapper mapper = new ObjectMapper();

    public List<ProductoExtraidoDto> parsearRespuesta(String rawText) throws Exception {
        String json = rawText.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("(?s)^```\\w*\\n?", "")
                .replaceAll("(?s)```\\s*$", "")
                .trim();
        }

        JsonNode node = mapper.readTree(json);
        JsonNode arr = node.isArray() ? node : node.path("productos");

        if (!arr.isArray()) {
            log.warn("[import] Respuesta inesperada de Claude: {}", json.substring(0, Math.min(200, json.length())));
            return List.of();
        }

        List<ProductoExtraidoDto> resultado = new ArrayList<>();
        for (JsonNode item : arr) {
            if (resultado.size() >= MAX_PRODUCTOS) {
                break;
            }

            String nombre = item.path("nombreProducto").asText("").trim();
            if (nombre.isBlank()) {
                continue;
            }

            ProductoExtraidoDto dto = new ProductoExtraidoDto();
            dto.setNombreProducto(nombre.length() > 200 ? nombre.substring(0, 200) : nombre);
            int precio = Math.max(0, item.path("precioVenta").asInt(0));
            dto.setPrecioVenta(precio);
            dto.setPrecioCompra(precio);
            String desc = item.path("descripcionCorta").asText("").trim();
            dto.setDescripcionCorta(desc.length() > 300 ? desc.substring(0, 300) : desc);
            String img = item.path("imagenPrincipalUrl").asText("").trim();
            dto.setImagenPrincipalUrl(img.isEmpty() || img.equals("null") ? null : img);
            String sku = item.path("sku").asText("").trim();
            dto.setSku(sku.isEmpty() || sku.equals("null") ? null : sku);
            String marca = item.path("marcaTexto").asText("").trim();
            dto.setMarcaTexto(marca.isEmpty() || marca.equals("null") ? null : marca);
            dto.setStockActual(0);

            resultado.add(dto);
        }

        log.info("[import] Extraídos {} productos", resultado.size());
        return resultado;
    }
}
