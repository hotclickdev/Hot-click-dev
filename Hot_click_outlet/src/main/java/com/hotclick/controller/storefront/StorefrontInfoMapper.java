package com.hotclick.controller.storefront;

import com.hotclick.model.Empresa;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class StorefrontInfoMapper {

    public Map<String, Object> info(Empresa empresa) {
        return Map.of(
            "slug", empresa.getSlug(),
            "nombreComercial", orEmpty(empresa.getNombreComercial(), empresa.getNombreEmpresa()),
            "logoUrl", orEmpty(empresa.getLogoUrl(), ""),
            "colorPrimario", orEmpty(empresa.getColorPrimario(), "#E73B33"),
            "colorSecundario", orEmpty(empresa.getColorSecundario(), "#152B5E"),
            "colorAcento", orEmpty(empresa.getColorAcento(), "#1747A8"),
            "tagline", orEmpty(empresa.getTagline(), ""),
            "footerTexto", orEmpty(empresa.getFooterTexto(), ""),
            "whatsapp", orEmpty(empresa.getNumeroWhatsapp(), ""),
            "moneda", orEmpty(empresa.getMonedaDefecto(), "CRC")
        );
    }

    private String orEmpty(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
