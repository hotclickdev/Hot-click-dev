package com.hotclick.service.pos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.StripeService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class PosQrVentaService {

    private static final Logger log = LoggerFactory.getLogger(PosQrVentaService.class);

    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired private StripeService         stripeService;
    @Autowired private PosQrSessionService   sessionService;
    @Autowired private PosQrVentaCompletionService completionService;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Transactional
    public String crearStripeCheckout(String token) {
        PosQrSesion sesion = sessionService.findSesionActiva(token);
        if (!"TARJETA".equals(sesion.getMetodoPago())) {
            throw new IllegalStateException("Esta sesión no es de pago con tarjeta");
        }

        String successUrl = appUrl + "/pos/pago/" + token + "?resultado=exito";
        String cancelUrl  = appUrl + "/pos/pago/" + token + "?resultado=cancelado";

        try {
            List<Map<String, Object>> items = sessionService.getMapper().readValue(
                sesion.getItemsJson(), new TypeReference<>() {});

            String checkoutUrl = stripeService.crearCheckoutPOS(
                sesion.getTotal(), items, successUrl, cancelUrl,
                sesion.getEmpresa().getId(), token);

            posQrRepo.save(sesion);
            return checkoutUrl;
        } catch (Exception e) {
            log.error("[POS-QR] Error creando Stripe checkout para token={}: {}", token, e.getMessage());
            throw new IntegracionExternaException("stripe", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al crear sesión de pago: " + e.getMessage(), e);
        }
    }

    @Transactional
    public String verificarEstado(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if ("PAGADO".equals(sesion.getEstado()) || "CANCELADO".equals(sesion.getEstado())) {
            return sesion.getEstado();
        }

        if (LocalDateTime.now(Constants.ZONA_CR).isAfter(sesion.getFechaExpiracion())) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            return "EXPIRADO";
        }

        if ("TARJETA".equals(sesion.getMetodoPago()) && sesion.getStripeSessionId() != null) {
            try {
                boolean pagado = stripeService.checkoutSessionPagada(sesion.getStripeSessionId());
                if (pagado) {
                    completionService.completarVentaTarjeta(sesion);
                    return "PAGADO";
                }
            } catch (Exception e) {
                log.warn("[POS-QR] Error verificando Stripe session {}: {}", sesion.getStripeSessionId(), e.getMessage());
            }
        }

        return sesion.getEstado();
    }

    @Transactional
    public PosQrSesion confirmarSinpe(String token, Long usuarioId, Long empresaId, String notas) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if (!"PENDIENTE".equals(sesion.getEstado())) {
            throw new IllegalStateException("La sesión no está pendiente (estado: " + sesion.getEstado() + ")");
        }
        if (!sesion.getEmpresa().getId().equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }

        completionService.completarVentaSinpe(sesion, usuarioId, notas);
        return sesion;
    }

    @Transactional
    protected void completarVentaTarjeta(PosQrSesion sesion) {
        completionService.completarVentaTarjeta(sesion);
    }

    @Transactional
    protected void completarVentaSinpe(PosQrSesion sesion, Long usuarioId, String notas) {
        completionService.completarVentaSinpe(sesion, usuarioId, notas);
    }
}
