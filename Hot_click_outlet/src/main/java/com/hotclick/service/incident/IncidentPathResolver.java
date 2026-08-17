package com.hotclick.service.incident;

import com.hotclick.service.GitHubService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class IncidentPathResolver {

    private static final Logger log = LoggerFactory.getLogger(IncidentPathResolver.class);

    private final GitHubService gitHubService;

    public IncidentPathResolver(GitHubService gitHubService) {
        this.gitHubService = gitHubService;
    }

    public String resolverRutaArchivo(String culprit) {
        if (culprit == null || culprit.isBlank()) {
            return null;
        }

        if (culprit.contains(".jsx") || culprit.contains(".js") || culprit.contains(".tsx")) {
            return resolverRutaFrontend(culprit);
        }

        String clazz = culprit.contains(" in ") ? culprit.split(" in ")[0].trim() : culprit.trim();
        if (!clazz.startsWith("com.hotclick")) {
            return null;
        }
        return "Hot_click_outlet/src/main/java/" + clazz.replace('.', '/') + ".java";
    }

    public String resolverRutaFrontend(String culprit) {
        String parte = culprit.contains(" in ") ? culprit.split(" in ")[0].trim() : culprit.trim();
        if (parte.startsWith("src/")) {
            return "Hot_click_outlet/frontend/" + parte;
        }

        String nombre = parte.contains("/") ? parte.substring(parte.lastIndexOf('/') + 1) : parte;
        nombre = nombre.replace(".jsx", "").replace(".js", "").replace(".tsx", "");

        String[] candidatos = {
                "Hot_click_outlet/frontend/src/pages/" + nombre + ".jsx",
                "Hot_click_outlet/frontend/src/pages/admin/" + nombre + ".jsx",
                "Hot_click_outlet/frontend/src/components/" + nombre + ".jsx",
                "Hot_click_outlet/frontend/src/components/ui/" + nombre + ".jsx",
                "Hot_click_outlet/frontend/src/services/" + nombre + ".js",
        };
        for (String candidato : candidatos) {
            try {
                String contenido = gitHubService.obtenerArchivo(candidato);
                if (contenido != null) {
                    return candidato;
                }
            } catch (Exception e) {
                log.debug("candidato no accesible: {}", e.getMessage());
            }
        }
        return null;
    }
}
