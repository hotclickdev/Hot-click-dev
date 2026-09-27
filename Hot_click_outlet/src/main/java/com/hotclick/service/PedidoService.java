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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
public class PedidoService {

    private static final Pattern GUIA_VALIDA = Pattern.compile("[A-Z0-9-]{4,60}");

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

        String cliente = nombreClienteTelegram(saved);
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
        Pedido pedido = pedidoRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        Hibernate.initialize(pedido.getCompra());
        return pedido;
    }

    /** Todos los paquetes de la compra del pedido (Detalle `29:1434`), solo los del mismo comprador. */
    @Transactional(readOnly = true)
    public List<Pedido> paquetesDeLaCompra(Pedido pedido) {
        if (pedido.getCompra() == null) return List.of(pedido);
        Long compradorId = compradorDe(pedido);
        List<Pedido> paquetes = pedidoRepository.findPaquetesDeCompra(pedido.getCompra().getId()).stream()
            .filter(p -> Objects.equals(compradorId, compradorDe(p)))
            .toList();
        if (paquetes.isEmpty()) return List.of(pedido);
        pedidoRepository.cargarItemsDe(paquetes.stream().map(Pedido::getId).toList());
        return paquetes;
    }

    private static Long compradorDe(Pedido pedido) {
        return pedido.getUsuarioFinal() != null ? pedido.getUsuarioFinal().getId() : null;
    }

    @Transactional(readOnly = true)
    public Page<Pedido> listarPorUsuario(Long usuarioId, Pageable pageable) {
        Page<Pedido> pagina = pedidoRepository.findPaginaDelComprador(usuarioId, pageable);
        if (pagina.hasContent()) {
            pedidoRepository.cargarItemsDe(pagina.map(Pedido::getId).getContent());
        }
        return pagina;
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

    /** La guía termina dentro del enlace del correo al cliente: solo letras, números y guiones. */
    static String normalizarGuia(String numeroGuia) {
        String guia = numeroGuia == null ? "" : numeroGuia.trim().toUpperCase(Locale.ROOT);
        if (!GUIA_VALIDA.matcher(guia).matches()) {
            throw new IllegalArgumentException("Número de guía no válido: usá solo letras, números y guiones.");
        }
        return guia;
    }

    @Transactional
    public Pedido asignarGuia(Long id, String numeroGuia) {
        String guia = normalizarGuia(numeroGuia);
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        pedido.setNumeroGuia(guia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + guia);
        pedido.setFechaEnvio(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        prepararParaEmailDeGuia(pedido);
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    @Transactional
    public Pedido procesarEnvio(Long id, String numeroGuia, Integer costoEnvio) {
        String guia = normalizarGuia(numeroGuia);
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        pedido.setNumeroGuia(guia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + guia);
        pedido.setFechaEnvio(LocalDateTime.now(Constants.ZONA_CR));
        if (costoEnvio != null) pedido.setCostoEnvio(costoEnvio);
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        prepararParaEmailDeGuia(pedido);
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    /** El email de guía es @Async: todo lo que lee tiene que quedar cargado antes de salir de la transacción. */
    private static void prepararParaEmailDeGuia(Pedido pedido) {
        Hibernate.initialize(pedido.getItems());
        if (pedido.getUsuarioFinal() != null) { pedido.getUsuarioFinal().getCorreo(); }
        if (pedido.getBodega() != null) { pedido.getBodega().getNombreBodega(); }
        Hibernate.initialize(pedido.getCompra());
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

    private static String nombreClienteTelegram(Pedido saved) {
        if (saved.getClienteNombre() != null) return saved.getClienteNombre();
        if (saved.getUsuarioFinal() != null) return saved.getUsuarioFinal().getNombre();
        return "Invitado";
    }
}
