package com.hotclick.controller.storefront;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.service.contacto.ContactoPublicoService;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class StorefrontInfoMapper {

    private final BodegaRepository bodegaRepository;
    private final ContactoPublicoService contactoPublico;

    public StorefrontInfoMapper(BodegaRepository bodegaRepository, ContactoPublicoService contactoPublico) {
        this.bodegaRepository = bodegaRepository;
        this.contactoPublico = contactoPublico;
    }

    /**
     * Solo datos de vitrina: nada fiscal ni de contacto interno de la empresa.
     * WhatsApp e Instagram solo salen si el plan es PYME o NEGOCIO_PLUS ({@code contactoDirecto});
     * en EMPRENDEDOR van vacíos para que la venta no se vaya fuera de HotClick.
     */
    public Map<String, Object> info(Empresa empresa) {
        boolean contacto = contactoPublico.permiteContacto(empresa.getId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("slug", empresa.getSlug());
        m.put("nombreComercial", orEmpty(empresa.getNombreComercial(), empresa.getNombreEmpresa()));
        m.put("logoUrl", orEmpty(empresa.getLogoUrl(), ""));
        m.put("colorPrimario", orEmpty(empresa.getColorPrimario(), "#E73B33"));
        m.put("colorSecundario", orEmpty(empresa.getColorSecundario(), "#152B5E"));
        m.put("colorAcento", orEmpty(empresa.getColorAcento(), "#1747A8"));
        m.put("tagline", orEmpty(empresa.getTagline(), ""));
        m.put("footerTexto", orEmpty(empresa.getFooterTexto(), ""));
        m.put("whatsapp", contacto ? orEmpty(empresa.getNumeroWhatsapp(), "") : "");
        m.put("moneda", orEmpty(empresa.getMonedaDefecto(), "CRC"));
        m.put("descripcion", orEmpty(empresa.getDescripcion(), ""));
        m.put("categoriaNegocio", orEmpty(empresa.getCategoriaNegocio(), ""));
        m.put("instagram", contacto ? orEmpty(empresa.getInstagram(), "") : "");
        m.put("zonaEnvio", orEmpty(empresa.getZonaEnvio(), ""));
        m.put("ogImagenUrl", orEmpty(empresa.getOgImagenUrl(), ""));
        m.put("enHotclickDesde", desde(empresa));
        m.put("facturaElectronica", Boolean.TRUE.equals(empresa.getInscritoHacienda()));
        m.put("contactoDirecto", contacto);
        m.put("retiro", retiroEnTienda(empresa));
        return m;
    }

    private String desde(Empresa empresa) {
        LocalDateTime fecha = empresa.getFechaAprobacion() != null ? empresa.getFechaAprobacion() : empresa.getFechaRegistro();
        return fecha != null ? fecha.toLocalDate().toString() : "";
    }

    /** La dirección solo se publica si la tienda habilitó el retiro: la necesita el cliente para ir. */
    private Map<String, Object> retiroEnTienda(Empresa empresa) {
        return bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO).stream()
            .filter(b -> Boolean.TRUE.equals(b.getPermiteRetiroCliente()))
            .findFirst()
            .map(this::datosRetiro)
            .orElse(null);
    }

    private Map<String, Object> datosRetiro(Bodega b) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("nombre", orEmpty(b.getNombreBodega(), ""));
        r.put("provincia", orEmpty(b.getProvincia(), ""));
        r.put("canton", orEmpty(b.getCanton(), ""));
        r.put("direccion", orEmpty(b.getDireccionExacta(), ""));
        r.put("horarioApertura", b.getHorarioApertura() != null ? b.getHorarioApertura().toString() : "");
        r.put("horarioCierre", b.getHorarioCierre() != null ? b.getHorarioCierre().toString() : "");
        return r;
    }

    private String orEmpty(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
