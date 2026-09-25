package com.hotclick.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

/**
 * Verificación anti-bot para los formularios públicos ({@code permitAll}).
 *
 * <p>Reusa {@link TurnstileService} tal cual: si la clave secreta no está configurada
 * (modo dev) o si Cloudflare falla, {@code verify()} devuelve {@code true} — el
 * fail-open es una decisión deliberada del proyecto y acá no se altera.
 *
 * <p>Existe para que los formularios públicos compartan un solo mensaje de rechazo y
 * una sola forma de resolver la IP del cliente, igual que hacen
 * {@code AuthCredentialLoginHandler} y {@code AuthRegistroEmpresaHandler} con el login
 * y el registro de empresa.
 *
 * <p><b>Llamar siempre fuera de una transacción.</b> {@code verify()} hace una llamada
 * HTTP a Cloudflare de hasta 8 s; dentro de un {@code @Transactional} retendría una
 * conexión del pool de PgBouncer todo ese tiempo.
 */
@Service
public class TurnstileFormGuard {

    /** Mismo texto que usan el login y el registro de empresa. */
    public static final String MSG_ANTI_BOT = "Verificación anti-bot fallida. Intentá de nuevo.";

    private final TurnstileService turnstileService;
    private final SecurityAuditService securityAuditService;

    public TurnstileFormGuard(TurnstileService turnstileService,
                              SecurityAuditService securityAuditService) {
        this.turnstileService = turnstileService;
        this.securityAuditService = securityAuditService;
    }

    /**
     * @param turnstileToken token enviado por el widget del frontend.
     * @param httpRequest    petición en curso, para resolver la IP del cliente.
     * @return true si el token es válido o si Turnstile no está configurado.
     */
    public boolean verificado(String turnstileToken, HttpServletRequest httpRequest) {
        return turnstileService.verify(turnstileToken, securityAuditService.getIp(httpRequest));
    }
}
