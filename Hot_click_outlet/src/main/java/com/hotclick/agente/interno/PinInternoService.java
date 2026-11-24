package com.hotclick.agente.interno;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.regex.Pattern;

/**
 * PIN del modo interno (finanzas y acciones). Se guarda solo con hash (el PasswordEncoder del repo, BCrypt), se
 * compara con el encoder (tiempo constante; si no hay PIN se compara contra un hash de relleno para no delatarlo
 * por tiempo), bloquea 15 min tras 5 fallos y abre una sesión de 15 min al acertar. El PIN nunca se loguea ni se
 * guarda en el historial.
 */
@Service
public class PinInternoService {

    public static final int MAX_FALLOS = 5;
    public static final Duration BLOQUEO = Duration.ofMinutes(15);
    public static final Duration SESION = Duration.ofMinutes(15);
    private static final Pattern FORMATO = Pattern.compile("^\\d{4,6}$");

    public enum Resultado { OK, INCORRECTO, BLOQUEADO, SIN_PIN }

    public record Verificacion(Resultado resultado, int intentosRestantes) {}

    private final AgenteVinculacionRepository repo;
    private final VinculacionInternaService vinculaciones;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final String hashRelleno;

    @org.springframework.beans.factory.annotation.Autowired
    public PinInternoService(AgenteVinculacionRepository repo, VinculacionInternaService vinculaciones,
                             PasswordEncoder encoder) {
        this(repo, vinculaciones, encoder, Clock.systemUTC());
    }

    PinInternoService(AgenteVinculacionRepository repo, VinculacionInternaService vinculaciones,
                      PasswordEncoder encoder, Clock clock) {
        this.repo = repo;
        this.vinculaciones = vinculaciones;
        this.encoder = encoder;
        this.clock = clock;
        this.hashRelleno = encoder.encode("relleno-0000");
    }

    public static boolean formatoValido(String pin) {
        return pin != null && FORMATO.matcher(pin).matches();
    }

    /** Rechaza PIN triviales: todos iguales o secuencias (1234, 4321). */
    static boolean demasiadoDebil(String pin) {
        boolean iguales = pin.chars().distinct().count() == 1;
        boolean asc = true, desc = true;
        for (int i = 1; i < pin.length(); i++) {
            if (pin.charAt(i) != pin.charAt(i - 1) + 1) asc = false;
            if (pin.charAt(i) != pin.charAt(i - 1) - 1) desc = false;
        }
        return iguales || asc || desc;
    }

    /** Define o cambia el PIN del usuario (miembro del negocio). IllegalArgumentException si no cumple. */
    @Transactional
    public void definir(Long usuarioId, Long empresaId, String pin) {
        if (!formatoValido(pin)) throw new IllegalArgumentException("El PIN debe tener de 4 a 6 dígitos");
        if (demasiadoDebil(pin)) throw new IllegalArgumentException("El PIN es demasiado fácil de adivinar");
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
        v.setPinBloqueadoHasta(null);
        v.setPinSesionHasta(null);
        repo.save(v);
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
            v.setPinBloqueadoHasta(null);
            v.setPinSesionHasta(ahora.plus(SESION));
            repo.save(v);
            return new Verificacion(Resultado.OK, MAX_FALLOS);
        }
        int fallos = v.getPinIntentosFallidos() + 1;
        if (fallos >= MAX_FALLOS) {
            v.setPinIntentosFallidos(0);
            v.setPinBloqueadoHasta(ahora.plus(BLOQUEO));
            v.setPinSesionHasta(null);
            repo.save(v);
            return new Verificacion(Resultado.BLOQUEADO, 0);
        }
        v.setPinIntentosFallidos(fallos);
        repo.save(v);
        return new Verificacion(Resultado.INCORRECTO, MAX_FALLOS - fallos);
    }
}
