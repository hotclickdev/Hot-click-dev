package com.hotclick.service.publicchat;

import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class PublicChatIntentHelper {

    public boolean isOffTopic(String message) {
        String lower = message.toLowerCase().replaceAll("[^a-záéíóúüñ\\s]", " ");
        for (String trigger : PublicChatIntentLexicon.OFF_TOPIC_TRIGGERS) {
            if (lower.contains(trigger)) return true;
        }
        return false;
    }

    public boolean isGreeting(String message) {
        String lower = message.toLowerCase().trim();
        for (String g : PublicChatIntentLexicon.GREETINGS) {
            if (lower.equals(g) || lower.startsWith(g + " ") || lower.startsWith(g + ",")
                || lower.startsWith(g + "!") || lower.startsWith(g + "?")) return true;
        }
        return lower.length() < 8 && lower.matches("[a-záéíóúüñ!¡]+");
    }

    public String normalize(String s) {
        String n = java.text.Normalizer.normalize(s.toLowerCase(), java.text.Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}", "");
    }

    public boolean isBusinessInfoQuery(String message) {
        String n = normalize(message);
        boolean mentionsStore = n.contains("hotclick") || n.contains("la tienda") || n.contains("the store");
        boolean asksWhatWho = n.contains("que es") || n.contains("what is") || n.contains("quienes son")
            || n.contains("sobre ustedes") || n.contains("about you") || n.contains("informacion de");
        return mentionsStore && asksWhatWho;
    }

    public boolean isWhatsappContactQuery(String message) {
        return normalize(message).contains("whatsapp");
    }

    public boolean isShowAllOrPopularQuery(String message) {
        String n = normalize(message);
        return n.contains("todos los productos") || n.contains("productos populares")
            || n.contains("lo mas popular") || n.contains("mas popular")
            || n.contains("popular products") || n.contains("all products");
    }

    public boolean isOfferQuery(String message) {
        String n = normalize(message);
        return n.contains("en oferta") || n.contains("ofertas") || n.contains("on sale") || n.contains("descuento");
    }

    public boolean isProductFaqFollowUp(String message) {
        String n = normalize(message);
        return PublicChatIntentLexicon.FAQ_FOLLOWUP_PHRASES.stream().anyMatch(n::contains);
    }

    public boolean isEnglish(String msg) {
        String lower = msg.toLowerCase();
        long count = Arrays.stream(new String[]{
            " the "," a "," an "," is "," are "," what "," how "," where ",
            " i "," i'm "," i need "," looking "," want "," show "," find ",
            " buy "," price "," cheap "," good "," best "," any "," more "
        }).filter(lower::contains).count();
        return count >= 2;
    }

    public Long extractMaxBudget(String msg) {
        return PublicChatBudgetExtractor.extractMaxBudget(msg);
    }

    public boolean isGiftIntent(String msg) {
        String lower = msg.toLowerCase();
        return lower.contains("regalar") || lower.contains("regalo") || lower.contains("obsequio")
            || lower.contains("gift") || lower.contains("present")
            || lower.contains("cumpleaños") || lower.contains("aniversario")
            || lower.contains("navidad") || lower.contains("día de la madre")
            || lower.contains("día del padre") || lower.contains("san valentín")
            || lower.contains("quinceaños") || lower.contains("boda")
            || lower.contains("día del niño") || lower.contains("para mi mamá")
            || lower.contains("para mi papá") || lower.contains("para mi esposa")
            || lower.contains("para mi esposo") || lower.contains("para mi novio")
            || lower.contains("para mi novia");
    }

    public Set<String> extractNegations(String msg) {
        Set<String> negated = new LinkedHashSet<>();
        Pattern p = Pattern.compile(
            "(?:sin|no sea|no quiero|que no|sin que sea)\\s+(?:de\\s+)?([a-záéíóúüñ]+)"
        );
        Matcher m = p.matcher(msg.toLowerCase());
        while (m.find()) negated.add(m.group(1));
        return negated;
    }

    public boolean isOutsideBusinessHours() {
        int hour = ZonedDateTime.now(PublicChatIntentLexicon.CR_TZ).getHour();
        return hour < 8 || hour >= 20;
    }

    public String classifyIntent(String msg, boolean isGift, Long budget) {
        if (isGift) return "REGALO";
        if (budget != null) return "PRESUPUESTO";
        String lower = msg.toLowerCase();
        if (lower.contains("huele") || lower.contains("feo") || lower.contains("frío")
            || lower.contains("calor") || lower.contains("oscuro") || lower.contains("humedad")
            || lower.contains("sucio") || lower.contains("ruido") || lower.contains("organizar")
            || lower.contains("problema") || lower.contains("solución")) return "PROBLEMA";
        return "GENERAL";
    }

    /**
     * Términos del usuario (sin stopwords ni sinónimos).
     * Los sinónimos solo se usan como boost de rank, no para el match ILIKE.
     */
    public List<String> userTerms(String message) {
        if (message == null || message.isBlank()) return List.of();
        String[] words = message.toLowerCase()
            .replaceAll("[^a-záéíóúüñ\\s]", " ")
            .split("\\s+");
        return Arrays.stream(words)
            .filter(w -> w.length() > 2 && !PublicChatIntentLexicon.STOP.contains(w))
            .distinct()
            .toList();
    }

    /** tsquery OR solo con términos del usuario (sinónimos ya no amplían el match). */
    public String buildTsQuery(String message) {
        List<String> terms = userTerms(message);
        if (terms.isEmpty()) return "";
        return String.join(" | ", terms);
    }

    /** Sinónimos para boost de ranking — no para WHERE ILIKE. */
    public List<String> synonymBoostTerms(String message) {
        return expandSynonyms(userTerms(message));
    }

    public List<String> expandSynonyms(List<String> terms) {
        return PublicChatSynonymExpander.expandSynonyms(terms);
    }
}
