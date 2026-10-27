package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.utils.ErrorPublico;
import org.springframework.stereotype.Service;

@Service
public class ProductoRequestSanitizer {

    public void restringirCamposSoloAdmin(ProductoRequestDTO dto, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        dto.setDestacado(null);
        dto.setMetaTitle(null);
        dto.setMetaDescription(null);
        dto.setMetaKeywords(null);
        dto.setMetaTitleEn(null);
        dto.setMetaTitlePt(null);
        dto.setMetaTitleFr(null);
        dto.setMetaDescriptionEn(null);
        dto.setMetaDescriptionPt(null);
        dto.setMetaDescriptionFr(null);
    }

    public String mensajeAmigable(Exception e) {
        return mensajePublico(e);
    }

    /**
     * Texto de una excepción de alta/edición de producto que puede ver el cliente: el aviso de moderación y las
     * validaciones propias tal cual ({@link ErrorPublico}); el resto (SQL, tablas, librerías) se reemplaza por
     * un mensaje genérico y el detalle queda solo en el log.
     */
    public static String mensajePublico(Throwable e) {
        String msg = e != null ? e.getMessage() : null;
        if (msg != null && msg.contains("value too long for type character varying")) {
            return "Uno de los campos de texto supera el límite permitido. "
                + "Revisá descripción, especificaciones o cómo usar y reducí el texto.";
        }
        return ErrorPublico.mensaje(e);
    }
}
