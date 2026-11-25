package com.hotclick.agente.interno;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * PIN del modo interno (finanzas y acciones). Se guarda solo con hash (el PasswordEncoder del repo, BCrypt), se
 * compara con el encoder (tiempo constante; si no hay PIN se compara contra un hash de relleno para no delatarlo
 * por tiempo), bloquea tras 5 fallos (creciente: 15 min, 1 h y 24 h; avisa al dueño en los largos) y abre una sesión de 15 min al acertar. El PIN nunca se loguea ni se
 * guarda en el historial.
 */
@Service
public class PinInternoService {

    public static final int MAX_FALLOS = 5;
    /** Bloqueo creciente (AG-14 H-05): 15 min, 1 h y 24 h desde el tercer bloqueo seguido sin un acierto en medio. */
    public static final Duration BLOQUEO = Duration.ofMinutes(15);
    public static final Duration BLOQUEO_LARGO = Duration.ofHours(1);
    public static final Duration BLOQUEO_MAXIMO = Duration.ofHours(24);
    public static final Duration SESION = Duration.ofMinutes(15);

    public enum Resultado { OK, INCORRECTO, BLOQUEADO, SIN_PIN }

    public record Verificacion(Resultado resultado, int intentosRestantes) {}

    private final AgenteVinculacionRepository repo;
    private final VinculacionInternaService vinculaciones;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final String hashRelleno;
    private final AvisoBloqueoPin aviso;

    @org.springframework.beans.factory.annotation.Autowired
    public PinInternoService(AgenteVinculacionRepository repo, VinculacionInternaService vinculaciones,
                             PasswordEncoder encoder, AvisoBloqueoPin aviso) {
        this(repo, vinculaciones, encoder, Clock.systemUTC(), aviso);
    }

    PinInternoService(AgenteVinculacionRepository repo, VinculacionInternaService vinculaciones,
                      PasswordEncoder encoder, Clock clock) {
        this(repo, vinculaciones, encoder, clock, (empresaId, duracion) -> { });
    }

    PinInternoService(AgenteVinculacionRepository repo, VinculacionInternaService vinculaciones,
                      PasswordEncoder encoder, Clock clock, AvisoBloqueoPin aviso) {
        this.repo = repo;
        this.vinculaciones = vinculaciones;
        this.encoder = encoder;
        this.clock = clock;
        this.aviso = aviso;
        this.hashRelleno = encoder.encode("relleno-0000");
    }

    public static boolean formatoValido(String pin) {
        return PinPolitica.formatoValido(pin);
    }

    /** Define o cambia el PIN del usuario (miembro del negocio). IllegalArgumentException si no cumple. */
    @Transactional
    public void definir(Long usuarioId, Long empresaId, String pin) {
        if (!formatoValido(pin)) throw new IllegalArgumentException("El PIN debe tener de 4 a 6 dígitos");
        if (PinPolitica.demasiadoDebil(pin)) throw new IllegalArgumentException("El PIN es demasiado fácil de adivinar");
        vinculaciones.exigirMiembro(usuarioId, empresaId);
        AgenteVinculacion v = repo.findByUsuarioIdAndEmpresaIdAndCanal(usuarioId, empresaId, AgenteVinculacion.CANAL_WHATSAPP)
            .orElseGet(() -> {
                AgenteVinculacion n = new AgenteVinculacion();
                n.setUsuarioId(usuarioId);
                n.setEmpresaId(empresaId);
                n.setFechaCreacion(clock.instant());
                return n;
            });
        v.setPinHash(encoder.encode(pin));
        v.setPinIntentosFallidos(0);
        v.setPinBloqueosSeguidos(0);
        v.setPinBloqueadoHasta(null);
        v.setPinSesionHasta(null);
        repo.save(v);
    }

    static Duration duracionBloqueo(int bloqueosSeguidos) {
        if (bloqueosSeguidos <= 1) return BLOQUEO;
        return bloqueosSeguidos == 2 ? BLOQUEO_LARGO : BLOQUEO_MAXIMO;
    }

    /** Valida el PIN contra la vinculación (fila bloqueada para contar los intentos sin carreras). */
    @Transactional
    public Verificacion verificar(Long vinculacionId, String pin) {
        AgenteVinculacion v = repo.findByIdParaActualizar(vinculacionId).orElse(null);
        if (v == null) return new Verificacion(Resultado.SIN_PIN, 0);
        Instant ahora = clock.instant();
        if (v.getPinBloqueadoHasta() != null && ahora.isBefore(v.getPinBloqueadoHasta()))
            return new Verificacion(Resultado.BLOQUEADO, 0);
        if (v.getPinHash() == null) {
            encoder.matches(pin == null ? "" : pin, hashRelleno); // tiempo parejo
            return new Verificacion(Resultado.SIN_PIN, 0);
        }
        boolean ok = pin != null && encoder.matches(pin, v.getPinHash());
        if (ok) {
            v.setPinIntentosFallidos(0);
            v.setPinBloqueosSeguidos(0);
            v.setPinBloqueadoHasta(null);
            v.setPinSesionHasta(ahora.plus(SESION));
            repo.save(v);
            return new Verificacion(Resultado.OK, MAX_FALLOS);
        }
        int fallos = v.getPinIntentosFallidos() + 1;
        if (fallos >= MAX_FALLOS) {
            int bloqueos = v.getPinBloqueosSeguidos() + 1;
            Duration duracion = duracionBloqueo(bloqueos);
            v.setPinIntentosFallidos(0);
            v.setPinBloqueosSeguidos(bloqueos);
            v.setPinBloqueadoHasta(ahora.plus(duracion));
            v.setPinSesionHasta(null);
            repo.save(v);
            if (duracion.compareTo(BLOQUEO) > 0) aviso.bloqueoLargo(v.getEmpresaId(), duracion);
            return new Verificacion(Resultado.BLOQUEADO, 0);
        }
        v.setPinIntentosFallidos(fallos);
        repo.save(v);
        return new Verificacion(Resultado.INCORRECTO, MAX_FALLOS - fallos);
    }
}
