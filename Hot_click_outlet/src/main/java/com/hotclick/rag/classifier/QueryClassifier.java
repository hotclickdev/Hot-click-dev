package com.hotclick.rag.classifier;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import static java.util.regex.Pattern.CASE_INSENSITIVE;
import static java.util.regex.Pattern.UNICODE_CASE;

/**
 * Clasificador ligero de consultas del asistente de compras.
 *
 * Se ejecuta ANTES de cualquier llamada a Voyage AI o Claude, por lo que
 * su costo computacional es cero: solo regex y lookups en Set.
 *
 * Prioridad de clasificación:
 *   1. PROMPT_INJECTION  — patrón de manipulación del sistema
 *   2. PRODUCTO/COMPRA/SOPORTE — contiene palabras del dominio HOTCLICK
 *   3. FUERA_DE_DOMINIO  — contiene palabras de dominio ajeno y ninguna del dominio
 *   4. PRODUCTO          — default / consulta ambigua o vacía → beneficio de duda
 *
 * Los patrones se compilan una única vez al inicio de la aplicación.
 */
@Component
public class QueryClassifier {

    // ── Prompt injection ──────────────────────────────────────────────────────

    private static final List<Pattern> INJECTION_PATTERNS = List.of(
        // Intentos de olvido / anulación de instrucciones
        p("olvida (tus|sus|mis|las|los) (instrucciones?|reglas?|restricciones?|l[ií]mites?|sistema)"),
        p("ignora (tus|sus|mis|las|los|todo|todas|todos) (instrucciones?|reglas?|restricciones?|anteriores?)"),
        p("ignora (lo que|todo lo que) (te dijeron|te programaron|te ense[nñ]aron|est[aá]s configurado)"),
        p("olvida todo (lo anterior|lo que|tu configuraci[oó]n)"),
        p("sin (restricciones?|l[ií]mites?|filtros?|reglas?)"),
        p("deja de ser (un )?asistente"),
        p("ya no eres"),

        // Cambio de rol / actuación como otro sistema
        p("act[uú]a (como|si fueras?|ahora como|en modo) (?!vendedor|asesor|experto en producto)"),
        p("eres ahora (un|una|el|la)"),
        p("eres (chatgpt|gpt|gemini|llama|mistral|bard|copilot|un humano)"),
        p("(nuevo|diferente|otro) (modo|sistema|rol|personaje|bot|asistente|ai|ia)"),
        p("modo (developer|dev|libre|sin restricciones|jailbreak|admin|god|di[oó]s|especial|debug|test)"),
        p("(developer|jailbreak|dan|sudo) mode"),
        p("pretend (you are|to be|that you)"),
        p("roleplay"),

        // Revelación de internos del sistema
        p("(mu[eé]strame|dime|revela|comparte|dame|necesito|quiero saber) (el |tu )?(prompt|system prompt|instrucciones? (internas?|del sistema)|configuraci[oó]n (interna|del sistema|del modelo))"),
        p("(cu[aá]les? son|qu[eé] son) (tus|sus) instrucciones?"),
        p("qu[eé] (instrucciones?|reglas?|restricciones?|prompt) (tienes?|usas?|sigues?)"),
        p("(muestra|revela|comparte|di) (tu|el) system prompt"),
        p("show (me )?(your |the )?(system prompt|instructions|rules|prompt)"),
        p("ignore (previous|all|your) (instructions?|rules?|prompt)"),
        p("forget (your|all|the|these) (instructions?|rules?|constraints?)"),

        // Información técnica interna
        p("(anthropic|openai|google|cohere|voyage|mistral).*api.?key"),
        p("api.?key"),
        p("(tu|su|la|el|los|las) (api.?key|token de (autenticaci[oó]n|acceso|api)|secret(s?)|credenciales?)"),
        p("variables? de entorno"),
        p("(endpoint(s?)|url(s?)) (interno(s?)|privado(s?)|del sistema|del backend)"),
        p("arquitectura (del? sistema|backend|del servidor|interna)"),
        p("qu[eé] modelo (eres|usas?|utilizas?|est[aá]s? usando)"),
        p("(qu[eé]|cu[aá]l) (llm|modelo de ia|modelo de lenguaje) (eres|usas?)"),
        p("(chatgpt|gpt-|claude|gemini|llama|mistral).*eres"),
        p("(cu[aá]l es|qu[eé]|dime) (tu|la) (versi[oó]n|arquitectura)")
    );

    // ── Palabras clave del dominio HOTCLICK ───────────────────────────────────

    private static final Set<String> DOMAIN_KEYWORDS = Set.of(
        // Producto
        "producto", "productos", "artículo", "artículos", "ítem", "ítems",
        "precio", "precios", "costo", "costos", "cuánto cuesta", "cuánto vale", "cuanto cuesta", "cuanto vale",
        "disponible", "disponibilidad", "stock", "inventario", "agotado", "unidades",
        "marca", "marcas", "modelo", "modelos",
        "especificaciones", "características", "funciona", "funciones",
        "garantía", "garantías",
        "talla", "tamaño", "dimensiones", "medidas",
        "compatible", "compatibilidad",
        "recomendar", "recomendás", "recomendes", "sugerir", "sugerís",
        "catálogo", "colección", "tienda", "hotclick",
        "carrito", "agregar", "añadir", "comprar",
        "oferta", "descuento", "promoción", "cupón",
        "calidad", "original", "nuevo", "usado", "refabricado", "sellado",
        // Pago / compra
        "pagar", "pago", "pagos", "forma de pago",
        "tarjeta", "crédito", "débito",
        "sinpe", "sinpe móvil", "transferencia",
        "stripe",
        "envío", "entrega", "despacho", "domicilio",
        "tiempo de entrega", "cuándo llega", "cuando llega",
        "costo de envío", "envío gratis",
        "factura", "comprobante", "checkout",
        // Soporte / pedido
        "pedido", "mi pedido", "mi orden", "número de pedido",
        "devolución", "devolver", "cambio",
        "seguimiento", "tracking", "rastrear",
        "reembolso", "cancelar",
        "soporte", "atención al cliente", "contactar",
        // Categorías comunes del catálogo
        "iluminación", "luces", "lámpara", "foco", "led", "tira led",
        "electrónico", "electrónica", "tecnología",
        "accesorio", "accesorios",
        "decoración", "hogar",
        "govee", "philips", "samsung", "lg", "xiaomi", "anker", "tp-link",
        "alexa", "google home", "smart home", "inteligente", "wifi", "bluetooth"
    );

    // ── Indicadores de dominio propio por tipo ────────────────────────────────

    private static final Set<String> COMPRA_KEYWORDS = Set.of(
        "pagar", "pago", "tarjeta", "sinpe", "stripe", "paypal",
        "envío", "entrega", "despacho", "domicilio", "dirección de entrega",
        "costo de envío", "tiempo de entrega", "cuándo llega",
        "factura", "comprobante", "checkout", "descuento", "cupón"
    );

    private static final Set<String> SOPORTE_KEYWORDS = Set.of(
        "pedido", "mi pedido", "mi orden",
        "devolución", "devolver", "reembolso",
        "seguimiento", "tracking", "rastrear",
        "cancelar", "cancelación",
        "soporte", "atención al cliente",
        "llegó mal", "llegó roto", "no funciona", "defectuoso", "problema con"
    );

    // ── Patrones fuera de dominio ─────────────────────────────────────────────

    private static final List<Pattern> OOD_PATTERNS = List.of(
        // Expresiones matemáticas
        p("\\b\\d+\\s*[+\\-*/÷×]\\s*\\d+\\b"),
        p("\\b(cu[aá]nto es|cuántos son|resuelve|calcula(r)?|cu[aá]l es el resultado de)\\s+\\d"),
        p("\\b(ecuaci[oó]n|[aá]lgebra|geometr[ií]a|trigonometr[ií]a|c[aá]lculo (diferencial|integral)|estad[ií]stica|probabilidad|matem[aá]tica(s)?)\\b"),
        p("\\b(integral|derivada|logaritmo|exponencial|factorial|polinomio|teorema|hip[oó]tesis)\\b"),

        // Programación / tecnología general
        p("\\b(programa(r|ci[oó]n|me)|c[oó]digo|codifica(r|me)|script|depura(r|ci[oó]n))\\b"),
        p("\\b(python|javascript|typescript|kotlin|swift|php|golang|rust|c\\+\\+|c#|haskell|scala|matlab|r\\s+programaci[oó]n)\\b"),
        p("\\b(html|css|sql|nosql|graphql|rest api|grpc|docker|kubernetes|git|github|linux|bash|shell)\\b"),
        p("\\b(algoritmo|estructura de datos|complejidad computacional|big[- ]?o|recursion|recursividad)\\b"),
        p("\\b(clase|objeto|herencia|polimorfismo|encapsulamiento|dise[nñ]o de software)\\b"),
        p("\\b(compilar|depurar|debuggear|debugging|refactorizar)\\b"),
        p("\\b(machine learning|deep learning|red neuronal|inteligencia artificial general|llm|modelo de lenguaje)\\b"),
        p("\\b(qu[eé] es chatgpt|qu[eé] es gpt|qu[eé] es gemini|qu[eé] es (un )?llm|c[oó]mo funciona (la )?ia)\\b"),

        // Ciencias
        p("\\b(f[ií]sica|qu[ií]mica|biolog[ií]a|geolog[ií]a|astronom[ií]a|astro(f[ií]sica)?)\\b"),
        p("\\b([aá]tomo|mol[eé]cula|c[eé]lula|gen[eé]tico|ADN|ARN|prot[eé]ina|enzima)\\b"),
        p("\\b(f[oó]rmula qu[ií]mica|tabla peri[oó]dica|reacci[oó]n qu[ií]mica|enlace qu[ií]mico)\\b"),
        p("\\b(fuerza|velocidad|aceleraci[oó]n|masa|energ[ií]a|termodin[aá]mica|electromagnetismo)\\b"),

        // Historia / Política / Geografía
        p("\\b(historia de|qu[ié][eé]n fue|cu[aá]ndo fue|d[oó]nde fue|qu[eé] pas[oó] en|en qu[eé] a[nñ]o)\\b"),
        p("\\b(guerra|revoluci[oó]n|batalla|conquista|colonizaci[oó]n|imperio|monarqu[ií]a|dictadura|democracia)\\b"),
        p("\\b(presidente de|primer ministro de|capital de|pa[ií]s|continente|mapa de|geography)\\b"),
        p("\\b(pol[ií]tica|partido pol[ií]tico|elecciones|gobierno|constituci[oó]n|ley de|legislaci[oó]n)\\b"),

        // Medicina / Salud
        p("\\b(s[ií]ntoma(s)?|medicamento|pastilla|medicina|dosis|receta m[eé]dica|farmacia)\\b"),
        p("\\b(diagn[oó]stico|enfermedad|patolog[ií]a|tratamiento m[eé]dico|terapia)\\b"),
        p("\\b(doctor|m[eé]dico|hospital|cl[ií]nica|ciruj[aá]n|especialista (m[eé]dico|en salud))\\b"),
        p("\\b(dolor de (cabeza|espalda|muela|est[oó]mago|pecho)|fiebre|n[aá]useas|mareo)\\b"),

        // Deportes / Entretenimiento / Noticias
        p("\\b(qu[ié][eé]n gan[oó]|resultado del partido|mundial|copa (del mundo|am[eé]rica)|liga|torneo|campe[oó]n)\\b"),
        p("\\b([uú]ltimas noticias|noticia(s)? de hoy|breaking news|noticias (de|sobre))\\b"),
        p("\\b(pel[ií]cula|serie de televisi[oó]n|canci[oó]n|[aá]lbum musical|artista (famoso|musical))\\b"),
        p("\\b(partido de (f[uú]tbol|baloncesto|b[eé]isbol|tenis|golf)|equipo deportivo)\\b"),

        // Tareas académicas / escritura creativa
        p("\\b(h[aá]z(me)?( la| un| una)?\\s+(tarea|resumen|ensayo|carta|correo|email|trabajo|ejercicio))\\b"),
        p("\\b(redacta(me)?|escr[ií]be(me)?\\s+(un|una|el|la)\\s+(carta|correo|email|poema|cuento|historia|ensayo|tesis|informe|resumen))\\b"),
        p("\\b(escrib(e|ir)\\s+un poema|componme un verso|crea(me)? un cuento)\\b"),
        p("\\b(resumen de (un )?libro|tesis (doctoral|de grado|de maestr[ií]a)|monograf[ií]a)\\b"),

        // Traducciones
        p("\\b(traduc(e|ir|ci[oó]n)|en ingl[eé]s (c[oó]mo se dice|qu[eé] significa)|c[oó]mo se dice .+ en (ingl[eé]s|franc[eé]s|portugu[eé]s|alem[aá]n))\\b"),
        p("\\b(how do you say|what does .+ mean in spanish)\\b")
    );

    // ── Palabras que NUNCA deben llegar al pipeline ───────────────────────────
    // Estas invalidan la consulta incluso si hay keywords de dominio presentes.

    private static final Set<String> HARD_BLOCK_TERMS = Set.of(
        "api key", "apikey", "api_key",
        "token secreto", "secret token",
        "anthropic key", "voyage key",
        "system prompt", "system_prompt",
        "variable de entorno", "variables de entorno",
        "endpoint privado", "endpoints privados",
        ".env", "application.properties", "application.yml"
    );

    // ── Clasificación pública ─────────────────────────────────────────────────

    /**
     * Clasifica una consulta del usuario.
     * El resultado determina si el pipeline RAG debe ejecutarse o no.
     *
     * @param query Texto ya sanitizado del usuario.
     * @return Clasificación de la consulta.
     */
    public QueryClassification classify(String query) {
        if (query == null || query.isBlank()) return QueryClassification.PRODUCTO;

        String q = query.toLowerCase().trim();

        // 1. Hard block terms → siempre PROMPT_INJECTION
        for (String term : HARD_BLOCK_TERMS) {
            if (q.contains(term)) return QueryClassification.PROMPT_INJECTION;
        }

        // 2. Patrones de prompt injection → PROMPT_INJECTION
        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(q).find()) return QueryClassification.PROMPT_INJECTION;
        }

        // 3. Palabras del dominio → consulta válida (clasificar tipo)
        int domainScore = countDomainKeywords(q);
        if (domainScore > 0) {
            return classifyDomainType(q);
        }

        // 4. Patrones fuera de dominio → FUERA_DE_DOMINIO
        for (Pattern pattern : OOD_PATTERNS) {
            if (pattern.matcher(q).find()) return QueryClassification.FUERA_DE_DOMINIO;
        }

        // 5. Default: beneficio de duda → PRODUCTO
        //    Consultas cortas o ambiguas sin señales claras se permiten.
        //    El pipeline RAG decidirá si hay respuesta relevante o no.
        return QueryClassification.PRODUCTO;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private QueryClassification classifyDomainType(String q) {
        int compraScore  = countKeywordsFrom(q, COMPRA_KEYWORDS);
        int soporteScore = countKeywordsFrom(q, SOPORTE_KEYWORDS);
        if (soporteScore >= compraScore && soporteScore > 0) return QueryClassification.SOPORTE;
        if (compraScore > 0) return QueryClassification.COMPRA;
        return QueryClassification.PRODUCTO;
    }

    private int countDomainKeywords(String q) {
        return countKeywordsFrom(q, DOMAIN_KEYWORDS);
    }

    private static int countKeywordsFrom(String q, Set<String> keywords) {
        int count = 0;
        for (String kw : keywords) {
            if (q.contains(kw)) count++;
        }
        return count;
    }

    private static Pattern p(String regex) {
        return Pattern.compile(regex, CASE_INSENSITIVE | UNICODE_CASE);
    }
}
