package com.hotclick.service.contacto;

import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Aplica {@link ContactoTextoFiltro} a la salida pública según el plan del negocio dueño del texto.
 * PYME y NEGOCIO_PLUS no se filtran; EMPRENDEDOR, sin plan o desconocido sí.
 */
@Service
public class ContactoTextoPublico {

    /**
     * Columna SQL con el plan efectivo del dueño del producto (alias {@code p} = hot_click_producto_tb).
     * Se agrega a los SELECT de fichas del chat público para enmascarar sin otra consulta.
     */
    public static final String SQL_PLAN_PRODUCTO =
        "(SELECT COALESCE(pl.nombre, e.plan_saas) FROM hot_click_empresa_tb e"
            + " LEFT JOIN hot_click_plan_tb pl ON pl.id_plan = e.fk_id_plan"
            + " WHERE e.id_empresa = p.fk_id_empresa) AS plan_empresa";

    /** Columnas de texto libre del vendedor en las filas de producto del chat público. */
    public static final List<String> COLUMNAS_TEXTO_PRODUCTO = List.of(
        "nombre_producto", "descripcion_corta", "descripcion_larga", "especificaciones",
        "como_usar", "tags", "instrucciones_personalizacion");

    private final ContactoPublicoService contactoPublico;

    public ContactoTextoPublico(ContactoPublicoService contactoPublico) {
        this.contactoPublico = contactoPublico;
    }

    public boolean filtra(Long empresaId) {
        return !contactoPublico.permiteContacto(empresaId);
    }

    public String texto(Long empresaId, String texto) {
        return texto == null || texto.isEmpty() || !filtra(empresaId) ? texto : ContactoTextoFiltro.ocultar(texto);
    }

    public String video(Long empresaId, String url) {
        return url == null || !filtra(empresaId) ? url : ContactoTextoFiltro.videoPermitido(url);
    }

    /** Enmascara las filas cuyo {@code plan_empresa} no permite contacto directo (falta la columna = se enmascara). */
    public static List<Map<String, Object>> ocultarFilasProducto(List<Map<String, Object>> filas) {
        if (filas == null) return null;
        for (Map<String, Object> fila : filas) {
            Object plan = fila.get("plan_empresa");
            if (!ContactoPublicoPolicy.permiteContacto(plan instanceof String s ? s : null)) {
                ocultarEnMapa(fila, COLUMNAS_TEXTO_PRODUCTO);
            }
        }
        return filas;
    }

    /** Reemplaza en el mapa las claves de texto indicadas (filas de JDBC o mapas de respuesta). */
    public static void ocultarEnMapa(Map<String, Object> fila, Collection<String> claves) {
        for (String clave : claves) {
            if (fila.get(clave) instanceof String s) {
                fila.put(clave, ContactoTextoFiltro.ocultar(s));
            }
        }
    }
}
