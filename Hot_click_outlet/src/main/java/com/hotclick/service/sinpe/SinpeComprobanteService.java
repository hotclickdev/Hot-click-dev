package com.hotclick.service.sinpe;

import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
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
    @Autowired private SinpeAprobacionGuard          aprobacionGuard;
    @Autowired private CompanyScope                  companyScope;
    @Autowired private com.hotclick.service.payment.PedidoGrupoService pedidoGrupoService;
    @Autowired private SinpeComprobantePersistenceService persistenceService;

    @org.springframework.beans.factory.annotation.Value("${sinpe.comprobante.url-firmada-segundos:300}")
    private long segundosUrlFirmada = 300;

    /**
     * C1: URL firmada de corta duración. Solo el dueño del pedido (correo de la sesión) o un admin de
     * plataforma (SOLO_PLATAFORMA, lo decide el controller). Cualquier otro caso: SecurityException.
     */
    @Transactional(readOnly = true)
    public String urlFirmadaComprobante(Long comprobanteId, String correoSolicitante, boolean adminPlataforma) {
        ComprobanteSinpe comprobante = comprobanteRepository.findById(comprobanteId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Comprobante", comprobanteId));
        if (!adminPlataforma) {
            Pedido pedido = comprobante.getPedido();
            String dueno = pedido == null || pedido.getUsuarioFinal() == null ? null : pedido.getUsuarioFinal().getCorreo();
            if (dueno == null || correoSolicitante == null || !dueno.equalsIgnoreCase(correoSolicitante)) {
                throw new SecurityException("No tenés permiso para ver este comprobante");
            }
        }
        String clave = storageService.claveDeComprobante(comprobante.getUrlComprobante());
        if (clave == null) {
            throw new RecursoNoEncontradoException("Comprobante sin archivo");
        }
        return storageService.urlFirmada(clave, java.time.Duration.ofSeconds(Math.max(1, segundosUrlFirmada)));
    }

    /**
     * El Pago de una compra multinegocio vive en el paquete principal: desde cualquier paquete
     * se llega a él por grupo_pago y, para compras del modelo anterior, por la compra.
     */
    private java.util.Optional<Pago> pagoDeLaCompra(Pedido pedido) {
        java.util.Optional<Pago> pago = pedidoGrupoService.pagoDelGrupo(pedido);
        return pago.isPresent() ? pago : com.hotclick.service.payment.CompraPaquetes.pagoDe(pedido, pagoRepository);
    }

    @Transactional(readOnly = true)
    public Page<ComprobanteSinpe> listar(String estado, Pageable pageable) {
        if (companyScope.isAdminIT()) {
            return comprobanteRepository.buscarPorEstado(estado, pageable);
        }
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null) {
            throw new SecurityException(SinpeAprobacionGuard.OTRA_TIENDA);
        }
        return comprobanteRepository.buscarPorEstadoYEmpresa(estado, empresaId, pageable);
    }
}
