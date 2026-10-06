package com.hotclick.service.territorio;

import java.text.Collator;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Arma el árbol provincia → cantón → distrito a partir de las filas del IGN.
 * El nombre se muestra en título; las partículas (de, del, la) quedan en minúscula.
 */
public final class CatalogoDivisionTerritorial {

    private static final Locale ES = Locale.forLanguageTag("es-CR");
    private static final Set<String> PARTICULAS = Set.of("de", "del", "la", "las", "los", "y");

    private CatalogoDivisionTerritorial() {}

    public static List<ProvinciaDivision> armar(List<FilaDivision> filas) {
        Map<String, Map<String, List<String>>> arbol = new LinkedHashMap<>();
        for (FilaDivision fila : filas) {
            agregar(arbol, fila);
        }
        return ordenar(arbol);
    }

    public static String titulo(String crudo) {
        if (crudo == null || crudo.isBlank()) return "";
        String[] partes = crudo.trim().replaceAll("\\s+", " ").toLowerCase(ES).split(" ");
        StringBuilder texto = new StringBuilder();
        for (int i = 0; i < partes.length; i++) {
            if (partes[i].isEmpty()) continue;
            if (!texto.isEmpty()) texto.append(' ');
            texto.append(palabra(partes[i], i == 0));
        }
        return texto.toString();
    }

    private static void agregar(Map<String, Map<String, List<String>>> arbol, FilaDivision fila) {
        String provincia = titulo(fila.provincia());
        String canton = titulo(fila.canton());
        String distrito = titulo(fila.distrito());
        if (provincia.isEmpty() || canton.isEmpty() || distrito.isEmpty()) return;
        List<String> distritos = arbol
                .computeIfAbsent(provincia, k -> new LinkedHashMap<>())
                .computeIfAbsent(canton, k -> new ArrayList<>());
        if (!distritos.contains(distrito)) distritos.add(distrito);
    }

    private static List<ProvinciaDivision> ordenar(Map<String, Map<String, List<String>>> arbol) {
        Collator collator = Collator.getInstance(ES);
        List<ProvinciaDivision> provincias = new ArrayList<>();
        for (var entrada : arbol.entrySet()) {
            List<CantonDivision> cantones = new ArrayList<>();
            for (var canton : entrada.getValue().entrySet()) {
                List<String> distritos = new ArrayList<>(canton.getValue());
                distritos.sort(collator);
                cantones.add(new CantonDivision(canton.getKey(), List.copyOf(distritos)));
            }
            cantones.sort((a, b) -> collator.compare(a.nombre(), b.nombre()));
            provincias.add(new ProvinciaDivision(entrada.getKey(), List.copyOf(cantones)));
        }
        provincias.sort((a, b) -> collator.compare(a.nombre(), b.nombre()));
        return List.copyOf(provincias);
    }

    private static String palabra(String parte, boolean primera) {
        if (!primera && PARTICULAS.contains(parte)) return parte;
        return Character.toUpperCase(parte.charAt(0)) + parte.substring(1);
    }
}
