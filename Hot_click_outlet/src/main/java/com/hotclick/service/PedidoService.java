package com.hotclick.service;

import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.pedido.PedidoDetailMapper;
import com.hotclick.service.pedido.PedidoManualFactory;
import com.hotclick.service.pedido.PedidoNotificacionAppender;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class PedidoService {

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private N8nWebhookService n8nWebhookService;
    @Autowired private TelegramService telegramService;
    @Autowired private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Autowired private PedidoManualFactory pedidoManualFactory;
    @Autowired private PedidoNotificacionAppender pedidoNotificacionAppender;
    @Autowired private PedidoDetailMapper pedidoDetailMapper;

    @CacheEvict(value = "dashboard-metricas",
        key = "#pedido.empresa != null ? #pedido.empresa.id.toString() : 'global'")
    @Transactional
    public Pedido crearPedido(Pedido pedido) {
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        if (pedido.getEstadoPedido() == null) {
            pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        }
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        Pedido saved = pedidoRepository.save(pedido);

        String cliente = saved.getClienteNombre() != null ? saved.getClienteNombre()
                : (saved.getUsuarioFinal() != null ? saved.getUsuarioFinal().getNombre() : "Invitado");
        String metodo = saved.getMetodoPago() != null ? saved.getMetodoPago() : "—";
        telegramService.enviar(String.format(
                "🛒 *NUEVA COMPRA*\n\n*Cliente:* %s\n*Pedido:* %s\n*Total:* ₡%,d\n*Pago:* %s\n*Estado:* %s",
                cliente, saved.getNumeroPedido(), saved.getTotalPedido() != null ? saved.getTotalPedido() : 0,
                metodo, saved.getEstadoPedido()));
        if (saved.getEmpresa() != null) {
            telegramNotificacionClienteService.notificarVenta(saved.getEmpresa().getId(),
                saved.getNumeroPedido(), saved.getTotalPedido(), metodo, cliente, saved.getOrigen());
        }
        return saved;
    }

    @CacheEvict(value = "dashboard-metricas", key = "#empresa.id.toString()")
    @Transactional
    public Pedido crearPedidoManual(ManualPedidoDTO dto, Empresa empresa) {
        return pedidoManualFactory.crearPedidoManual(dto, empresa);
    }

    @Transactional
    public Pedido cambiarEstado(Long id, String nuevoEstado, String nota) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        pedido.setEstadoPedido(nuevoEstado);
        if (nota != null && !nota.isBlank()) {
            pedidoNotificacionAppender.appendNotificacion(pedido, nuevoEstado, nota);
        }
        pedido = pedidoRepository.save(pedido);
        Hibernate.initialize(pedido.getItems());
        // Inicializar proxy LAZY de usuarioFinal para que el @Async email no falle
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        if (pedido.getBodega() != null) { pedido.getBodega().getNombreBodega(); } // evita LazyInitializationException al serializar la respuesta
        if (nota != null && !nota.isBlank()) {
            notificacionEmailService.enviarSeguimientoEstado(pedido, nota);
        }
        if (Constants.PEDIDO_ENTREGADO.equals(nuevoEstado)) {
            n8nWebhookService.notificarPedidoEntregado(pedido);
        }
        return pedido;
    }

    @Transactional(readOnly = true)
    public Pedido buscarPorId(Long id) {
        return pedidoRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
    }

    @Transactional(readOnly = true)
    public Page<Pedido> listarPorUsuario(Long usuarioId, Pageable pageable) {
        // Usa fetch join en la query de count/sort paginada — la carga de items ocurre en una sola query adicional
        return pedidoRepository.findByUsuarioFinalIdOrderByFechaPedidoDesc(usuarioId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPendientes(Long empresaId) {
        if (empresaId != null) {
            // JOIN FETCH items en una sola query — elimina N+1 del .size() anterior
            return pedidoRepository.findByEmpresaIdAndEstadoPedidoWithItems(
                empresaId, Constants.PEDIDO_PENDIENTE, Constants.ESTADO_ACTIVO);
        }
        return pedidoRepository.findByEstadoPedidoAndEstado(Constants.PEDIDO_PENDIENTE, Constants.ESTADO_ACTIVO);
    }

    @Transactional
    public Pedido asignarGuia(Long id, String numeroGuia) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        pedido.setNumeroGuia(numeroGuia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + numeroGuia);
        pedido.setFechaEnvio(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        Hibernate.initialize(pedido.getItems());
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        if (pedido.getBodega() != null) { pedido.getBodega().getNombreBodega(); }
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    @Transactional
    public Pedido procesarEnvio(Long id, String guia, Integer costoEnvio) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        pedido.setNumeroGuia(guia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + guia);
        pedido.setFechaEnvio(LocalDateTime.now(Constants.ZONA_CR));
        if (costoEnvio != null) pedido.setCostoEnvio(costoEnvio);
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        Hibernate.initialize(pedido.getItems());
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        if (pedido.getBodega() != null) { pedido.getBodega().getNombreBodega(); }
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    @Transactional
    public void eliminarPedido(Long id) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        pedidoRepository.delete(pedido);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarResumenPaginado(int page, int size) {
        return pedidoDetailMapper.listarResumenPaginado(page, size);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarResumenPaginadoPorEmpresa(int page, int size, Long empresaId) {
        return pedidoDetailMapper.listarResumenPaginadoPorEmpresa(page, size, empresaId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosConDetallesByEmpresa(Long empresaId) {
        return pedidoDetailMapper.listarTodosConDetallesByEmpresa(empresaId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosConDetalles() {
        return pedidoDetailMapper.listarTodosConDetalles();
    }
}
