package com.hotclick.service.sinpe;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Solo persistencia del comprobante SINPE, en su propia clase para que quede en una
 * transaccion corta y separada del upload a S3 (que es I/O externo lento y no debe
 * retener una conexion de PgBouncer). Ver {@link SinpeComprobanteService#subirComprobante}.
 */
@Service
public class SinpeComprobantePersistenceService {

    private static final Logger log = LoggerFactory.getLogger(SinpeComprobantePersistenceService.class);

    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private ComprobanteSinpeRepository comprobanteRepository;
    @Autowired private PedidoGrupoService         pedidoGrupoService;

    @Transactional
    public void guardar(String numeroPedido, String url, String nombreRemitente,
                         String cedulaRemitente, String telefonoRemitente, String correoUsuario) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + numeroPedido));

        // Revalidado aca: el estado pudo cambiar mientras se subia el archivo a S3.
        if (!Constants.PEDIDO_PENDIENTE_COMPROBANTE.equals(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido no está esperando un comprobante (estado: " + pedido.getEstadoPedido() + ")");
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

        // Un comprobante cubre el checkout entero: los N paquetes pasan a PENDIENTE_APROBACION juntos.
        for (Pedido p : pedidoGrupoService.delGrupo(pedido)) {
            p.setEstadoPedido(Constants.PEDIDO_PENDIENTE_APROBACION);
            pedidoRepository.save(p);
        }

        log.info("Comprobante SINPE subido: pedido={} remitente={} cedula={}", numeroPedido, nombreRemitente, cedulaRemitente);
    }
}
