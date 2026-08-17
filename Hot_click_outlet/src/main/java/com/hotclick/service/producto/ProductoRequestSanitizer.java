package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
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
        String msg = e.getMessage();
        if (msg != null && msg.contains("value too long for type character varying")) {
            return "Uno de los campos de texto supera el límite permitido. "
                + "Revisá descripción, especificaciones o cómo usar y reducí el texto.";
        }
        return msg != null ? msg : "Error al procesar el producto";
    }
}
