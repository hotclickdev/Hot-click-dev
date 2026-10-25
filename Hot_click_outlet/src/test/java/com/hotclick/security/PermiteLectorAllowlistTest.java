package com.hotclick.security;

import com.hotclick.integration.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.util.ClassUtils;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lista congelada de handlers que abren escritura a LECTOR/CAJERO vía {@link PermiteLector}. Se recorre el
 * RequestMappingHandlerMapping real con el mismo criterio del interceptor. Si aparece (o desaparece) uno,
 * este test falla: agregarlo acá exige revisión de seguridad (acción personal, no de negocio).
 */
@DisplayName("@PermiteLector: lista blanca congelada de handlers")
class PermiteLectorAllowlistTest extends BaseIntegrationTest {

    private static final Set<String> CONGELADA = Set.of(
        "CarritoAbandonadoController#eliminarPorToken [DELETE] [/api/cart/abandoned/recover/{token}]",
        "CarritoAbandonadoController#guardar [POST] [/api/cart/abandoned]",
        "ContactoController#enviarMensaje [POST] [/api/contacto]",
        "PremioController#girar [POST] [/api/ruleta/girar/{giroId}/usuario/{usuarioId}]",
        "ReporteProductoController#crear [POST] [/api/reportes-producto]",
        "SolicitudGarantiaController#crear [POST] [/api/garantias/solicitudes]",
        "TelegramConfigController#desvincular [DELETE] [/api/telegram/vincular]",
        "TelegramConfigController#generarCodigo [POST] [/api/telegram/vincular]",
        "TestimonioController#crearResena [POST] [/api/testimonios/resena]",
        "TestimonioController#crearTestimonio [POST] [/api/testimonios/testimonio]",
        "TestimonioController#subirImagen [POST] [/api/testimonios/imagen]",
        "TicketSoporteController#crear [POST] [/api/soporte/tickets]",
        "TicketSoporteController#subirFoto [POST] [/api/soporte/tickets/fotos]",
        "UsuarioController#actualizarUsuario [PUT] [/api/usuarios/{id}]"
    );

    @Autowired @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping mapping;

    @Test
    void soloLosHandlersRevisadosLlevanPermiteLector() {
        Set<String> actuales = new TreeSet<>();
        mapping.getHandlerMethods().forEach((info, hm) -> {
            if (LectorSoloLecturaInterceptor.permiteLector(hm)) {
                actuales.add(ClassUtils.getUserClass(hm.getBeanType()).getSimpleName() + "#" + hm.getMethod().getName()
                    + " " + info.getMethodsCondition().getMethods() + " " + info.getPatternValues());
            }
        });
        assertThat(actuales).as("handlers @PermiteLector (actualizar CONGELADA solo con revisión de seguridad)")
            .containsExactlyInAnyOrderElementsOf(CONGELADA);
    }
}
