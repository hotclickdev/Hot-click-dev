package com.hotclick.service.copilot;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Perfil de marca en HotClick: ficha, visibilidad y huecos del catálogo.
 */
@Component
class AiCopilotMarcaQueries {

    @Autowired private JdbcTemplate jdbc;

    String getPerfilMarca(Long empresaId) {
        Map<String, Object> emp = jdbc.queryForMap("""
            SELECT nombre_empresa, nombre_comercial, descripcion, visibilidad_publica
            FROM hot_click_empresa_tb
            WHERE id_empresa = ?
            """, empresaId);
        Map<String, Object> gaps = jdbc.queryForMap("""
            SELECT COUNT(*) FILTER (WHERE visible_catalogo = TRUE AND vendido = FALSE) AS visibles,
                   COUNT(*) FILTER (WHERE visible_catalogo = TRUE AND vendido = FALSE
                     AND (imagen_principal_url IS NULL OR imagen_principal_url = '')) AS sin_foto,
                   COUNT(*) FILTER (WHERE visible_catalogo = TRUE AND vendido = FALSE
                     AND (tags IS NULL OR tags = '')) AS sin_tags
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
            """, empresaId);
        return formatear(emp, gaps);
    }

    static String formatear(Map<String, Object> emp, Map<String, Object> gaps) {
        String comercial = asText(emp.get("nombre_comercial"));
        String legal = asText(emp.get("nombre_empresa"));
        String nombre = !comercial.isBlank() ? comercial : legal;
        if (nombre.isBlank()) nombre = "tu negocio";
        String bio = asText(emp.get("descripcion"));
        boolean visible = Boolean.TRUE.equals(emp.get("visibilidad_publica"));
        int visibles = numero(gaps.get("visibles"));
        int sinFoto = numero(gaps.get("sin_foto"));
        int sinTags = numero(gaps.get("sin_tags"));

        StringBuilder sb = new StringBuilder();
        sb.append("Marca: ").append(nombre).append(".\n");
        sb.append("Bio: ").append(bio.isBlank() ? "sin completar" : recortar(bio, 180)).append(".\n");
        sb.append("Marketplace: ").append(visible ? "visible" : "oculto").append(".\n");
        sb.append("Productos visibles: ").append(visibles).append(".\n");
        if (sinFoto > 0) sb.append(sinFoto).append(" sin foto.\n");
        if (sinTags > 0) sb.append(sinTags).append(" sin tags.\n");
        sb.append(accionMarca(visible, bio, sinFoto));
        return sb.toString();
    }

    static String accionMarca(boolean visible, String bio, int sinFoto) {
        if (!visible) return "Acción: activá visibilidad pública para aparecer en el marketplace.";
        if (bio == null || bio.isBlank()) return "Acción: escribí una bio corta en Config para que te encuentren.";
        if (sinFoto > 0) return "Acción: subí foto a los productos sin imagen; eso es lo que más frena ventas.";
        return "Acción: publicá un post del producto que más se mueve.";
    }

    private static String asText(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private static int numero(Object v) {
        return v instanceof Number n ? n.intValue() : 0;
    }

    private static String recortar(String texto, int max) {
        if (texto.length() <= max) return texto;
        return texto.substring(0, max) + "…";
    }
}
