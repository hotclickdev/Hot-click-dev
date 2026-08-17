package com.hotclick.service.publicchat;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Expansión de sinónimos para búsqueda full-text del chat público.
 * Extraído bit-idéntico de PublicChatIntentHelper — no cambia comportamiento.
 */
final class PublicChatSynonymExpander {

    private PublicChatSynonymExpander() {}

    static List<String> expandSynonyms(List<String> terms) {
        Map<String, List<String>> syn = new HashMap<>(Map.ofEntries(
            Map.entry("sala",       List.of("living","sofa","sala","mueble")),
            Map.entry("living",     List.of("sala","sofa","mueble")),
            Map.entry("cocina",     List.of("kitchen","cocina","comedor","utensilios")),
            Map.entry("comedor",    List.of("cocina","mesa","sillas","comedor")),
            Map.entry("dormitorio", List.of("cama","cuarto","habitacion","dormitorio","colchon")),
            Map.entry("cuarto",     List.of("dormitorio","cama","cuarto","almohada")),
            Map.entry("bano",       List.of("bano","ducha","sanitario","toalla")),
            Map.entry("jardin",     List.of("exterior","patio","terraza","jardin","plantas")),
            Map.entry("oficina",    List.of("escritorio","silla","oficina","computadora")),
            Map.entry("decoracion", List.of("adorno","cuadro","lampara","decoracion","vela")),
            Map.entry("huele",      List.of("ambientador","desodorante","aroma","fragancia","difusor")),
            Map.entry("frio",       List.of("calefactor","manta","cobija","termica","calor")),
            Map.entry("calor",      List.of("ventilador","abanico","fresco","enfriador")),
            Map.entry("oscuro",     List.of("lampara","luz","foco","iluminacion","linterna")),
            Map.entry("humedad",    List.of("deshumidificador","secador","toalla","esponja")),
            Map.entry("sucio",      List.of("limpieza","escoba","trapeador","detergente","esponja")),
            Map.entry("organizar",  List.of("organizador","cajones","estante","cesta","caja")),
            Map.entry("ruido",      List.of("tapones","auricular","aislante","cortina")),
            Map.entry("zapatos",    List.of("shoe","shoes","zapatilla","tenis","calzado","footwear","sneaker","boot")),
            Map.entry("zapatilla",  List.of("zapatos","shoe","tenis","sneaker","calzado")),
            Map.entry("tenis",      List.of("zapatos","shoe","zapatilla","sneaker","running")),
            Map.entry("calzado",    List.of("zapatos","shoe","zapatilla","tenis","footwear")),
            Map.entry("shoe",       List.of("zapatos","zapatilla","tenis","calzado","sneaker")),
            Map.entry("sneaker",    List.of("zapatos","tenis","zapatilla","shoe","running")),
            Map.entry("ropa",       List.of("camisa","pantalon","vestido","falda","ropa","clothing")),
            Map.entry("bolso",      List.of("cartera","mochila","bag","bolso","handbag")),
            Map.entry("mochila",    List.of("bolso","bag","backpack","mochila")),
            Map.entry("auricular",  List.of("audifonos","earphone","headphone","auricular")),
            Map.entry("audifonos",  List.of("auricular","headphone","earphone","audifonos")),
            Map.entry("regalo",     List.of("obsequio","sorpresa","detalle","gift","presente")),
            Map.entry("cumpleaños", List.of("regalo","pastel","festejo","sorpresa")),
            Map.entry("navidad",    List.of("regalo","navidad","diciembre","villancico")),
            Map.entry("bebe",       List.of("infantil","nino","cuna","juguete","bebe","baby")),
            Map.entry("nino",       List.of("infantil","bebe","juguete","escuela","nino")),
            Map.entry("madera",     List.of("madera","wood","natural","rustico","pino")),
            Map.entry("metalico",   List.of("acero","hierro","metal","aluminio","inoxidable")),
            Map.entry("plastico",   List.of("plastico","pvc","sintetico","resina")),
            Map.entry("pequeno",    List.of("mini","compacto","chico","pequeño","portatil")),
            Map.entry("grande",     List.of("grande","xl","xxl","amplio","extra"))
        ));

        List<String> extra = new ArrayList<>();
        for (String t : terms) {
            if (syn.containsKey(t)) extra.addAll(syn.get(t));
            if (t.equals("kitchen")) extra.addAll(List.of("cocina","comedor"));
            if (t.equals("bedroom")) extra.addAll(List.of("dormitorio","cama","cuarto"));
            if (t.equals("living")) extra.addAll(List.of("sala","sofa"));
            if (t.equals("gift")) extra.addAll(List.of("regalo","obsequio"));
            if (t.equals("cheap")) extra.addAll(List.of("economico","barato","precio bajo"));
        }
        return extra;
    }
}
