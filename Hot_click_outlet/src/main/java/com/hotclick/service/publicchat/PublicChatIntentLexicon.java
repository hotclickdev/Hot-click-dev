package com.hotclick.service.publicchat;

import java.time.ZoneId;
import java.util.List;
import java.util.Set;

/**
 * Constantes de detección de intención del chat público.
 * Extraído bit-idéntico de PublicChatIntentHelper — no cambia comportamiento.
 */
final class PublicChatIntentLexicon {

    static final ZoneId CR_TZ = ZoneId.of("America/Costa_Rica");

    static final Set<String> STOP = Set.of(
        "y","o","de","del","la","el","los","las","un","una","unos","unas",
        "en","a","para","con","que","es","se","me","mi","al","le","lo","su",
        "por","como","más","pero","ya","hay","cuando","donde","cual",
        "quiero","busco","busca","necesito","ando","algo","ver","tengo",
        "puede","puedo","dame","dime","muestra","mostrame"
    );

    static final Set<String> OFF_TOPIC_TRIGGERS = Set.of(
        "clima","tiempo","temperatura","lluvia","sol","pronóstico",
        "política","gobierno","presidente","elecciones","votar",
        "matemáticas","calcular","ecuación","resolver","algebra",
        "programar","código","javascript","python","java","software",
        "receta","cocinar","ingredientes","platillo","gastronomía",
        "medicina","síntoma","diagnóstico","enfermedad","doctor","hospital",
        "abogado","ley","demanda","impuestos","tributos",
        "chiste","broma","cuento","canción","película","serie",
        "historia","geografía","capital","país","continente",
        "filosofía","religión","dios","ciencia","universo",
        "traduci","idioma","inglés","francés","alemán",
        "noticias","noticia","periódico","suceso"
    );

    static final Set<String> GREETINGS = Set.of(
        "hola","buenas","buenos días","buenas tardes","buenas noches",
        "hey","hi","saludos","qué tal","qué hay","cómo estás","hello","good morning","good afternoon"
    );

    static final List<String> FAQ_FOLLOWUP_PHRASES = List.of(
        "unidades quedan", "cuantas unidades", "units left",
        "stock queda", "cuanto stock",
        "tarda el envio", "how long does shipping", "shipping take", "envio funciona", "does shipping work",
        "tienen garantia", "warranty",
        "como lo recibo", "how do i receive",
        "como pago", "how do i pay", "pay by card",
        "aceptan transferencia", "aceptan tarjeta", "ayuda con el pago",
        "hora abren", "dejo mi pedido"
    );

    private PublicChatIntentLexicon() {}
}
