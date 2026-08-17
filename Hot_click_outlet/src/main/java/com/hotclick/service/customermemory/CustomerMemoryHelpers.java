package com.hotclick.service.customermemory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

final class CustomerMemoryHelpers {

    private CustomerMemoryHelpers() {}

    static boolean isValidVisitorId(String visitorId) {
        if (visitorId == null || visitorId.isBlank()) return false;
        try { UUID.fromString(visitorId); return true; }
        catch (IllegalArgumentException e) { return false; }
    }

    static List<String> parseJsonArray(String json, ObjectMapper objectMapper) {
        if (json == null || json.isBlank()) return List.of();
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isArray()) return List.of();
            List<String> list = new ArrayList<>();
            node.forEach(n -> list.add(n.asText()));
            return Collections.unmodifiableList(list);
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    static List<String> castList(Object obj) {
        if (obj instanceof List<?> l) return (List<String>) l;
        return List.of();
    }

    static List<String> mergeList(List<String> existing, List<String> incoming, int maxSize) {
        Set<String> seen = new LinkedHashSet<>(existing);
        seen.addAll(incoming);
        List<String> merged = new ArrayList<>(seen);
        if (merged.size() > maxSize) merged = merged.subList(0, maxSize);
        return Collections.unmodifiableList(merged);
    }

    static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    static String xmlEscape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
