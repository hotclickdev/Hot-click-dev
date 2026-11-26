package com.hotclick.agente.panel;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.ConfigMotorAgente;
import com.hotclick.agente.motor.TonoAgente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Configuración del bot por negocio (AG-19): tono, activo, horario y mensaje fuera de horario. Sin fila, el bot usa
 * el tono de las propiedades y no tiene horario. El llamador ya validó que la empresa es la del usuario.
 */
@Service
public class AgenteConfigService {

    private static final Logger log = LoggerFactory.getLogger(AgenteConfigService.class);

    static final int NOMBRE_MAX = 60;
    static final int MENSAJE_MAX = 500;
    private static final Pattern NOMBRE_OK = Pattern.compile("^[\\p{L}\\p{N} .,'&-]+$");

    private final AgenteConfigRepository repo;
    private final ConfigMotorAgente motor;
    private final ObjectMapper mapper;

    public AgenteConfigService(AgenteConfigRepository repo, ConfigMotorAgente motor, ObjectMapper mapper) {
        this.repo = repo;
        this.motor = motor;
        this.mapper = mapper;
    }

    /** Configuración vigente; con valores por defecto si el negocio nunca la guardó. Nunca null. */
    public AgenteConfigDto obtener(Long empresaId) {
        Optional<AgenteConfigRepository.Fila> fila = empresaId == null ? Optional.empty() : repo.buscar(empresaId);
        if (fila.isEmpty()) return porDefecto();
        AgenteConfigRepository.Fila f = fila.get();
        return new AgenteConfigDto(f.nombreBot(), f.trato(), f.emojis(), f.activo(), f.horarioActivo(),
            leerHorario(f.horarioJson()), f.mensajeFueraHorario(), AgenteConfigDto.ZONA);
    }

    public AgenteConfigDto guardar(Long empresaId, AgenteConfigDto.Pedido p) {
        if (p == null) throw new IllegalArgumentException("Faltan los datos de configuración");
        String nombre = p.nombreBot() == null ? "" : p.nombreBot().strip();
        if (nombre.isEmpty() || nombre.length() > NOMBRE_MAX || !NOMBRE_OK.matcher(nombre).matches())
            throw new IllegalArgumentException("El nombre del bot es obligatorio (máx. " + NOMBRE_MAX
                + " caracteres, solo letras, números y puntuación simple)");
        String trato = p.trato() == null ? "" : p.trato().strip().toUpperCase(Locale.ROOT);
        if (!"USTED".equals(trato) && !"TUTEO".equals(trato))
            throw new IllegalArgumentException("El trato debe ser USTED o TUTEO");
        String mensaje = p.mensajeFueraHorario() == null || p.mensajeFueraHorario().isBlank()
            ? null : p.mensajeFueraHorario().strip();
        if (mensaje != null && mensaje.length() > MENSAJE_MAX)
            throw new IllegalArgumentException("El mensaje fuera de horario admite hasta " + MENSAJE_MAX + " caracteres");
        List<HorarioAtencion.Dia> horario = p.horario() == null ? HorarioAtencion.porDefecto() : p.horario();
        HorarioAtencion.de(horario); // valida
        boolean horarioActivo = Boolean.TRUE.equals(p.horarioActivo());
        repo.guardar(empresaId, new AgenteConfigRepository.Fila(nombre, trato, Boolean.TRUE.equals(p.emojis()),
            p.activo() == null || p.activo(), horarioActivo, escribirHorario(horario), mensaje));
        return obtener(empresaId);
    }

    /** Tono de la empresa para el motor (o el de propiedades si no tiene configuración). */
    public TonoAgente tonoDe(AgenteConfigDto c) {
        return c == null ? motor.tono() : c.tono();
    }

    /** true si el negocio definió horario y el momento cae fuera de él. */
    public boolean fueraDeHorario(AgenteConfigDto c, Instant ahora) {
        if (c == null || !c.horarioActivo()) return false;
        try {
            return !HorarioAtencion.de(c.horario()).abiertoEn(ahora);
        } catch (IllegalArgumentException e) {
            return false; // horario ilegible: no se bloquea al cliente
        }
    }

    /** Texto que se envía cuando alguien pide una persona fuera de horario. */
    public String mensajeFueraHorario(AgenteConfigDto c) {
        if (c != null && c.mensajeFueraHorario() != null && !c.mensajeFueraHorario().isBlank()) return c.mensajeFueraHorario();
        return mensajePorDefecto(c == null ? motor.tono().trato() : c.tono().trato());
    }

    static String mensajePorDefecto(TonoAgente.Trato trato) {
        return trato == TonoAgente.Trato.TUTEO
            ? "Ahora estamos fuera de horario. Una persona del equipo te responde apenas abramos; mientras tanto, seguimos acá para ayudarte."
            : "Ahora estamos fuera de horario. Una persona del equipo le responde apenas abramos; mientras tanto, seguimos aquí para ayudarle.";
    }

    private AgenteConfigDto porDefecto() {
        TonoAgente t = motor.tono();
        return new AgenteConfigDto(t.nombreBot(), t.trato().name(), t.emojis(), true, false,
            HorarioAtencion.porDefecto(), mensajePorDefecto(t.trato()), AgenteConfigDto.ZONA);
    }

    private List<HorarioAtencion.Dia> leerHorario(String json) {
        if (json == null || json.isBlank()) return HorarioAtencion.porDefecto();
        try {
            return mapper.readValue(json, new TypeReference<List<HorarioAtencion.Dia>>() {});
        } catch (JsonProcessingException e) {
            log.warn("[agente-config] horario guardado ilegible ({})", e.getClass().getSimpleName());
            return HorarioAtencion.porDefecto();
        }
    }

    private String escribirHorario(List<HorarioAtencion.Dia> horario) {
        try {
            return mapper.writeValueAsString(horario);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Horario inválido");
        }
    }
}
