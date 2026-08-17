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

    private static final String LIVING = "living";
    private static final String COCINA = "cocina";
    private static final String COMEDOR = "comedor";
    private static final String DORMITORIO = "dormitorio";
    private static final String CUARTO = "cuarto";
    private static final String AURICULAR = "auricular";
    private static final String SNEAKER = "sneaker";
    private static final String ZAPATILLA = "zapatilla";
    private static final String CALZADO = "calzado";
    private static final String TENIS = "tenis";
    private static final String ZAPATOS = "zapatos";
    private static final String MOCHILA = "mochila";
    private static final String BOLSO = "bolso";
    private static final String AUDIFONOS = "audifonos";
    private static final String REGALO = "regalo";

    static List<String> expandSynonyms(List<String> terms) {
        Map<String, List<String>> syn = new HashMap<>(Map.ofEntries(
            Map.entry("sala",       List.of(LIVING,"sofa","sala","mueble")),
            Map.entry(LIVING,     List.of("sala","sofa","mueble")),
            Map.entry(COCINA,     List.of("kitchen",COCINA,COMEDOR,"utensilios")),
            Map.entry(COMEDOR,    List.of(COCINA,"mesa","sillas",COMEDOR)),
            Map.entry(DORMITORIO, List.of("cama",CUARTO,"habitacion",DORMITORIO,"colchon")),
            Map.entry(CUARTO,     List.of(DORMITORIO,"cama",CUARTO,"almohada")),
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
            Map.entry("ruido",      List.of("tapones",AURICULAR,"aislante","cortina")),
            Map.entry(ZAPATOS,    List.of("shoe","shoes",ZAPATILLA,TENIS,CALZADO,"footwear",SNEAKER,"boot")),
            Map.entry(ZAPATILLA,  List.of(ZAPATOS,"shoe",TENIS,SNEAKER,CALZADO)),
            Map.entry(TENIS,      List.of(ZAPATOS,"shoe",ZAPATILLA,SNEAKER,"running")),
            Map.entry(CALZADO,    List.of(ZAPATOS,"shoe",ZAPATILLA,TENIS,"footwear")),
            Map.entry("shoe",       List.of(ZAPATOS,ZAPATILLA,TENIS,CALZADO,SNEAKER)),
            Map.entry(SNEAKER,    List.of(ZAPATOS,TENIS,ZAPATILLA,"shoe","running")),
            Map.entry("ropa",       List.of("camisa","pantalon","vestido","falda","ropa","clothing")),
            Map.entry(BOLSO,      List.of("cartera",MOCHILA,"bag",BOLSO,"handbag")),
            Map.entry(MOCHILA,    List.of(BOLSO,"bag","backpack",MOCHILA)),
            Map.entry(AURICULAR,  List.of(AUDIFONOS,"earphone","headphone",AURICULAR)),
            Map.entry(AUDIFONOS,  List.of(AURICULAR,"headphone","earphone",AUDIFONOS)),
            Map.entry(REGALO,     List.of("obsequio","sorpresa","detalle","gift","presente")),
            Map.entry("cumpleaños", List.of(REGALO,"pastel","festejo","sorpresa")),
            Map.entry("navidad",    List.of(REGALO,"navidad","diciembre","villancico")),
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
            if (t.equals("kitchen")) extra.addAll(List.of(COCINA,COMEDOR));
            if (t.equals("bedroom")) extra.addAll(List.of(DORMITORIO,"cama",CUARTO));
            if (t.equals(LIVING)) extra.addAll(List.of("sala","sofa"));
            if (t.equals("gift")) extra.addAll(List.of(REGALO,"obsequio"));
            if (t.equals("cheap")) extra.addAll(List.of("economico","barato","precio bajo"));
        }
        return extra;
    }
}
