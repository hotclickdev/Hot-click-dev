package com.hotclick.agente.asesor;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.contacto.ContactoPublicoPolicy;
import com.hotclick.utils.SoporteTelefono;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Enlace al chat (WhatsApp) de la tienda para el asesor web. Misma regla que {@code /api/public/branding}: solo
 * si el plan efectivo de la tienda es PYME o NEGOCIO_PLUS ({@link ContactoPublicoPolicy}). En EMPRENDEDOR, sin
 * plan, en el marketplace o sin número no hay botón (no se cae al número de HotClick: no es el chat de la tienda).
 * Ante cualquier error, falla cerrado: sin botón.
 */
@Service
public class ChatTiendaService {

    private static final Logger log = LoggerFactory.getLogger(ChatTiendaService.class);

    private final EmpresaRepository empresas;

    public ChatTiendaService(EmpresaRepository empresas) {
        this.empresas = empresas;
    }

    /** URL {@code https://wa.me/<dígitos>} de la tienda, o vacío si su plan no lo permite. */
    public Optional<String> urlWhatsapp(Long empresaId, boolean marketplace) {
        if (marketplace || empresaId == null) return Optional.empty();
        try {
            boolean permite = empresas.findNombrePlanEfectivo(empresaId)
                .map(ContactoPublicoPolicy::permiteContacto).orElse(false);
            if (!permite) return Optional.empty();
            Empresa e = empresas.findById(empresaId).orElse(null);
            if (e == null) return Optional.empty();
            String propio = SoporteTelefono.digitosWa(
                e.getNumeroWhatsapp() != null && !e.getNumeroWhatsapp().isBlank()
                    ? e.getNumeroWhatsapp() : e.getTelefonoEmpresa());
            return propio.isEmpty() ? Optional.empty() : Optional.of("https://wa.me/" + propio);
        } catch (RuntimeException ex) {
            log.debug("[asesor] Sin chat de tienda empresa={}: {}", empresaId, ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
