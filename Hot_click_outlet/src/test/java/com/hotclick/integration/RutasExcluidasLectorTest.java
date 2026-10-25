package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El interceptor LECTOR excluye prefijos sin negocio (WebMvcConfig). Si aparece una escritura nueva bajo
 * esos prefijos, puede ser de vendedor y quedaría fuera del deny por defecto: revisarla y, si es de
 * comprador/pública, sumarla aquí.
 */
@DisplayName("Escrituras bajo prefijos excluidos del interceptor LECTOR: allowlist explícita")
class RutasExcluidasLectorTest extends BaseIntegrationTest {

    private static final List<String> PREFIJOS = List.of(
        "/api/payments/", "/api/sinpe/", "/api/public/", "/api/tienda/", "/api/webhooks/", "/api/auth/");
    private static final Set<RequestMethod> LECTURAS = EnumSet.of(RequestMethod.GET, RequestMethod.HEAD, RequestMethod.OPTIONS);

    static final Set<String> PERMITIDAS = Set.of(
        // Revisadas 2026-10-25: auth/cuenta propia, comprador, público, webhooks; /api/sinpe/admin/** exige ADMIN.
        "DELETE /api/public/shopping-assistant/session/{sesionId}",
        "POST /api/auth/2fa/activate",
        "POST /api/auth/2fa/disable",
        "POST /api/auth/2fa/email/activate",
        "POST /api/auth/2fa/email/disable",
        "POST /api/auth/2fa/email/enable",
        "POST /api/auth/2fa/email/send",
        "POST /api/auth/2fa/recovery-codes/regenerate",
        "POST /api/auth/2fa/setup",
        "POST /api/auth/2fa/verify",
        "POST /api/auth/cambiar-negocio",
        "POST /api/auth/change-password",
        "POST /api/auth/clerk-sync",
        "POST /api/auth/forgot-password",
        "POST /api/auth/login",
        "POST /api/auth/logout",
        "POST /api/auth/nuevo-negocio",
        "POST /api/auth/reenviar-codigo-negocio",
        "POST /api/auth/refresh",
        "POST /api/auth/register",
        "POST /api/auth/registro-empresa",
        "POST /api/auth/reset-password",
        "POST /api/auth/seleccionar-empresa",
        "POST /api/auth/send-verification",
        "POST /api/auth/upgrade-emprendedor",
        "POST /api/auth/verificar-correo-negocio",
        "POST /api/auth/verify-code",
        "POST /api/auth/verify-registration",
        "POST /api/auth/webauthn/login/finish",
        "POST /api/auth/webauthn/login/start",
        "POST /api/auth/webauthn/register/finish",
        "POST /api/auth/webauthn/register/start",
        "POST /api/payments/cancel/{numeroPedido}",
        "POST /api/payments/checkout",
        "POST /api/payments/guest-checkout",
        "POST /api/payments/guest/cancel/{numeroPedido}",
        "POST /api/payments/tilopay/confirmar/{numeroPedido}",
        "POST /api/payments/tilopay/reintentar/{numeroPedido}",
        "POST /api/public/chat",
        "POST /api/public/embudo",
        "POST /api/public/encargos",
        "POST /api/public/encargos/imagenes",
        "POST /api/public/encargos/{token}/checkout",
        "POST /api/public/shopping-assistant/chat",
        "POST /api/public/shopping-assistant/feedback",
        "POST /api/public/shopping-assistant/search-by-image",
        "POST /api/public/solicitud-especial",
        "POST /api/public/tienda-rapida/{token}",
        "POST /api/sinpe/admin/comprobantes/{id}/aprobar",
        "POST /api/sinpe/admin/comprobantes/{id}/rechazar",
        "POST /api/sinpe/checkout",
        "POST /api/sinpe/guest-checkout",
        "POST /api/sinpe/guest/{numeroPedido}/comprobante",
        "POST /api/sinpe/{numeroPedido}/comprobante",
        "POST /api/tienda/{slug}/pedidos",
        "POST /api/webhooks/onvo",
        "POST /api/webhooks/payxpert",
        "POST /api/webhooks/sentry",
        "POST /api/webhooks/stripe",
        "POST /api/webhooks/telegram",
        "POST /api/webhooks/tilopay",
        "POST /api/webhooks/uptime"
    );

    @Autowired @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping mapping;

    @Test
    void sinEscriturasNuevasBajoPrefijosExcluidos() {
        Set<String> encontradas = new TreeSet<>();
        for (Map.Entry<RequestMappingInfo, ?> e : mapping.getHandlerMethods().entrySet()) {
            RequestMappingInfo info = e.getKey();
            Set<RequestMethod> metodos = info.getMethodsCondition().getMethods();
            Set<RequestMethod> escrituras = metodos.isEmpty() ? EnumSet.of(RequestMethod.POST) : EnumSet.copyOf(metodos);
            escrituras.removeAll(LECTURAS);
            for (String ruta : info.getPatternValues()) {
                if (PREFIJOS.stream().noneMatch(ruta::startsWith)) continue;
                for (RequestMethod m : escrituras) encontradas.add(m + " " + ruta);
            }
        }
        System.out.println("RUTAS-EXCLUIDAS " + encontradas);
        Set<String> nuevas = new TreeSet<>(encontradas);
        nuevas.removeAll(PERMITIDAS);
        assertThat(nuevas).as("escrituras nuevas bajo prefijos excluidos del interceptor LECTOR").isEmpty();
    }
}
