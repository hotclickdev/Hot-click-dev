package com.hotclick.security;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Tope de fuerza bruta del PIN del .p12 (PUT /api/empresa/perfil/pin-cert). FAIL-CLOSED y sobre
 * hot_click_rate_limit_tb (compartida entre instancias).
 *
 * Tres ejes: empresa, usuario e IP. Si CUALQUIER eje está bloqueado, el intento se niega (429).
 * 5 fallos (PIN que no abre el .p12) en 15 min bloquean ese eje; el bloqueo crece 15, 30, 60, 120... min
 * (tope 24 h) mientras las reincidencias caigan dentro de 24 h. Un PIN correcto libera los buckets de fallos
 * de los tres ejes (no el castigo previo ya vencido). Si la BD no responde, los métodos LANZAN y el
 * controller niega el intento. Nunca recibe ni registra el PIN.
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

    /** Cuenta un PIN que no abrió el .p12 en cada eje y bloquea el eje que llegue al tope. */
    public void registrarFallo(Long empresaId, Long usuarioId, String ip) {
        for (String eje : ejes(empresaId, usuarioId, ip)) {
            int fallos = rateLimiter.registrarEstricto("pincert:fail:" + eje, VENTANA_SEG);
            if (fallos >= MAX_FALLOS) {
                int reincidencias = rateLimiter.registrarEstricto("pincert:strike:" + eje, VENTANA_REINCIDENCIA_SEG);
                long bloqueo = BLOQUEO_BASE_SEG;
                for (int i = 1; i < reincidencias && bloqueo < BLOQUEO_MAX_SEG; i++) bloqueo *= 2;
                bloqueo = Math.min(bloqueo, BLOQUEO_MAX_SEG);
                rateLimiter.liberar("pincert:lock:" + eje);
                rateLimiter.registrarEstricto("pincert:lock:" + eje, (int) bloqueo);
                rateLimiter.liberar("pincert:fail:" + eje);
            }
        }
    }

    /** PIN correcto: los fallos viejos no deben bloquear al dueño. */
    public void registrarExito(Long empresaId, Long usuarioId, String ip) {
        for (String eje : ejes(empresaId, usuarioId, ip)) {
            rateLimiter.liberar("pincert:fail:" + eje);
        }
    }
}
