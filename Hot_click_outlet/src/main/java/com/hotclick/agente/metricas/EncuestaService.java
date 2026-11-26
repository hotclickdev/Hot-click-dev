package com.hotclick.agente.metricas;

import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.canal.FilaLista;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.conversacion.EstadoConversacion;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.pago.EnvioConversacion;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * AG-38: encuesta corta de satisfacción al cerrar una conversación desde la bandeja. Se manda una lista de WhatsApp
 * con las notas 1 a 5 (más de 3 opciones: {@code enviarLista}); cada fila lleva el id {@code encuesta:<sesion>:<nota>}.
 * La respuesta llega como {@code botonId} y solo se guarda la nota: el texto que escribe o elige la persona nunca se
 * almacena. Reglas del envío: solo WhatsApp (Instagram y Messenger no tienen lista), dentro de la ventana de 24 h, sin
 * baja (STOP) y una sola vez por conversación (UPDATE condicional). No hay cierre por inactividad en el sistema; si se
 * agrega, debe llamar a {@link #enviarAlCerrar}. Sin transacción envolvente: Meta se llama fuera de toda transacción.
 */
@Service
public class EncuestaService {

    private static final Logger log = LoggerFactory.getLogger(EncuestaService.class);

    static final String PREFIJO = "encuesta:";
    /** Notas que cuentan como «baja» para la vista de revisión. */
    public static final int NOTA_BAJA_MAX = 2;

    public enum Resultado { ENVIADA, YA_ENVIADA, NO_APLICA, FUERA_DE_VENTANA, EN_BAJA, ERROR }

    /** Respuesta ya interpretada de un id de fila. */
    record Respuesta(UUID sesionId, int nota) { }

    private final ConversacionSesionRepository sesiones;
    private final CanalCuentaRepository cuentas;
    private final CanalMensajeria canal;
    private final ObjectProvider<ListaBajasAgente> bajas;
    private final IdiomaConversacion idiomas;
    private final Clock reloj;

    @Autowired
    public EncuestaService(ConversacionSesionRepository sesiones, CanalCuentaRepository cuentas, CanalMensajeria canal,
                           ObjectProvider<ListaBajasAgente> bajas, IdiomaConversacion idiomas) {
        this(sesiones, cuentas, canal, bajas, idiomas, Clock.systemUTC());
    }

    EncuestaService(ConversacionSesionRepository sesiones, CanalCuentaRepository cuentas, CanalMensajeria canal,
                    ObjectProvider<ListaBajasAgente> bajas, IdiomaConversacion idiomas, Clock reloj) {
        this.idiomas = idiomas;
        this.sesiones = sesiones;
        this.cuentas = cuentas;
        this.canal = canal;
        this.bajas = bajas;
        this.reloj = reloj;
    }

    /**
     * Manda la encuesta de una conversación recién cerrada. Nunca lanza: un fallo de Meta no afecta el cierre.
     *
     * @param scope empresa del llamador (null = ADMIN, solo conversaciones de HotClick)
     */
    public Resultado enviarAlCerrar(UUID sesionId, Long scope) {
        ConversacionSesion s = sesionId == null ? null : sesiones.findById(sesionId).orElse(null);
        if (s == null || !Objects.equals(scope, s.getEmpresaId()) || s.getEstado() != EstadoConversacion.CERRADA
                || s.getPerfil() == PerfilConversacion.NEGOCIO_INTERNO || s.getContactoExterno() == null
                || s.getCanalCuentaId() == null) {
            return Resultado.NO_APLICA;
        }
        CanalCuenta cuenta = cuentas.findById(s.getCanalCuentaId()).orElse(null);
        if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA
                || cuenta.getTipo() != MensajeEntrante.Canal.WHATSAPP
                || !Objects.equals(cuenta.getEmpresaId(), s.getEmpresaId())) {
            return Resultado.NO_APLICA;
        }
        Instant ahora = reloj.instant();
        if (!EnvioConversacion.dentroDeVentana(s, ahora)) return Resultado.FUERA_DE_VENTANA;
        if (estaDeBaja(s)) return Resultado.EN_BAJA;
        if (sesiones.reclamarEncuesta(s.getId(), ahora) != 1) return Resultado.YA_ENVIADA;
        try {
            Idioma idioma = idiomas.deSesion(s.getId());
            canal.enviarLista(cuenta, s.getContactoExterno(), TextosFijos.encuestaPregunta(idioma),
                TextosFijos.encuestaBoton(idioma), filas(s.getId(), idioma), idioma);
        } catch (RuntimeException e) {
            sesiones.liberarEncuesta(s.getId());
            log.warn("[agente-encuesta] no se pudo enviar la encuesta: {}", e.getClass().getSimpleName());
            return Resultado.ERROR;
        }
        log.info("[agente-encuesta] encuesta enviada al cerrar la conversación {}", s.getId());
        return Resultado.ENVIADA;
    }

    /**
     * Procesa el id de fila que devolvió el webhook. Devuelve true si el id es de la encuesta (el mensaje queda
     * consumido: no se guarda ni llega al bot), aunque la respuesta no se pueda guardar. La nota solo se guarda si la
     * conversación es de esa cuenta y de ese contacto, está cerrada, se le mandó la encuesta y aún no respondió.
     */
    public boolean registrarRespuesta(CanalCuenta cuenta, String remitenteId, String botonId) {
        if (botonId == null || !botonId.startsWith(PREFIJO)) return false;
        Optional<Respuesta> r = parsear(botonId);
        if (r.isEmpty() || cuenta == null || remitenteId == null) return true;
        ConversacionSesion s = sesiones.findById(r.get().sesionId()).orElse(null);
        boolean propia = s != null && s.getEstado() == EstadoConversacion.CERRADA
            && Objects.equals(s.getCanalCuentaId(), cuenta.getId())
            && Objects.equals(s.getContactoExterno(), remitenteId);
        if (propia && sesiones.guardarNotaEncuesta(s.getId(), r.get().nota(), reloj.instant()) == 1) {
            agradecer(cuenta, remitenteId, r.get().nota(), idiomas.deSesion(s.getId()));
        }
        return true;
    }

    private void agradecer(CanalCuenta cuenta, String remitenteId, int nota, Idioma idioma) {
        try {
            canal.enviarTexto(cuenta, remitenteId, nota <= NOTA_BAJA_MAX
                ? TextosFijos.encuestaGraciasNotaBaja(idioma) : TextosFijos.encuestaGracias(idioma));
        } catch (RuntimeException e) {
            log.warn("[agente-encuesta] nota guardada pero no se pudo agradecer: {}", e.getClass().getSimpleName());
        }
    }

    private boolean estaDeBaja(ConversacionSesion s) {
        ListaBajasAgente.Contacto c = new ListaBajasAgente.Contacto(s.getEmpresaId(), s.getCanal(), s.getContactoExterno());
        return !bajas.getIfAvailable(() -> ListaBajasAgente.NINGUNA).dadosDeBaja(List.of(c)).isEmpty();
    }

    /** Las cinco notas (más de 3 opciones: va como lista). */
    static List<FilaLista> filas(UUID sesionId, Idioma idioma) {
        List<String> titulos = TextosFijos.encuestaTitulos(idioma);
        List<FilaLista> filas = new ArrayList<>();
        for (int nota = 1; nota <= titulos.size(); nota++) {
            filas.add(new FilaLista(idFila(sesionId, nota), titulos.get(nota - 1)));
        }
        return filas;
    }

    static String idFila(UUID sesionId, int nota) {
        return PREFIJO + sesionId + ":" + nota;
    }

    static Optional<Respuesta> parsear(String id) {
        if (id == null || !id.startsWith(PREFIJO)) return Optional.empty();
        String[] partes = id.substring(PREFIJO.length()).split(":");
        if (partes.length != 2) return Optional.empty();
        try {
            int nota = Integer.parseInt(partes[1]);
            if (nota < 1 || nota > 5) return Optional.empty();
            return Optional.of(new Respuesta(UUID.fromString(partes[0]), nota));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
