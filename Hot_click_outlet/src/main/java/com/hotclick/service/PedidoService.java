package com.hotclick.service;

import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.pedido.PedidoDespachoVerificador;
import com.hotclick.service.pedido.PedidoDetailMapper;
import com.hotclick.service.pedido.PedidoEstadoMaquina;
import com.hotclick.service.pedido.PedidoPagoManualService;
import com.hotclick.service.pedido.PedidoManualFactory;
import com.hotclick.service.pedido.PedidoNotificacionAppender;
import com.hotclick.service.telegram.TelegramTexto;
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

    private static final Pattern GUIA_VALIDA = Pattern.compile("[A-Z0-9-]{3,40}");

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private N8nWebhookService n8nWebhookService;
    @Autowired private TelegramService telegramService;
    @Autowired private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Autowired private PedidoManualFactory pedidoManualFactory;
    @Autowired private PedidoNotificacionAppender pedidoNotificacionAppender;
    @Autowired private PedidoDetailMapper pedidoDetailMapper;
    @Autowired private PedidoPagoManualService pedidoPagoManualService;
    @Autowired private PedidoDespachoVerificador despachoVerificador;

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
                TelegramTexto.escaparMarkdown(cliente), TelegramTexto.escaparMarkdown(saved.getNumeroPedido()),
                saved.getTotalPedido() != null ? saved.getTotalPedido() : 0,
                TelegramTexto.escaparMarkdown(metodo), TelegramTexto.escaparMarkdown(saved.getEstadoPedido())));
        if (saved.getEmpresa() != null) {
            telegramNotificacionClienteService.notificarVenta(saved.getEmpresa().getId(),
                saved.getNumeroPedido(), saved.getTotalPedido(), metodo, cliente, saved.getOrigen(),
                detalleItems(saved));
        }
        return saved;
    }

    @CacheEvict(value = "dashboard-metricas", key = "#empresa.id.toString()")
    @Transactional
    public Pedido crearPedidoManual(ManualPedidoDTO dto, Empresa empresa) {
        return pedidoManualFactory.crearPedidoManual(dto, empresa);
    }

    /** Cambio de estado sin referencia de pago (Telegram/copiloto): PAGADO manual queda rechazado (400). */
    @Transactional
    public Pedido cambiarEstado(Long id, String nuevoEstado, String nota) {
        return cambiarEstado(id, nuevoEstado, nota, null);
    }

    /**
     * Cambio de estado manual (panel, Telegram/copiloto).
     * <ul>
     *   <li>Estado y transición contra la lista cerrada de {@link PedidoEstadoMaquina} (400).</li>
     *   <li>Despachar ({@code → ENVIADO}) o entregar ({@code → ENTREGADO}) exige pago verificado según
     *       {@link PedidoDespachoVerificador}: mira el Pago, no el estado del pedido (409, SEC-09).</li>
     *   <li>{@code → PAGADO}: confirmación manual con referencia ({@link PedidoPagoManualService}, 400).
     *       También si el pedido ya dice PAGADO pero no tiene pago verificado (datos viejos).</li>
     *   <li>Efectivo + retiro: {@code PENDIENTE_COMPROBANTE → ENTREGADO} registra el cobro.</li>
     * </ul>
     */
    @Transactional
    public Pedido cambiarEstado(Long id, String estadoSolicitado, String nota, String referenciaPago) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        String nuevoEstado = PedidoEstadoMaquina.validarEstado(estadoSolicitado);
        String estadoActual = PedidoEstadoMaquina.normalizarActual(pedido.getEstadoPedido());
        boolean mismoEstado = nuevoEstado.equals(estadoActual);
        if (Constants.PEDIDO_ENVIADO.equals(nuevoEstado) && !mismoEstado) {
            despachoVerificador.verificarDespachable(pedido);
        }
        boolean cobroAlRetirar = Constants.PEDIDO_ENTREGADO.equals(nuevoEstado)
            && Constants.PEDIDO_PENDIENTE_COMPROBANTE.equals(estadoActual)
            && PedidoPagoManualService.esEfectivoConRetiro(pedido);
        if (cobroAlRetirar) {
            // Efectivo + retiro en tienda: el cliente paga al retirar (registra el cobro y lo audita).
            pedidoPagoManualService.confirmarCobroAlRetirar(pedido, estadoActual, referenciaPago);
        } else {
            PedidoEstadoMaquina.verificarTransicion(estadoActual, nuevoEstado);
            if (Constants.PEDIDO_ENTREGADO.equals(nuevoEstado) && !mismoEstado
                    && !Constants.PEDIDO_ENVIADO.equals(estadoActual)) {
                despachoVerificador.verificarDespachable(pedido);
            }
            if (Constants.PEDIDO_PAGADO.equals(nuevoEstado)
                    && (!mismoEstado || !despachoVerificador.pagoVerificado(pedido))) {
                pedidoPagoManualService.confirmar(pedido, estadoActual, referenciaPago);
            }
        }
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
        Page<Pedido> pagina = pedidoRepository.findPaginaDelComprador(usuarioId, pageable);
        if (pagina.hasContent()) {
            pedidoRepository.cargarItemsDe(pagina.getContent().stream().map(Pedido::getId).toList());
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

    /**
     * Guía / envío: si el pedido ya está ENVIADO solo se corrige la guía. Si no, exige pago verificado
     * (409) y que la transición a ENVIADO sea válida (400; p. ej. no desde ENTREGADO o COMPLETADO).
     */
    private static String guiaNormalizada(String numeroGuia) {
        String guia = numeroGuia == null ? "" : numeroGuia.trim().toUpperCase(Locale.ROOT);
        if (!GUIA_VALIDA.matcher(guia).matches()) {
            throw new IllegalArgumentException("Número de guía no válido");
        }
        return guia;
    }

    private void verificarDespachoConGuia(Pedido pedido) {
        String estadoActual = PedidoEstadoMaquina.normalizarActual(pedido.getEstadoPedido());
        if (Constants.PEDIDO_ENVIADO.equals(estadoActual)) return;
        despachoVerificador.verificarDespachable(pedido);
        PedidoEstadoMaquina.verificarTransicion(estadoActual, Constants.PEDIDO_ENVIADO);
    }

    @Transactional
    public Pedido asignarGuia(Long id, String numeroGuia) {
        String guia = guiaNormalizada(numeroGuia);
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        verificarDespachoConGuia(pedido);
        pedido.setNumeroGuia(guia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + guia);
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
        verificarDespachoConGuia(pedido);
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

    private static String nombreClienteTelegram(Pedido saved) {
        if (saved.getClienteNombre() != null) return saved.getClienteNombre();
        if (saved.getUsuarioFinal() != null) return saved.getUsuarioFinal().getNombre();
        return "Invitado";
    }

    private static String detalleItems(Pedido pedido) {
        if (pedido.getItems() == null || !Hibernate.isInitialized(pedido.getItems()) || pedido.getItems().isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (PedidoItem item : pedido.getItems()) {
            if (!sb.isEmpty()) sb.append('\n');
            int cantidad = item.getCantidad() != null ? item.getCantidad() : 1;
            sb.append("• ").append(cantidad).append(" × ").append(TelegramTexto.escaparMarkdown(nombreItem(item)));
        }
        return sb.toString();
    }

    private static String nombreItem(PedidoItem item) {
        if (item.getProducto() == null || !Hibernate.isInitialized(item.getProducto())) return "Producto";
        String nombre = item.getProducto().getNombreProducto();
        return nombre != null ? nombre : "Producto";
    }
}
