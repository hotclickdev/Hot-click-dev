package com.hotclick.service.sinpe;

import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;

@Service
public class SinpeComprobanteService {

    private static final Logger log = LoggerFactory.getLogger(SinpeComprobanteService.class);

    @Autowired private PedidoRepository              pedidoRepository;
    @Autowired private PagoRepository                pagoRepository;
    @Autowired private ComprobanteSinpeRepository    comprobanteRepository;
    @Autowired private SupabaseStorageService         storageService;
    @Autowired private NotificacionEmailService       notificacionEmailService;
    @Autowired private PaymentService                paymentService;
    @Autowired private SinpeAuditSupport             auditSupport;

    @Transactional
    public void subirComprobante(String numeroPedido, MultipartFile archivo,
                          String nombreRemitente, String cedulaRemitente,
                          String telefonoRemitente, String correoUsuario) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + numeroPedido));

        if (!pedido.getUsuarioFinal().getCorreo().equals(correoUsuario)) {
            throw new SecurityException("No tienes permiso para modificar este pedido");
        }

        if (!Constants.PEDIDO_PENDIENTE_COMPROBANTE.equals(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido no está esperando un comprobante (estado: " + pedido.getEstadoPedido() + ")");
        }

        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("Debes adjuntar el comprobante de pago");
        }
        if (nombreRemitente == null || nombreRemitente.isBlank()) {
            throw new IllegalArgumentException("El nombre del remitente es requerido");
        }

        String url;
        try {
            url = storageService.subirImagen(archivo, "comprobantes-sinpe");
        } catch (IOException e) {
            throw new IntegracionExternaException("storage", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al subir el comprobante: " + e.getMessage(), e);
        }

        ComprobanteSinpe comprobante = new ComprobanteSinpe();
        comprobante.setPedido(pedido);
        comprobante.setUrlComprobante(url);
        comprobante.setNombreRemitente(nombreRemitente.trim());
        comprobante.setCedulaRemitente(cedulaRemitente != null ? cedulaRemitente.trim() : null);
        comprobante.setTelefonoRemitente(telefonoRemitente != null ? telefonoRemitente.trim() : null);
        comprobante.setCorreoRemitente(correoUsuario);
        comprobante.setEstado(Constants.COMPROBANTE_PENDIENTE);
        comprobante.setFechaSubida(LocalDateTime.now(Constants.ZONA_CR));
        comprobanteRepository.save(comprobante);

        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE_APROBACION);
        pedidoRepository.save(pedido);

        log.info("Comprobante SINPE subido: pedido={} remitente={} cedula={}", numeroPedido, nombreRemitente, cedulaRemitente);
    }

    @Transactional
    public void aprobar(Long comprobanteId, String adminEmail, Long adminId) {
        ComprobanteSinpe comprobante = comprobanteRepository.findById(comprobanteId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Comprobante", comprobanteId));

        if (!Constants.COMPROBANTE_PENDIENTE.equals(comprobante.getEstado())) {
            throw new IllegalStateException("El comprobante ya fue procesado: " + comprobante.getEstado());
        }

        Pedido pedido = comprobante.getPedido();
        if (!Constants.PEDIDO_PENDIENTE_APROBACION.equals(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido no está en estado PENDIENTE_APROBACION");
        }

        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pago SINPE no encontrado para pedido: " + pedido.getNumeroPedido()));

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        comprobante.setEstado(Constants.COMPROBANTE_APROBADO);
        comprobante.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        comprobante.setAdminId(adminId);
        comprobante.setAdminEmail(adminEmail);
        comprobanteRepository.save(comprobante);

        paymentService.confirmarPedido(pago);

        auditSupport.registrarAuditoria(adminId, adminEmail,
            Constants.AUDITORIA_APROBAR_SINPE, "COMPROBANTE_SINPE", comprobanteId,
            "Pedido " + pedido.getNumeroPedido() + " aprobado");

        log.info("Comprobante SINPE aprobado por {}: pedido={}", adminEmail, pedido.getNumeroPedido());
    }

    @Transactional
    public void rechazar(Long comprobanteId, String motivo, String adminEmail, Long adminId) {
        ComprobanteSinpe comprobante = comprobanteRepository.findById(comprobanteId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Comprobante", comprobanteId));

        if (!Constants.COMPROBANTE_PENDIENTE.equals(comprobante.getEstado())) {
            throw new IllegalStateException("El comprobante ya fue procesado: " + comprobante.getEstado());
        }

        Pedido pedido = comprobante.getPedido();

        comprobante.setEstado(Constants.COMPROBANTE_RECHAZADO);
        comprobante.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        comprobante.setNotasAdmin(motivo);
        comprobante.setAdminId(adminId);
        comprobante.setAdminEmail(adminEmail);
        comprobanteRepository.save(comprobante);

        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId()).orElse(null);
        if (pago != null) {
            pago.setEstadoPago(Constants.PAGO_CANCELADO);
            pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
            pagoRepository.save(pago);
        }

        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        pedidoRepository.save(pedido);

        paymentService.liberarReservas(pedido);
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        notificacionEmailService.enviarPagoFallido(pedido,
            "Comprobante SINPE rechazado" + (motivo != null ? ": " + motivo : ""));

        auditSupport.registrarAuditoria(adminId, adminEmail,
            Constants.AUDITORIA_RECHAZAR_SINPE, "COMPROBANTE_SINPE", comprobanteId,
            "Pedido " + pedido.getNumeroPedido() + " rechazado. Motivo: " + motivo);

        log.info("Comprobante SINPE rechazado por {}: pedido={}", adminEmail, pedido.getNumeroPedido());
    }

    @Transactional(readOnly = true)
    public Page<ComprobanteSinpe> listar(String estado, Pageable pageable) {
        return comprobanteRepository.buscarPorEstado(estado, pageable);
    }
}
