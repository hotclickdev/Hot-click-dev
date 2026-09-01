package com.hotclick.service;

import com.hotclick.dto.*;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.*;
import com.hotclick.repository.EncargoPersonalizadoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.email.EncargoEmailSender;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EncargoService {

    private static final Logger log = LoggerFactory.getLogger(EncargoService.class);
    private static final int MAX_IMAGENES = 3;

    @Autowired private EncargoPersonalizadoRepository encargoRepo;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private SupabaseStorageService storageService;
    @Autowired private InputSanitizer sanitizer;
    @Autowired private CompanyScope companyScope;
    @Autowired private EncargoEmailSender emailSender;
    @Autowired private TelegramNotificacionClienteService telegramNotif;
    @Autowired @org.springframework.context.annotation.Lazy private PaymentService paymentService;

    public String subirImagen(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No se recibió ningún archivo");
        }
        try {
            return storageService.subirImagen(file, "Encargos");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Error al subir imagen: " + e.getMessage(), e);
        }
    }

    @Transactional
    public EncargoPersonalizado crear(EncargoCreateRequest req, String correoUsuario) {
        Producto producto = productoRepo.findById(req.getProductoId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", req.getProductoId()));

        validarProductoParaCotizacion(producto);
        validarReferencias(req.getImagenes(), req.getNotas());

        EncargoPersonalizado encargo = new EncargoPersonalizado();
        encargo.setProducto(producto);
        encargo.setEmpresa(producto.getEmpresa());
        encargo.setNombreCliente(sanitizer.cleanWithLimit(req.getNombreCliente(), 120));
        encargo.setEmail(sanitizer.cleanWithLimit(req.getEmail().trim().toLowerCase(), 200));
        if (req.getTelefono() != null) {
            encargo.setTelefono(sanitizer.cleanWithLimit(req.getTelefono(), 30));
        }
        if (req.getNotas() != null) {
            encargo.setNotas(sanitizer.cleanWithLimit(req.getNotas(), 2000));
        }
        if (req.getTallaSeleccionada() != null) {
            encargo.setTallaSeleccionada(sanitizer.cleanWithLimit(req.getTallaSeleccionada(), 50));
        }
        aplicarImagenes(encargo, req.getImagenes());
        encargo.setModoPrecio(producto.getModoPrecioPersonalizado());
        encargo.setEstado(EncargoPersonalizado.ESTADO_PENDIENTE);

        if (correoUsuario != null && !correoUsuario.isBlank()) {
            usuarioRepo.findByCorreo(correoUsuario).ifPresent(encargo::setUsuario);
        }

        EncargoPersonalizado guardado = encargoRepo.save(encargo);
        enriquecer(guardado);
        notificarNuevo(guardado);
        return guardado;
    }

    @Transactional(readOnly = true)
    public EncargoPersonalizado obtenerPorToken(String token) {
        EncargoPersonalizado encargo = encargoRepo.findByTokenPublico(token)
            .orElseThrow(() -> new RecursoNoEncontradoException("Encargo no encontrado"));
        enriquecer(encargo);
        return encargo;
    }

    @Transactional(readOnly = true)
    public List<EncargoPersonalizado> listarDelTenant(String estado) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            throw new IllegalStateException("No se pudo determinar la empresa del usuario");
        }
        List<EncargoPersonalizado> lista = (estado == null || estado.isBlank())
            ? encargoRepo.findByEmpresaIdConProducto(empresaId)
            : encargoRepo.findByEmpresaIdAndEstadoConProducto(empresaId, estado.toUpperCase());
        lista.forEach(this::enriquecer);
        return lista;
    }

    @Transactional
    public EncargoPersonalizado aprobar(Long id, EncargoAprobarRequest req) {
        EncargoPersonalizado encargo = cargarYAutorizar(id);
        if (!EncargoPersonalizado.ESTADO_PENDIENTE.equals(encargo.getEstado())) {
            throw new IllegalStateException("Solo se pueden aprobar encargos pendientes");
        }
        validarPrecioEnRango(encargo, req.getPrecioCotizado());

        encargo.setPrecioCotizado(req.getPrecioCotizado());
        encargo.setEstado(EncargoPersonalizado.ESTADO_APROBADO);
        encargo.setFechaVencimiento(
            LocalDateTime.now(Constants.ZONA_CR).plusDays(EncargoPersonalizado.DIAS_VENCIMIENTO_COTIZACION));
        EncargoPersonalizado guardado = encargoRepo.save(encargo);
        enriquecer(guardado);
        emailSender.notificarEncargoAprobado(guardado);
        return guardado;
    }

    @Transactional
    public EncargoPersonalizado rechazar(Long id, EncargoRechazarRequest req) {
        EncargoPersonalizado encargo = cargarYAutorizar(id);
        if (!EncargoPersonalizado.ESTADO_PENDIENTE.equals(encargo.getEstado())) {
            throw new IllegalStateException("Solo se pueden rechazar encargos pendientes");
        }
        encargo.setEstado(EncargoPersonalizado.ESTADO_RECHAZADO);
        encargo.setMotivoRechazo(sanitizer.cleanWithLimit(req.getMotivoRechazo(), 1000));
        EncargoPersonalizado guardado = encargoRepo.save(encargo);
        enriquecer(guardado);
        emailSender.notificarEncargoRechazado(guardado);
        return guardado;
    }

    @Transactional
    public PaymentCheckoutResponse checkoutPorToken(String token, EncargoCheckoutRequest req) {
        EncargoPersonalizado encargo = obtenerPorToken(token);
        if (!EncargoPersonalizado.ESTADO_APROBADO.equals(encargo.getEstado())) {
            throw new IllegalStateException("El encargo no está listo para pagar");
        }
        if (encargo.getFechaVencimiento() != null
            && encargo.getFechaVencimiento().isBefore(LocalDateTime.now(Constants.ZONA_CR))) {
            encargo.setEstado(EncargoPersonalizado.ESTADO_VENCIDO);
            encargoRepo.save(encargo);
            throw new IllegalStateException("La cotización venció. Solicitá un nuevo encargo.");
        }
        if (encargo.getPrecioCotizado() == null || encargo.getPrecioCotizado() < 1) {
            throw new IllegalStateException("El encargo no tiene precio cotizado");
        }

        Producto producto = encargo.getProducto();
        Hibernate.initialize(producto.getBodega());

        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(producto.getId());
        item.setCantidad(1);
        item.setPrecioUnitarioOverride(encargo.getPrecioCotizado());
        item.setPersonalizacion(personalizacionDesdeEncargo(encargo));

        PaymentCheckoutRequest checkoutReq = new PaymentCheckoutRequest();
        checkoutReq.setBodegaId(producto.getBodega().getId());
        checkoutReq.setMetodoEnvio(req.getMetodoEnvio());
        checkoutReq.setProvider(req.getProvider() != null ? req.getProvider() : "STRIPE");
        checkoutReq.setGuestEmail(encargo.getEmail());
        checkoutReq.setGuestPhone(encargo.getTelefono());
        checkoutReq.setNotas(req.getNotas());
        checkoutReq.setItems(List.of(item));

        PaymentCheckoutResponse response = paymentService.checkout(checkoutReq, null);

        encargo.setEstado(EncargoPersonalizado.ESTADO_PENDIENTE_PAGO);
        // El pedido se asocia en el factory vía personalizacion.encargoToken
        encargoRepo.save(encargo);
        return response;
    }

    @Transactional
    public void crearEncargosDesdeCheckout(Pedido pedido, List<PaymentCheckoutRequest.ItemDTO> items,
                                           Usuario usuario) {
        if (items == null) return;
        for (PaymentCheckoutRequest.ItemDTO item : items) {
            if (item.getPersonalizacion() == null) continue;
            PaymentCheckoutRequest.PersonalizacionDTO pers = item.getPersonalizacion();

            if (pers.getEncargoToken() != null && !pers.getEncargoToken().isBlank()) {
                encargoRepo.findByTokenPublico(pers.getEncargoToken()).ifPresent(e -> {
                    e.setPedido(pedido);
                    e.setEstado(EncargoPersonalizado.ESTADO_PENDIENTE_PAGO);
                    encargoRepo.save(e);
                });
                continue;
            }

            Producto producto = productoRepo.findById(item.getProductoId()).orElse(null);
            if (producto == null || !Boolean.TRUE.equals(producto.getEsPersonalizado())) continue;

            EncargoPersonalizado encargo = new EncargoPersonalizado();
            encargo.setProducto(producto);
            encargo.setEmpresa(producto.getEmpresa() != null ? producto.getEmpresa() : pedido.getEmpresa());
            encargo.setPedido(pedido);
            encargo.setUsuario(usuario);
            encargo.setNombreCliente(nombreDeUsuario(usuario, pedido));
            encargo.setEmail(emailDeUsuario(usuario, pedido));
            encargo.setTelefono(usuario != null ? usuario.getTelefono() : null);
            encargo.setNotas(pers.getNotas());
            encargo.setTallaSeleccionada(pers.getTallaSeleccionada());
            aplicarImagenes(encargo, pers.getImagenes());
            encargo.setModoPrecio(
                producto.getModoPrecioPersonalizado() != null
                    ? producto.getModoPrecioPersonalizado()
                    : EncargoPersonalizado.MODO_FIJO);
            encargo.setPrecioCotizado(producto.getPrecioVenta());
            encargo.setEstado(EncargoPersonalizado.ESTADO_PENDIENTE_PAGO);
            encargoRepo.save(encargo);
        }
    }

    @Transactional
    public void marcarPagadosPorPedido(Long pedidoId) {
        List<EncargoPersonalizado> lista = encargoRepo.findByPedido_Id(pedidoId);
        for (EncargoPersonalizado e : lista) {
            e.setEstado(EncargoPersonalizado.ESTADO_PAGADO);
            encargoRepo.save(e);
        }
    }

    @Transactional
    public int marcarVencidos() {
        List<EncargoPersonalizado> vencidos =
            encargoRepo.findAprobadosVencidos(LocalDateTime.now(Constants.ZONA_CR));
        for (EncargoPersonalizado e : vencidos) {
            e.setEstado(EncargoPersonalizado.ESTADO_VENCIDO);
            encargoRepo.save(e);
        }
        return vencidos.size();
    }

    private EncargoPersonalizado cargarYAutorizar(Long id) {
        EncargoPersonalizado encargo = encargoRepo.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Encargo", id));
        Hibernate.initialize(encargo.getProducto());
        Hibernate.initialize(encargo.getEmpresa());
        companyScope.assertCanAccess(encargo.getEmpresa().getId());
        enriquecer(encargo);
        return encargo;
    }

    private void validarProductoParaCotizacion(Producto producto) {
        if (!Boolean.TRUE.equals(producto.getEsPersonalizado())) {
            throw new IllegalArgumentException("Este producto no acepta encargos personalizados");
        }
        String modo = producto.getModoPrecioPersonalizado();
        if (EncargoPersonalizado.MODO_FIJO.equals(modo)) {
            throw new IllegalArgumentException(
                "Este producto tiene precio fijo: agregalo al carrito con tus imágenes");
        }
        if (!EncargoPersonalizado.MODO_RANGO.equals(modo)
            && !EncargoPersonalizado.MODO_COTIZACION.equals(modo)) {
            throw new IllegalArgumentException("Modo de precio personalizado inválido");
        }
        if (producto.getEmpresa() == null) {
            throw new IllegalStateException("El producto no tiene empresa asociada");
        }
    }

    private void validarReferencias(List<String> imagenes, String notas) {
        boolean tieneImagen = imagenes != null && imagenes.stream()
            .anyMatch(u -> u != null && !u.isBlank());
        boolean tieneNotas = notas != null && !notas.isBlank();
        if (!tieneImagen && !tieneNotas) {
            throw new IllegalArgumentException(
                "Subí al menos una imagen de referencia o escribí notas para el artista");
        }
        if (imagenes != null && imagenes.size() > MAX_IMAGENES) {
            throw new IllegalArgumentException("Máximo " + MAX_IMAGENES + " imágenes de referencia");
        }
    }

    private void validarPrecioEnRango(EncargoPersonalizado encargo, Integer precio) {
        Producto p = encargo.getProducto();
        if (!EncargoPersonalizado.MODO_RANGO.equals(encargo.getModoPrecio())) return;
        Integer min = p.getPrecioPersonalizadoMin();
        Integer max = p.getPrecioPersonalizadoMax();
        if (min != null && precio < min) {
            throw new IllegalArgumentException("El precio está por debajo del mínimo (₡" + min + ")");
        }
        if (max != null && precio > max) {
            throw new IllegalArgumentException("El precio está por encima del máximo (₡" + max + ")");
        }
    }

    private void aplicarImagenes(EncargoPersonalizado encargo, List<String> imagenes) {
        if (imagenes == null) return;
        if (imagenes.size() > 0 && imagenes.get(0) != null) {
            encargo.setImagenUrl1(sanitizer.cleanWithLimit(imagenes.get(0), 500));
        }
        if (imagenes.size() > 1 && imagenes.get(1) != null) {
            encargo.setImagenUrl2(sanitizer.cleanWithLimit(imagenes.get(1), 500));
        }
        if (imagenes.size() > 2 && imagenes.get(2) != null) {
            encargo.setImagenUrl3(sanitizer.cleanWithLimit(imagenes.get(2), 500));
        }
    }

    private PaymentCheckoutRequest.PersonalizacionDTO personalizacionDesdeEncargo(EncargoPersonalizado e) {
        PaymentCheckoutRequest.PersonalizacionDTO p = new PaymentCheckoutRequest.PersonalizacionDTO();
        p.setNotas(e.getNotas());
        p.setTallaSeleccionada(e.getTallaSeleccionada());
        p.setEncargoToken(e.getTokenPublico());
        p.setImagenes(List.of(
            nullToEmpty(e.getImagenUrl1()),
            nullToEmpty(e.getImagenUrl2()),
            nullToEmpty(e.getImagenUrl3())
        ).stream().filter(s -> !s.isBlank()).toList());
        return p;
    }

    private String nullToEmpty(String s) { return s != null ? s : ""; }

    private void enriquecer(EncargoPersonalizado e) {
        if (e.getProducto() != null) {
            Hibernate.initialize(e.getProducto());
            e.setProductoNombre(e.getProducto().getNombreProducto());
            e.setProductoId(e.getProducto().getId());
        }
        if (e.getEmpresa() != null) {
            e.setEmpresaId(e.getEmpresa().getId());
        }
        if (e.getPedido() != null) {
            e.setPedidoId(e.getPedido().getId());
        }
    }

    private void notificarNuevo(EncargoPersonalizado encargo) {
        emailSender.notificarEncargoRecibidoCliente(encargo);
        Empresa empresa = encargo.getEmpresa();
        if (empresa != null) {
            emailSender.notificarNuevoEncargoAlArtista(
                empresa.getCorreoEmpresa(),
                empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa(),
                encargo);
            try {
                telegramNotif.notificarSolicitudEnviada(
                    empresa.getId(), "Encargo personalizado", encargo.getProductoNombre());
            } catch (Exception ex) {
                log.warn("Telegram encargo falló: {}", ex.getMessage());
            }
        }
    }

    private String nombreDeUsuario(Usuario usuario, Pedido pedido) {
        if (usuario != null && usuario.getNombre() != null) return usuario.getNombre();
        return "Cliente";
    }

    private String emailDeUsuario(Usuario usuario, Pedido pedido) {
        if (usuario != null && usuario.getCorreo() != null) return usuario.getCorreo();
        return "cliente@hotclick.lat";
    }
}
