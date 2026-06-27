package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Lógica de negocio para pagos SINPE Móvil.
 * Flujo: checkout → subir comprobante → aprobación admin (o auto-aprobación a los 3 días).
 */
@Service
public class SinpeService {

    private static final Logger log = LoggerFactory.getLogger(SinpeService.class);

    @Autowired private PedidoRepository              pedidoRepository;
    @Autowired private ProductoRepository            productoRepository;
    @Autowired private BodegaRepository              bodegaRepository;
    @Autowired private UsuarioRepository             usuarioRepository;
    @Autowired private RolRepository                 rolRepository;
    @Autowired private PagoRepository                pagoRepository;
    @Autowired private ComprobanteSinpeRepository    comprobanteRepository;
    @Autowired private AuditoriaAdminRepository      auditoriaRepository;
    @Autowired private EmpresaRepository             empresaRepository;
    @Autowired private SupabaseStorageService         storageService;
    @Autowired private NotificacionEmailService       notificacionEmailService;
    @Autowired private CuponService                  cuponService;
    @Autowired private PasswordEncoder               passwordEncoder;
    @Autowired private PaymentService                paymentService;

    // ================================================================
    // CHECKOUT SINPE — crea pedido en PENDIENTE_COMPROBANTE
    // ================================================================
    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("El carrito no tiene productos");
        }

        String emailEfectivo = (correoUsuario != null && !correoUsuario.equals("anonymousUser"))
            ? correoUsuario : req.getGuestEmail();
        if (emailEfectivo == null || emailEfectivo.isBlank()) {
            throw new IllegalArgumentException("Se requiere correo electrónico para procesar el pedido");
        }

        Usuario usuario = usuarioRepository.findByCorreo(emailEfectivo)
            .orElseGet(() -> crearUsuarioInvitado(emailEfectivo, req.getGuestPhone()));

        Long bodegaId = req.getBodegaId() != null ? req.getBodegaId() : 1L;
        Bodega bodega = bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RuntimeException("Bodega no encontrada: " + bodegaId));

        int subtotal   = 0;
        int costoTotal = 0;
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productoRepository.findByIdForUpdate(item.getProductoId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductoId()));

            if (!Boolean.TRUE.equals(p.getVisibleCatalogo()) || Boolean.TRUE.equals(p.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + p.getNombreProducto());
            }
            if (p.getStockDisponible() < item.getCantidad()) {
                throw new IllegalStateException(
                    "Stock insuficiente para \"" + p.getNombreProducto() + "\""
                    + " (disponible: " + p.getStockDisponible()
                    + ", solicitado: " + item.getCantidad() + ")");
            }
            p.setStockReservado(p.getStockReservado() + item.getCantidad());
            productoRepository.save(p);

            subtotal   += p.getPrecioVenta()  * item.getCantidad();
            costoTotal += p.getPrecioCompra() * item.getCantidad();
        }

        int costoEnvio = calcularCostoEnvio(req.getMetodoEnvio());

        int descuento = 0;
        String codigoCuponAplicado = null;
        String codigoCupon = req.getCodigoCupon();
        if (codigoCupon != null && !codigoCupon.isBlank()) {
            var cuponOpt = cuponService.validarCodigo(codigoCupon);
            if (cuponOpt.isPresent()) {
                descuento = (int) Math.round(subtotal * cuponOpt.get().getDescuentoPorcentaje() / 100.0);
                codigoCuponAplicado = cuponOpt.get().getCodigo();
            }
        }
        int total = subtotal - descuento + costoEnvio;

        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setSubtotal(subtotal);
        pedido.setTotalPedido(total);
        pedido.setCostoEnvio(costoEnvio);
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal - descuento);
        pedido.setDescuentoTotal(descuento);
        pedido.setCuponCodigo(codigoCuponAplicado);
        pedido.setMontoImpuesto(0);
        pedido.setAplicaImpuesto(false);
        if (subtotal > 0) {
            pedido.setMargenGananciaPedido(
                BigDecimal.valueOf((long) subtotal - costoTotal)
                    .divide(BigDecimal.valueOf(subtotal), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)));
        }
        String proveedorEfectivo = req.getProvider() != null ? req.getProvider() : Constants.PROVEEDOR_SINPE;
        pedido.setMetodoPago(proveedorEfectivo);
        pedido.setMetodoEnvio(req.getMetodoEnvio() != null ? req.getMetodoEnvio() : "RETIRO_EN_TIENDA");
        pedido.setNotas(req.getNotas());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedidoRepository.save(pedido);

        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productoRepository.findById(item.getProductoId()).orElseThrow();
            PedidoItem pi = new PedidoItem();
            pi.setCantidad(item.getCantidad());
            pi.setPrecioUnitarioMomento(p.getPrecioVenta());
            pi.setCostoUnitarioMomento(p.getPrecioCompra());
            pi.setSubtotalItem(p.getPrecioVenta() * item.getCantidad());
            pi.setUtilidadItem((p.getPrecioVenta() - p.getPrecioCompra()) * item.getCantidad());
            pi.setDescuentoAplicado(0);
            pi.setProducto(p);
            pi.setPedido(pedido);
            pi.setEstado(Constants.ESTADO_ACTIVO);
            pedido.getItems().add(pi);
        }
        pedidoRepository.save(pedido);

        // Registro de pago sin fecha de expiración (SINPE es manual, no expira por TTL)
        Pago pago = new Pago();
        pago.setMerchantToken("SINPE-" + UUID.randomUUID());
        pago.setMonto(total);
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        // Sin fecha de expiración: el TTL cleanup de PaymentService filtra por proveedor SINPE
        pago.setPedido(pedido);
        pago.setUsuario(usuario);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        pagoRepository.save(pago);

        log.info("Checkout {} iniciado: pedido={} total={}", proveedorEfectivo, pedido.getNumeroPedido(), total);

        return new PaymentCheckoutResponse(
            pedido.getId(), pedido.getNumeroPedido(),
            null, Constants.PAGO_PENDIENTE, total, proveedorEfectivo);
    }

    // ================================================================
    // SUBIR COMPROBANTE — usuario sube foto de pago
    // ================================================================
    @Transactional
    public void subirComprobante(String numeroPedido, MultipartFile archivo,
                                 String nombreRemitente, String cedulaRemitente,
                                 String telefonoRemitente, String correoUsuario) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + numeroPedido));

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
            throw new RuntimeException("Error al subir el comprobante: " + e.getMessage(), e);
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

    // ================================================================
    // APROBAR — admin confirma el pago SINPE
    // ================================================================
    @Transactional
    public void aprobar(Long comprobanteId, String adminEmail, Long adminId) {
        ComprobanteSinpe comprobante = comprobanteRepository.findById(comprobanteId)
            .orElseThrow(() -> new RuntimeException("Comprobante no encontrado: " + comprobanteId));

        if (!Constants.COMPROBANTE_PENDIENTE.equals(comprobante.getEstado())) {
            throw new IllegalStateException("El comprobante ya fue procesado: " + comprobante.getEstado());
        }

        Pedido pedido = comprobante.getPedido();
        if (!Constants.PEDIDO_PENDIENTE_APROBACION.equals(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido no está en estado PENDIENTE_APROBACION");
        }

        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RuntimeException("Pago SINPE no encontrado para pedido: " + pedido.getNumeroPedido()));

        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);

        comprobante.setEstado(Constants.COMPROBANTE_APROBADO);
        comprobante.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        comprobante.setAdminId(adminId);
        comprobante.setAdminEmail(adminEmail);
        comprobanteRepository.save(comprobante);

        paymentService.confirmarPedido(pago);

        registrarAuditoria(adminId, adminEmail,
            Constants.AUDITORIA_APROBAR_SINPE, "COMPROBANTE_SINPE", comprobanteId,
            "Pedido " + pedido.getNumeroPedido() + " aprobado");

        log.info("Comprobante SINPE aprobado por {}: pedido={}", adminEmail, pedido.getNumeroPedido());
    }

    // ================================================================
    // RECHAZAR — admin rechaza el comprobante
    // ================================================================
    @Transactional
    public void rechazar(Long comprobanteId, String motivo, String adminEmail, Long adminId) {
        ComprobanteSinpe comprobante = comprobanteRepository.findById(comprobanteId)
            .orElseThrow(() -> new RuntimeException("Comprobante no encontrado: " + comprobanteId));

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

        registrarAuditoria(adminId, adminEmail,
            Constants.AUDITORIA_RECHAZAR_SINPE, "COMPROBANTE_SINPE", comprobanteId,
            "Pedido " + pedido.getNumeroPedido() + " rechazado. Motivo: " + motivo);

        log.info("Comprobante SINPE rechazado por {}: pedido={}", adminEmail, pedido.getNumeroPedido());
    }

    // ================================================================
    // AUTO-APROBACIÓN — comprobantes PENDIENTE con más de 3 días
    // ================================================================
    @Scheduled(cron = "0 0 1 * * *") // 1:00 AM diario
    @SchedulerLock(name = "sinpe_auto_approval", lockAtMostFor = "PT30M", lockAtLeastFor = "PT10M")
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

                registrarAuditoria(null, "SISTEMA",
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

    // ================================================================
    // LISTAR — para el admin
    // ================================================================
    @Transactional(readOnly = true)
    public Page<ComprobanteSinpe> listar(String estado, Pageable pageable) {
        return comprobanteRepository.buscarPorEstado(estado, pageable);
    }

    // ================================================================
    // Helpers
    // ================================================================

    private int calcularCostoEnvio(String metodoEnvio) {
        if (metodoEnvio == null) return 0;
        return switch (metodoEnvio) {
            case "ENVIO_RAPIDO"            -> 5000;
            case "ENVIO_NORMAL_GAM"        -> 4000;
            case "ENVIO_NORMAL_FUERA_GAM"  -> 4000;
            case "ENCOMIENDA_PROPIA"       -> 2500;
            case "ENVIO_A_DOMICILIO"       -> 2000;
            default                        -> 0;
        };
    }

    private void registrarAuditoria(Long adminId, String adminEmail,
                                    String accion, String entidad,
                                    Long entidadId, String detalle) {
        AuditoriaAdmin audit = new AuditoriaAdmin();
        audit.setAdminId(adminId);
        audit.setAdminEmail(adminEmail);
        audit.setAccion(accion);
        audit.setEntidad(entidad);
        audit.setEntidadId(entidadId);
        audit.setDetalle(detalle);
        audit.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        auditoriaRepository.save(audit);
    }

    private Usuario crearUsuarioInvitado(String correo, String telefono) {
        Usuario u = new Usuario();
        String uid = UUID.randomUUID().toString().replace("-", "");
        u.setIdentificacion("GUEST-" + uid.substring(0, 13));
        u.setNombre("Invitado");
        u.setApellidoPaterno("Guest");
        u.setCorreo(correo);
        u.setTelefono(telefono != null && !telefono.isBlank()
            ? telefono.replaceAll("[^0-9]", "") : "00000000");
        u.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        u.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        u.setEstado(Constants.ESTADO_ACTIVO);
        rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL)
            .ifPresent(rol -> u.setRoles(List.of(rol)));
        return usuarioRepository.save(u);
    }
}
