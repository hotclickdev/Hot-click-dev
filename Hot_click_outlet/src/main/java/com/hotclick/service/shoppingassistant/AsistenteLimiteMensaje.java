package com.hotclick.service.shoppingassistant;

import com.hotclick.model.Empresa;
import com.hotclick.rag.dto.AccionChat;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.contacto.ContactoPublicoPolicy;
import com.hotclick.utils.SoporteTelefono;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

/**
 * Arma el aviso amigable (voseo) y los botones cuando el cupo diario del asistente se agota.
 *
 * <p>WhatsApp: solo si el plan efectivo del negocio es PYME o NEGOCIO_PLUS se usa el del negocio
 * ({@link ContactoPublicoPolicy}); en EMPRENDEDOR, sin plan o en el marketplace va el de HotClick
 * ({@code hotclick.soporte.telefono}). Sin número configurado, el botón se omite.
 */
class AsistenteLimiteMensaje {

    private static final Logger log = LoggerFactory.getLogger(AsistenteLimiteMensaje.class);

    private final EmpresaRepository empresas;
    private final String telefonoSoporte;
    private final String mensajeCliente;
    private final String mensajeAgotado;

    AsistenteLimiteMensaje(EmpresaRepository empresas, String telefonoSoporte,
                           String mensajeCliente, String mensajeAgotado) {
        this.empresas = empresas;
        this.telefonoSoporte = telefonoSoporte;
        this.mensajeCliente = mensajeCliente;
        this.mensajeAgotado = mensajeAgotado;
    }

    String mensaje(AsistenteCuotaDiaria.Motivo motivo) {
        return motivo == AsistenteCuotaDiaria.Motivo.CLIENTE ? mensajeCliente : mensajeAgotado;
    }

    List<AccionChat> acciones(Long empresaId, boolean marketplace) {
        List<AccionChat> acciones = new ArrayList<>();
        Empresa empresa = marketplace ? null : buscar(empresaId);
        String slug = empresa != null && empresa.getSlug() != null && !empresa.getSlug().isBlank()
            ? empresa.getSlug() : null;
        acciones.add(new AccionChat(AccionChat.BUSCAR, "Buscar productos",
            slug == null ? "/productos" : "/tienda/" + slug));
        String wa = whatsapp(empresa, marketplace);
        if (!wa.isEmpty()) {
            acciones.add(new AccionChat(AccionChat.WHATSAPP, "WhatsApp", "https://wa.me/" + wa));
        }
        return List.copyOf(acciones);
    }

    private String whatsapp(Empresa empresa, boolean marketplace) {
        if (!marketplace && empresa != null && permiteContacto(empresa.getId())) {
            String propio = SoporteTelefono.digitosWa(
                empresa.getNumeroWhatsapp() != null && !empresa.getNumeroWhatsapp().isBlank()
                    ? empresa.getNumeroWhatsapp() : empresa.getTelefonoEmpresa());
            if (!propio.isEmpty()) return propio;
        }
        return ContactoPublicoPolicy.whatsappHotclick(telefonoSoporte);
    }

    private boolean permiteContacto(Long empresaId) {
        try {
            return empresas.findNombrePlanEfectivo(empresaId).map(ContactoPublicoPolicy::permiteContacto).orElse(false);
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] Sin plan de empresa={}: {}", empresaId, e.getClass().getName());
            return false;
        }
    }

    private Empresa buscar(Long empresaId) {
        if (empresaId == null) return null;
        try {
            return empresas.findById(empresaId).orElse(null);
        } catch (RuntimeException e) {
            log.debug("[asistente-cuota] Sin empresa={}: {}", empresaId, e.getClass().getName());
            return null;
        }
    }
}
