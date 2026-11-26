package com.hotclick.agente.cupo;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.conversacion.spi.InterceptorMensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/**
 * Baja (STOP) y regreso (ACTIVAR) del contacto. Corre ANTES de guardar el mensaje y antes que el modo interno:
 * STOP, BAJA, PARAR o "no quiero mensajes" (sin importar mayúsculas, tildes, puntuación ni espacios, y solo si es el
 * mensaje completo) marcan la baja y responden una confirmación corta; ACTIVAR la quita. Ese mensaje no se guarda ni
 * llega al motor. Un contacto de baja sigue escribiendo y recibiendo respuestas a lo que pregunta; solo deja de recibir
 * recordatorios y campañas (el seguimiento consulta {@link AgenteBajaService}). ACTIVAR de alguien que no está de baja
 * sigue su camino normal. Los textos de confirmación están pendientes de aprobación legal (decisión del dueño).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class InterceptorBajaAgente implements InterceptorMensajeEntrante {

    private static final Logger log = LoggerFactory.getLogger(InterceptorBajaAgente.class);

    public static final Set<String> PALABRAS_BAJA = Set.of(
        "stop", "baja", "parar", "no quiero mensajes", "no quiero mas mensajes", "no quiero recibir mensajes",
        "unsubscribe", "stop messages", "do not message me", "nao quero mensagens", "parar mensagens");
    static final String PALABRA_ACTIVAR = "activar";

    private final AgenteBajaService bajas;
    private final EmpresaRepository empresas;
    private final ConfirmacionBajaEnvio envio;
    private final IdiomaConversacion idiomas;

    public InterceptorBajaAgente(AgenteBajaService bajas, EmpresaRepository empresas, ConfirmacionBajaEnvio envio,
                                IdiomaConversacion idiomas) {
        this.idiomas = idiomas;
        this.bajas = bajas;
        this.empresas = empresas;
        this.envio = envio;
    }

    @Override
    public boolean interceptar(CanalCuenta cuenta, MensajeEntrante m) {
        if (m.texto() == null || m.texto().isBlank() || m.remitenteId() == null) return false;
        String texto = normalizar(m.texto());
        boolean baja = PALABRAS_BAJA.contains(texto);
        if (!baja && !PALABRA_ACTIVAR.equals(texto)) return false;

        Long empresaId = cuenta.getEmpresaId();
        String canal = cuenta.getTipo().name();
        try {
            if (baja) {
                bajas.registrar(empresaId, canal, m.remitenteId());
                envio.enviar(cuenta, m.remitenteId(), TextosFijos.baja(idiomaDe(cuenta, m), nombreNegocio(empresaId)));
                log.info("[agente-baja] contacto dado de baja ({})", m);
                return true;
            }
            if (!bajas.quitar(empresaId, canal, m.remitenteId())) return false; // no estaba de baja: mensaje normal
            envio.enviar(cuenta, m.remitenteId(), TextosFijos.activar(idiomaDe(cuenta, m), nombreNegocio(empresaId)));
            log.info("[agente-baja] contacto reactivado ({})", m);
            return true;
        } catch (RuntimeException e) {
            // Sin mensaje: puede traer datos. Si la baja falló, el mensaje sigue su camino y no se pierde.
            log.warn("[agente-baja] no se pudo procesar la baja: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    /** Idioma del mensaje; "STOP" o "ACTIVAR" solos no dicen nada, así que se mira el historial del contacto. */
    private Idioma idiomaDe(CanalCuenta cuenta, MensajeEntrante m) {
        Idioma d = Idioma.deTexto(m.texto());
        return d != null ? d : idiomas.deContacto(cuenta.getId(), m.remitenteId());
    }

    /** Minúsculas, sin tildes, sin signos y con espacios simples. */
    public static String normalizar(String texto) {
        String sinTildes = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return sinTildes.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    private String nombreNegocio(Long empresaId) {
        if (empresaId == null) return "HotClick";
        Empresa e = empresas.findById(empresaId).orElse(null);
        if (e == null) return "este negocio";
        String comercial = e.getNombreComercial();
        return comercial != null && !comercial.isBlank() ? comercial : e.getNombreEmpresa();
    }

    static String textoBaja(String negocio) {
        return TextosFijos.baja(Idioma.ES, negocio);
    }

    static String textoActivar(String negocio) {
        return TextosFijos.activar(Idioma.ES, negocio);
    }
}
