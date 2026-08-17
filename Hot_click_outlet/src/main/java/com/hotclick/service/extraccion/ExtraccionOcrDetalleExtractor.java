package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
class ExtraccionOcrDetalleExtractor {

    /**
     * Extrae descripcionCorta, especificaciones y comoUsar directamente del texto OCR
     * de las imágenes del producto (texto visible en empaque, etiqueta, caja).
     */
    ExtraccionService.DetallesProducto extraerDetallesDeOcr(String ocrText) {
        if (ocrText == null || ocrText.isBlank()) return null;

        List<String> lines = Arrays.stream(ocrText.split("\n"))
            .map(String::trim)
            .filter(l -> !l.isBlank())
            .collect(Collectors.toList());
        if (lines.isEmpty()) return null;

        ExtraccionService.DetallesProducto d = new ExtraccionService.DetallesProducto();

        // ── Cómo usar: buscar sección con cabecera de instrucciones ──────────────
        Pattern headerInstr = Pattern.compile(
            "(?i)^(how\\s+to\\s+(use|apply)|directions?|instrucciones?|"
            + "modo\\s+de\\s+(uso|empleo)|c[oó]mo\\s+usar|application|"
            + "usage|use:?|how\\s+to\\s+use:?)\\s*$"
        );
        int instrStart = -1;
        for (int i = 0; i < lines.size(); i++) {
            if (headerInstr.matcher(lines.get(i)).matches()) { instrStart = i + 1; break; }
        }
        if (instrStart >= 0 && instrStart < lines.size()) {
            List<String> instrLines = new ArrayList<>();
            for (int i = instrStart; i < lines.size() && instrLines.size() < 4; i++) {
                String line = lines.get(i);
                // Parar al encontrar siguiente sección (cabecera en mayúsculas o termina en ":")
                if (line.length() < 35 && (line.equals(line.toUpperCase()) || line.endsWith(":"))) break;
                instrLines.add(line);
            }
            if (!instrLines.isEmpty()) d.comoUsar = String.join(" ", instrLines);
        }

        // ── Especificaciones: líneas "Clave: Valor" o con unidades técnicas ──────
        Pattern specKV  = Pattern.compile("^[\\w\\s]{2,25}:\\s+.{2,}");
        Pattern techUnit = Pattern.compile(
            "(?i)\\d+\\s*(mah|wh|w\\b|v\\b|a\\b|ghz|mhz|db|g\\b|kg|oz|ml\\b|l\\b|cm|mm|m\\b|in\\b|ft|"
            + "hrs?|hours?|horas?|%|fps|rpm|mp\\b|px|x\\d+)");
        List<String> specLines = new ArrayList<>();
        for (String line : lines) {
            boolean isSpec = specKV.matcher(line).find() || techUnit.matcher(line).find();
            if (!isSpec) continue;
            String ll = line.toLowerCase();
            // Excluir líneas de instrucciones que también tengan números
            if (ll.startsWith("apply") || ll.startsWith("use ") || ll.startsWith("take ")
                || ll.startsWith("store") || ll.startsWith("keep ") || ll.startsWith("do not")
                || ll.startsWith("aplicar") || ll.startsWith("usar") || ll.startsWith("tomar")
                || ll.startsWith("guardar") || ll.startsWith("evitar")) continue;
            specLines.add(line);
            if (specLines.size() >= 12) break;
        }
        if (!specLines.isEmpty()) d.especificaciones = String.join("\n", specLines);

        // ── Descripción corta: primeras líneas sustantivas (no headers ni specs) ─
        List<String> descLines = new ArrayList<>();
        for (String line : lines) {
            if (line.length() < 20) continue;
            // Saltar cabeceras en ALL CAPS
            if (line.equals(line.toUpperCase()) && line.replaceAll("[^A-Z]", "").length() > 5) continue;
            // Saltar líneas que ya son specs
            if (specKV.matcher(line).find()) continue;
            // Saltar líneas de instrucciones
            String ll = line.toLowerCase();
            if (ll.startsWith("apply") || ll.startsWith("use ") || ll.startsWith("aplicar")) continue;
            descLines.add(line);
            if (descLines.size() >= 2) break;
        }
        if (!descLines.isEmpty()) {
            String desc = String.join(". ", descLines);
            if (!desc.endsWith(".") && !desc.endsWith("!") && !desc.endsWith("?")) desc += ".";
            d.descripcionCorta = desc;
        }

        return (d.comoUsar != null || d.especificaciones != null || d.descripcionCorta != null) ? d : null;
    }
}
