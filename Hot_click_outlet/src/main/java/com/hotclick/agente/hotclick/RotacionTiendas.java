package com.hotclick.agente.hotclick;

import com.hotclick.rag.dto.ProductoContexto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Rotación justa entre tiendas para el bot de HotClick (AG-25). Recibe un conjunto ya filtrado por la regla de
 * visibilidad del catálogo (solo productos visibles de empresas aprobadas; esta clase NUNCA descarta un producto
 * por su tienda, solo decide el orden y el recorte) y reparte los lugares round-robin por tienda.
 *
 * <ul>
 *   <li>El resultado más relevante de la búsqueda se mantiene primero: la relevancia manda en el primer lugar.</li>
 *   <li>Los demás lugares se reparten una tienda por vuelta; dentro de cada tienda se conserva el orden de
 *       relevancia. El orden de las tiendas en cada vuelta cambia con la semilla diaria, así que ninguna tienda
 *       acapara los mismos lugares día tras día.</li>
 *   <li>Con dos o más tiendas en el conjunto, ninguna ocupa todos los lugares (salvo que el límite sea 1).</li>
 * </ul>
 */
public final class RotacionTiendas {

    private RotacionTiendas() {}

    public static List<ProductoContexto> rotar(List<ProductoContexto> relevancia, int limite, long semilla) {
        if (relevancia == null || relevancia.isEmpty() || limite <= 0) return List.of();
        Map<String, List<ProductoContexto>> porTienda = new LinkedHashMap<>();
        for (ProductoContexto p : relevancia) {
            porTienda.computeIfAbsent(claveTienda(p), k -> new ArrayList<>()).add(p);
        }
        ProductoContexto mejor = relevancia.get(0);
        String claveMejor = claveTienda(mejor);
        porTienda.get(claveMejor).remove(0);

        List<ProductoContexto> salida = new ArrayList<>();
        salida.add(mejor);

        // Orden de tiendas determinista por (semilla, tienda); la del mejor resultado ya usó su lugar y va al final.
        List<String> orden = new ArrayList<>(porTienda.keySet());
        orden.sort((a, b) -> {
            int c = Long.compare(mezcla(semilla, a), mezcla(semilla, b));
            return c == 0 ? a.compareTo(b) : c;
        });
        if (orden.remove(claveMejor)) orden.add(claveMejor);

        boolean agregoEnVuelta = true;
        while (salida.size() < limite && agregoEnVuelta) {
            agregoEnVuelta = false;
            for (String clave : orden) {
                List<ProductoContexto> fila = porTienda.get(clave);
                if (fila.isEmpty()) continue;
                salida.add(fila.remove(0));
                agregoEnVuelta = true;
                if (salida.size() >= limite) break;
            }
        }
        return salida;
    }

    /** Un producto sin datos de tienda no se agrupa con otros: cada uno cuenta como su propia tienda (nunca se oculta). */
    static String claveTienda(ProductoContexto p) {
        if (p.empresaSlug() != null && !p.empresaSlug().isBlank()) return "s:" + p.empresaSlug();
        if (p.empresaNombre() != null && !p.empresaNombre().isBlank()) return "n:" + p.empresaNombre();
        return "p:" + p.id();
    }

    private static long mezcla(long semilla, String clave) {
        long h = semilla * 0x9E3779B97F4A7C15L + clave.hashCode();
        h ^= (h >>> 33);
        h *= 0xFF51AFD7ED558CCDL;
        h ^= (h >>> 29);
        return h;
    }
}
