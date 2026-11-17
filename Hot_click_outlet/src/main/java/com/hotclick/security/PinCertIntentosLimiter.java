package com.hotclick.security;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Tope de fuerza bruta del PIN del .p12 (PUT /api/empresa/perfil/pin-cert). FAIL-CLOSED y sobre
 * hot_click_rate_limit_tb (compartida entre instancias).
 *
 * Tres ejes: empresa, usuario e IP. Si CUALQUIER eje está bloqueado o supera el tope, el intento se niega (429).
 * El cupo se RESERVA de forma atómica ANTES de probar el PIN ({@link #reservarIntento}): 5 intentos en 15 min por
 * eje; del 6.º en adelante, 429 sin abrir el .p12. El bloqueo crece 15, 30, 60, 120... min (tope 24 h) mientras las
 * reincidencias caigan dentro de 24 h. Un PIN correcto devuelve los cupos de los tres ejes. Si la BD no responde,
 * los métodos LANZAN y el controller niega el intento (503). Nunca recibe ni registra el PIN.
 */
@Service
public class PinCertIntentosLimiter {

    public static final int MAX_FALLOS = 5;
    public static final int VENTANA_SEG = 15 * 60;
    static final int BLOQUEO_BASE_SEG = 15 * 60;
    static final int BLOQUEO_MAX_SEG = 24 * 60 * 60;
    static final int VENTANA_REINCIDENCIA_SEG = 24 * 60 * 60;

    private final RateLimiter rateLimiter;

    public PinCertIntentosLimiter(RateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
    }

    private static List<String> ejes(Long empresaId, Long usuarioId, String ip) {
        return List.of("emp:" + empresaId, "usr:" + usuarioId, "ip:" + IpParaLlave.clave(ip));
    }

    /** Segundos de bloqueo vigente (máximo entre ejes); 0 si puede intentar. Lanza si la BD falla (fail-closed). */
    public long segundosBloqueado(Long empresaId, Long usuarioId, String ip) {
        long max = 0;
        for (String eje : ejes(empresaId, usuarioId, ip)) {
            max = Math.max(max, rateLimiter.segundosRestantesEstricto("pincert:lock:" + eje));
        }
        return max;
    }

    /**
     * RESERVA atómica de un intento, ANTES de abrir el .p12 o probar el PIN. Por cada eje hace UN solo
     * {@code INSERT … ON CONFLICT DO UPDATE … RETURNING count} (RateLimiter.registrarEstricto): la BD serializa
     * los pedidos concurrentes y cada uno recibe un número de intento distinto. Solo los intentos 1..5 de TODOS
     * los ejes pueden continuar; el 6.º en adelante de cualquier eje se niega. El cupo se consume al reservar
     * (acierte o falle el PIN, o ni siquiera tenga formato válido); un PIN correcto lo devuelve con
     * {@link #liberarReserva}. Nada se cuenta después de probar el PIN: no hay ventana entre "revisar" y "contar".
     *
     * Escalada: solo el pedido que recibe EXACTAMENTE el 6.º número de un eje (único por atomicidad) escribe el
     * bloqueo y suma la reincidencia, así 20 pedidos simultáneos no inflan el castigo.
     *
     * @return 0 si el intento puede continuar; si no, segundos de bloqueo (Retry-After). Lanza si la BD falla
     *         (fail-closed: el controller responde 503 sin probar el PIN).
     */
    public long reservarIntento(Long empresaId, Long usuarioId, String ip) {
        long vigente = segundosBloqueado(empresaId, usuarioId, ip);
        if (vigente > 0) return vigente;
        boolean excedido = false;
        // Se reserva en los tres ejes sin cortocircuito: el conteo de cada eje es independiente y atómico.
        for (String eje : ejes(empresaId, usuarioId, ip)) {
            int n = rateLimiter.registrarEstricto("pincert:fail:" + eje, VENTANA_SEG);
            if (n > MAX_FALLOS) {
                excedido = true;
                if (n == MAX_FALLOS + 1) bloquear(eje);
            }
        }
        if (!excedido) return 0;
        long seg = segundosBloqueado(empresaId, usuarioId, ip);
        return seg > 0 ? seg : VENTANA_SEG;
    }

    private void bloquear(String eje) {
        int reincidencias = rateLimiter.registrarEstricto("pincert:strike:" + eje, VENTANA_REINCIDENCIA_SEG);
        long bloqueo = BLOQUEO_BASE_SEG;
        for (int i = 1; i < reincidencias && bloqueo < BLOQUEO_MAX_SEG; i++) bloqueo *= 2;
        bloqueo = Math.min(bloqueo, BLOQUEO_MAX_SEG);
        rateLimiter.liberarEstricto("pincert:lock:" + eje);
        rateLimiter.registrarEstricto("pincert:lock:" + eje, (int) bloqueo);
    }

    /**
     * PIN correcto: devuelve los cupos reservados (los intentos fallidos viejos no deben bloquear al dueño).
     * Variante ESTRICTA: si el DELETE falla LANZA y el cupo queda consumido (seguro: nunca se abre una brecha;
     * el peor caso es que el dueño agote su tope antes). El controller lo trata como no fatal: el PIN ya se guardó.
     */
    public void liberarReserva(Long empresaId, Long usuarioId, String ip) {
        for (String eje : ejes(empresaId, usuarioId, ip)) {
            rateLimiter.liberarEstricto("pincert:fail:" + eje);
        }
    }
}
