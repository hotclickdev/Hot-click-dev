package com.hotclick.service;

import com.hotclick.dto.ProductoExtraidoDto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * ESC-9: CSV con columnas conocidas (la plantilla) se lee sin IA. Así no depende del proveedor de IA
 * (antes cualquier falla de la IA era 500) y los errores dicen qué fila o columna falla (400).
 * Si las columnas no son las conocidas, devuelve vacío y el llamador sigue con la extracción por IA.
 */
public final class CsvCatalogoParser {

    static final int MAX_FILAS = 2000;

    private static final Map<String, String> ALIAS = Map.ofEntries(
        Map.entry("nombreproducto", "nombre"), Map.entry("nombre", "nombre"), Map.entry("producto", "nombre"),
        Map.entry("precioventa", "precioVenta"), Map.entry("precio", "precioVenta"),
        Map.entry("preciocompra", "precioCompra"), Map.entry("costo", "precioCompra"),
        Map.entry("stockactual", "stock"), Map.entry("stock", "stock"), Map.entry("cantidad", "stock"),
        Map.entry("sku", "sku"), Map.entry("codigo", "sku"),
        Map.entry("descripcioncorta", "descripcion"), Map.entry("descripcion", "descripcion"),
        Map.entry("imagenprincipalurl", "imagen"), Map.entry("imagen", "imagen"),
        Map.entry("marca", "marca"));

    private CsvCatalogoParser() {}

    public static Optional<List<ProductoExtraidoDto>> parsear(String contenido) {
        if (contenido == null) return Optional.empty();
        String texto = contenido.startsWith("\uFEFF") ? contenido.substring(1) : contenido;
        String[] lineas = texto.split("\\r?\\n");
        if (lineas.length == 0) return Optional.empty();
        char sep = lineas[0].indexOf(';') >= 0 && lineas[0].indexOf(',') < 0 ? ';' : ',';
        List<String> cabecera = campos(lineas[0], sep);
        Map<String, Integer> col = new HashMap<>();
        for (int i = 0; i < cabecera.size(); i++) {
            String clave = ALIAS.get(normalizar(cabecera.get(i)));
            if (clave != null) col.putIfAbsent(clave, i);
        }
        if (!col.containsKey("nombre") || !col.containsKey("precioVenta")) return Optional.empty();

        List<ProductoExtraidoDto> out = new ArrayList<>();
        for (int n = 1; n < lineas.length; n++) {
            if (lineas[n].isBlank()) continue;
            if (out.size() >= MAX_FILAS) throw new IllegalArgumentException("El CSV tiene más de " + MAX_FILAS + " productos. Dividilo en varios archivos.");
            List<String> f = campos(lineas[n], sep);
            int fila = n + 1;
            ProductoExtraidoDto p = new ProductoExtraidoDto();
            String nombre = valor(f, col, "nombre");
            if (nombre == null) throw new IllegalArgumentException("Fila " + fila + ": falta el nombre del producto.");
            p.setNombreProducto(nombre);
            p.setPrecioVenta(entero(f, col, "precioVenta", fila, true));
            p.setPrecioCompra(entero(f, col, "precioCompra", fila, false));
            p.setStockActual(entero(f, col, "stock", fila, false));
            p.setSku(valor(f, col, "sku"));
            p.setDescripcionCorta(valor(f, col, "descripcion"));
            p.setImagenPrincipalUrl(valor(f, col, "imagen"));
            p.setMarcaTexto(valor(f, col, "marca"));
            out.add(p);
        }
        if (out.isEmpty()) throw new IllegalArgumentException("El CSV no tiene productos debajo de la fila de títulos.");
        return Optional.of(out);
    }

    private static String normalizar(String s) {
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").replaceAll("[^A-Za-z]", "").toLowerCase(Locale.ROOT);
    }

    private static String valor(List<String> f, Map<String, Integer> col, String clave) {
        Integer i = col.get(clave);
        if (i == null || i >= f.size()) return null;
        String v = f.get(i).trim();
        return v.isEmpty() ? null : v;
    }

    private static Integer entero(List<String> f, Map<String, Integer> col, String clave, int fila, boolean requerido) {
        String v = valor(f, col, clave);
        if (v == null) {
            if (requerido) throw new IllegalArgumentException("Fila " + fila + ": falta " + clave + ".");
            return null;
        }
        String limpio = v.replace("₡", "").replace(" ", "").replace(",", "");
        try {
            double d = Double.parseDouble(limpio);
            if (d < 0) throw new NumberFormatException();
            return (int) Math.round(d);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Fila " + fila + ": «" + v + "» no es un número válido en " + clave + ".");
        }
    }

    /** Campos de una línea CSV con comillas dobles ("" escapa una comilla). */
    static List<String> campos(String linea, char sep) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean comillas = false;
        for (int i = 0; i < linea.length(); i++) {
            char c = linea.charAt(i);
            if (comillas) {
                if (c == '"' && i + 1 < linea.length() && linea.charAt(i + 1) == '"') { cur.append('"'); i++; }
                else if (c == '"') comillas = false;
                else cur.append(c);
            } else if (c == '"') {
                comillas = true;
            } else if (c == sep) {
                out.add(cur.toString()); cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        out.add(cur.toString());
        return out;
    }
}
