package com.hotclick.agente.campana;

import com.hotclick.agente.canal.Boton;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Ofrece a un cliente recibir ofertas del negocio con el botón «Sí, quiero ofertas». Es un mensaje de la conversación
 * abierta (dentro de la ventana de 24 h), así que no es una plantilla ni cuesta como marketing. Nunca se ofrece a quien
 * está de baja ni a quien ya decidió. El texto está pendiente de aprobación legal (decisión del dueño, AG-15).
 */
@Service
public class OfertaConsentimientoService {

    private static final Logger log = LoggerFactory.getLogger(OfertaConsentimientoService.class);

    public static final String ID_SI = "campana_optin";
    public static final String ID_NO = "campana_optout";

    private final ConsentimientoService consentimientos;
    private final CanalMensajeria canal;
    private final EmpresaRepository empresas;
    private final IdiomaConversacion idiomas;

    public OfertaConsentimientoService(ConsentimientoService consentimientos, CanalMensajeria canal,
                                       EmpresaRepository empresas, IdiomaConversacion idiomas) {
        this.idiomas = idiomas;
        this.consentimientos = consentimientos;
        this.canal = canal;
        this.empresas = empresas;
    }

    public static List<Boton> botones() {
        return botones(Idioma.ES);
    }

    public static List<Boton> botones(Idioma idioma) {
        return List.of(new Boton(ID_SI, TextosFijos.ofertaBotonSi(idioma)),
            new Boton(ID_NO, TextosFijos.ofertaBotonNo(idioma)));
    }

    static String texto(String negocio) {
        return TextosFijos.ofertaPregunta(Idioma.ES, negocio);
    }

    /** Idioma de la conversación más reciente del contacto (para los textos fijos del opt-in). */
    Idioma idiomaDe(CanalCuenta cuenta, String contacto) {
        return idiomas.deContacto(cuenta.getId(), contacto);
    }

    /** @return true si se envió el ofrecimiento. Nunca lanza: un fallo de Meta no debe afectar a quien llama. */
    public boolean ofrecer(CanalCuenta cuenta, String contacto) {
        if (cuenta == null || cuenta.getEmpresaId() == null || contacto == null || contacto.isBlank()) return false;
        Long empresaId = cuenta.getEmpresaId();
        try {
            if (!consentimientos.puedeOfrecer(empresaId, cuenta.getTipo().name(), contacto)) return false;
            Idioma idioma = idiomaDe(cuenta, contacto);
            canal.enviarBotones(cuenta, contacto, TextosFijos.ofertaPregunta(idioma, nombreNegocio(empresaId)),
                botones(idioma), idioma);
            return true;
        } catch (RuntimeException e) {
            log.warn("[campana-consent] no se pudo ofrecer el opt-in empresa={}: {}", empresaId, e.getClass().getSimpleName());
            return false;
        }
    }

    String nombreNegocio(Long empresaId) {
        Empresa e = empresas.findById(empresaId).orElse(null);
        if (e == null) return "este negocio";
        String comercial = e.getNombreComercial();
        return comercial != null && !comercial.isBlank() ? comercial : e.getNombreEmpresa();
    }
}
