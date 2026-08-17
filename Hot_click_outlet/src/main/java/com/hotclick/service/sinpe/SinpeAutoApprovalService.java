package com.hotclick.service.sinpe;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SinpeAutoApprovalService {

    private static final Logger log = LoggerFactory.getLogger(SinpeAutoApprovalService.class);

    @Autowired private ComprobanteSinpeRepository comprobanteRepository;
    @Autowired private EmpresaRepository          empresaRepository;
    @Autowired private PagoRepository             pagoRepository;
    @Autowired private PaymentService             paymentService;
    @Autowired private SinpeAuditSupport          auditSupport;

    @Transactional
    public void autoAprobarExpirados() {
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusDays(3);
        for (var empresa : empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")) {
            try {
                autoAprobarExpiradosDeEmpresa(empresa.getId(), corte);
            } catch (Exception e) {
                log.error("[sinpe-auto-aprobacion] Error empresa={}: {}", empresa.getId(), e.getMessage());
            }
        }
    }

    private void autoAprobarExpiradosDeEmpresa(Long empresaId, LocalDateTime corte) {
        List<ComprobanteSinpe> expirados = comprobanteRepository.findPendientesExpiradosByEmpresa(corte, empresaId);

        for (ComprobanteSinpe comprobante : expirados) {
            try {
                Pedido pedido = comprobante.getPedido();
                if (!Constants.PEDIDO_PENDIENTE_APROBACION.equals(pedido.getEstadoPedido())) continue;

                Pago pago = pagoRepository.findTopByPedidoId(pedido.getId()).orElse(null);
                if (pago == null) continue;

                pago.setEstadoPago(Constants.PAGO_CAPTURADO);
                pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
                pagoRepository.save(pago);

                comprobante.setEstado(Constants.COMPROBANTE_APROBADO);
                comprobante.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
                comprobante.setNotasAdmin("Auto-aprobado tras 3 días sin revisión");
                comprobanteRepository.save(comprobante);

                paymentService.confirmarPedido(pago);

                auditSupport.registrarAuditoria(null, "SISTEMA",
                    Constants.AUDITORIA_AUTO_APROBAR_SINPE, "COMPROBANTE_SINPE", comprobante.getId(),
                    "Auto-aprobado: pedido " + pedido.getNumeroPedido() + " — 3 días sin revisión");

                log.info("Auto-aprobado SINPE: pedido={}", pedido.getNumeroPedido());
            } catch (Exception e) {
                log.error("Error en auto-aprobación SINPE comprobanteId={}: {}", comprobante.getId(), e.getMessage());
            }
        }
        if (!expirados.isEmpty()) {
            log.info("Auto-aprobación SINPE empresa={}: {} comprobantes procesados", empresaId, expirados.size());
        }
    }
}
