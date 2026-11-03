package com.hotclick.service.envio;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * MED-5 Auditor 3: el destino estructurado (provincia + cantón) es la fuente de verdad del envío.
 * El servidor valida que el cantón sea de la provincia (lista oficial de Costa Rica, igual que {@code ubicacionesCR.ts})
 * y arma la dirección que ve el negocio con esos campos al final, así el texto libre no puede contradecir la zona cobrada.
 */
public final class DestinoEnvio {

    private DestinoEnvio() {}

    /** Mensaje genérico: no revela qué parte no coincidió. */
    public static final String DESTINO_INVALIDO = "Revisá la provincia y el cantón de entrega.";

    public record Destino(String provincia, String canton) {}

    private static final Map<String, List<String>> CANTONES = new LinkedHashMap<>();
    static {
        CANTONES.put("San José", List.of("San José", "Escazú", "Desamparados", "Puriscal", "Tarrazú", "Aserrí", "Mora",
            "Goicoechea", "Santa Ana", "Alajuelita", "Vázquez de Coronado", "Acosta", "Tibás", "Moravia", "Montes de Oca",
            "Turrubares", "Dota", "Curridabat", "Pérez Zeledón", "León Cortés Castro"));
        CANTONES.put("Alajuela", List.of("Alajuela", "San Ramón", "Grecia", "San Mateo", "Atenas", "Naranjo", "Palmares",
            "Poás", "Orotina", "San Carlos", "Zarcero", "Sarchí", "Upala", "Los Chiles", "Guatuso", "Río Cuarto"));
        CANTONES.put("Cartago", List.of("Cartago", "Paraíso", "La Unión", "Jiménez", "Turrialba", "Alvarado", "Oreamuno", "El Guarco"));
        CANTONES.put("Heredia", List.of("Heredia", "Barva", "Santo Domingo", "Santa Bárbara", "San Rafael", "San Isidro",
            "Belén", "Flores", "San Pablo", "Sarapiquí"));
        CANTONES.put("Guanacaste", List.of("Liberia", "Nicoya", "Santa Cruz", "Bagaces", "Carrillo", "Cañas", "Abangares",
            "Tilarán", "Nandayure", "La Cruz", "Hojancha"));
        CANTONES.put("Puntarenas", List.of("Puntarenas", "Esparza", "Buenos Aires", "Montes de Oro", "Osa", "Quepos", "Golfito",
            "Coto Brus", "Parrita", "Corredores", "Garabito", "Monteverde", "Puerto Jiménez"));
        CANTONES.put("Limón", List.of("Limón", "Pococí", "Siquirres", "Talamanca", "Matina", "Guácimo"));
    }

    /**
     * BAJO #447: con envío a domicilio el destino es obligatorio (400). Sin cantón no hay zona verificable y el
     * negocio no sabría a dónde despachar; retiro no lo pide.
     */
    public static Destino exigir(String provincia, String canton, boolean conEnvio) {
        Destino d = resolver(provincia, canton);
        if (d == null && conEnvio) throw new IllegalArgumentException(DESTINO_INVALIDO);
        return d;
    }

    private static final java.util.Set<String> NOMBRES = new java.util.HashSet<>();
    static {
        CANTONES.forEach((prov, cantones) -> {
            NOMBRES.add(ZonaEnvio.normalizar(prov));
            cantones.forEach(c -> NOMBRES.add(ZonaEnvio.normalizar(c)));
        });
    }

    /**
     * Sin provincia ni cantón: {@code null} (el envío normal cobra fuera del GAM, como antes).
     * Uno solo, desconocido o un cantón de otra provincia: 400 genérico.
     */
    public static Destino resolver(String provincia, String canton) {
        boolean sinProv = provincia == null || provincia.isBlank();
        boolean sinCanton = canton == null || canton.isBlank();
        if (sinProv && sinCanton) return null;
        if (sinProv || sinCanton) throw new IllegalArgumentException(DESTINO_INVALIDO);
        String p = ZonaEnvio.normalizar(provincia);
        String c = ZonaEnvio.normalizar(canton);
        for (Map.Entry<String, List<String>> e : CANTONES.entrySet()) {
            if (!ZonaEnvio.normalizar(e.getKey()).equals(p)) continue;
            for (String nombre : e.getValue()) {
                if (ZonaEnvio.normalizar(nombre).equals(c)) return new Destino(e.getKey(), nombre);
            }
        }
        throw new IllegalArgumentException(DESTINO_INVALIDO);
    }

    /** Zona cobrada según el método ya resuelto por el servidor; null si el método no usa la tarifa por zona. */
    public static String zona(String metodoEnvio) {
        if (metodoEnvio == null) return null;
        return switch (metodoEnvio) {
            case "ENVIO_NORMAL_GAM" -> "GAM";
            case "ENVIO_NORMAL_FUERA_GAM" -> "FUERA_GAM";
            case "ENVIO_RAPIDO" -> "EXPRESS";
            default -> null;
        };
    }

    /**
     * Dirección final que ve el negocio: «señas, [distrito], cantón, provincia». Las señas son el texto libre sin
     * los cantones o provincias que traiga al final (el front ya los agrega); el servidor pone siempre los declarados.
     * Limitación (B-2 Auditor 3): solo se limpian los segmentos finales que son exactamente un nombre de zona; un
     * texto como «Limón centro, frente al parque» queda en las señas (quitarlo rompería señas legítimas como
     * «Calle Limón»). La fuente de verdad para despachar es {@code destinoProvincia}/{@code destinoCanton}/
     * {@code envioZona}, validados en el servidor, no el texto libre.
     */
    public static String direccionFinal(String texto, Destino d) {
        if (d == null) return texto;
        List<String> partes = new ArrayList<>();
        if (texto != null) {
            for (String s : texto.split(",")) if (!s.isBlank()) partes.add(s.trim());
        }
        // Se quitan del final los nombres de cantón o provincia (los declarados u otros): «…, Siquirres, Limón»
        // con destino Heredia/Belén no puede quedar como la zona visible al negocio.
        while (!partes.isEmpty() && NOMBRES.contains(ZonaEnvio.normalizar(partes.get(partes.size() - 1)))) {
            partes.remove(partes.size() - 1);
        }
        partes.add(d.canton());
        partes.add(d.provincia());
        return String.join(", ", partes);
    }
}
