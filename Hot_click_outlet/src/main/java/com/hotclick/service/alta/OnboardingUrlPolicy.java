package com.hotclick.service.alta;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** Solo se muestra al dueño un enlace de onboarding https cuyo dominio sea de ONVO (lista configurable). */
public final class OnboardingUrlPolicy {

    public static final String HOSTS_POR_DEFECTO = "onvopay.com,onvo.cr";

    private OnboardingUrlPolicy() {}

    public static List<String> hosts(String csv) {
        String base = csv == null || csv.isBlank() ? HOSTS_POR_DEFECTO : csv;
        return Arrays.stream(base.split(",")).map(h -> h.trim().toLowerCase(Locale.ROOT)).filter(h -> !h.isEmpty()).toList();
    }

    public static boolean esPermitida(String url, String hostsCsv) {
        if (url == null || url.isBlank() || url.length() > 1000) return false;
        try {
            URI u = URI.create(url.trim());
            if (!"https".equalsIgnoreCase(u.getScheme()) || u.getUserInfo() != null) return false;
            String host = u.getHost();
            if (host == null) return false;
            String h = host.toLowerCase(Locale.ROOT);
            for (String permitido : hosts(hostsCsv)) {
                if (h.equals(permitido) || h.endsWith("." + permitido)) return true;
            }
            return false;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
