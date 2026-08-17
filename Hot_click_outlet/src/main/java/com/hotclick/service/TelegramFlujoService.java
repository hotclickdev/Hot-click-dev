package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.telegram.TelegramFlujoAccionHandler;
import com.hotclick.service.telegram.TelegramFlujoClientesHandler;
import com.hotclick.service.telegram.TelegramFlujoProductoHandler;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import com.hotclick.service.telegram.TelegramFlujoVentaHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static com.hotclick.dto.TelegramFlujoEstado.FLUJO_ACCION;
import static com.hotclick.dto.TelegramFlujoEstado.FLUJO_PRODUCTO;
import static com.hotclick.dto.TelegramFlujoEstado.FLUJO_VENTA;
import static com.hotclick.service.telegram.TelegramFlujoSupport.BTN_CANCELAR;

/**
 * Máquina de estados de los flujos multi-paso del bot de Telegram para clientes:
 * registrar una venta rápida, dar de alta un producto con fotos, y consultar
 * clientes con sugerencias de cross-sell.
 *
 * TelegramBotUpdateService actúa de router (webhook → vinculación → rate limit)
 * y delega aquí todo callback con prefijo vta:/prd:/cli:/flx: y todo texto o foto
 * cuando el contexto guardado es un borrador JSON (ver TelegramFlujoEstado).
 *
 * Seguridad:
 *  - El router entrega empresaId ya validado (membresía activa revalidada).
 *  - Las operaciones de escritura (venta, producto) exigen PROPIETARIO o ADMIN,
 *    revalidado al INICIAR y al CONFIRMAR (defensa en profundidad).
 *  - Ver clientes también exige PROPIETARIO/ADMIN: expone PII (teléfonos).
 *  - Toda query va parametrizada y filtrada por empresaId.
 *  - Las fotos solo se aceptan en el paso FOTOS del alta de producto; la escritura
 *    del borrador en ese paso usa lock pesimista (un álbum llega como varios
 *    updates simultáneos y sin lock los appends se pisarían).
 *  - Si se cancela un alta con fotos ya subidas, los objetos quedan huérfanos en
 *    S3 (aceptado — mismo comportamiento que el import de catálogo).
 *
 * Los flujos guiados NO dependen de la IA; solo el cross-sell la usa, con
 * fallback SQL si el proveedor está caído.
 *
 * Fachada: enruta a handlers en {@code com.hotclick.service.telegram}. Los métodos
 * {@code @Transactional(REQUIRES_NEW)} y {@code @Async} viven aquí para que el
 * self-proxy de Spring los aplique; los handlers los invocan vía {@code @Lazy}.
 */
@Service
public class TelegramFlujoService {

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private EmpresaRepository             empresaRepository;
    @Autowired private VentaService                  ventaService;
    @Autowired private ProductoService               productoService;
    @Autowired private PedidoService                 pedidoService;
    @Autowired private StockService                  stockService;
    @Autowired private ProductoImagenService         productoImagenService;
    @Autowired private UsuarioService                usuarioService;
    @Autowired private TelegramFlujoSupport          support;
    @Autowired private TelegramFlujoVentaHandler     ventaHandler;
    @Autowired private TelegramFlujoProductoHandler  productoHandler;
    @Autowired private TelegramFlujoClientesHandler  clientesHandler;
    @Autowired private TelegramFlujoAccionHandler    accionHandler;

    /** Self-proxy: @Async y @Transactional(REQUIRES_NEW) no aplican en llamadas internas. */
    @Autowired @Lazy private TelegramFlujoService self;

    // ── Permisos ──────────────────────────────────────────────────────────────

    /**
     * PROPIETARIO o ADMIN de la empresa. Incluye al dueño directo (usuario.empresaId)
     * aunque no tenga fila en miembro_empresa — mismo criterio que empresaValidada.
     */
    public boolean esPropietarioOAdmin(Usuario usuario, Long empresaId) {
        return support.esPropietarioOAdmin(usuario, empresaId);
    }

    // ── Entradas desde el router ──────────────────────────────────────────────

    /** @return true si el callback era de un flujo de este servicio y fue atendido. */
    public boolean manejarCallback(TelegramVinculacion v, Long empresaId, String data) {
        if (BTN_CANCELAR.equals(data)) {
            support.cancelar(v);
            return true;
        }
        if (data.startsWith("vta:")) { ventaHandler.callback(v, empresaId, data.substring(4));    return true; }
        if (data.startsWith("prd:")) { productoHandler.callback(v, empresaId, data.substring(4)); return true; }
        if (data.startsWith("cli:")) { clientesHandler.callback(v, empresaId, data.substring(4)); return true; }
        if (data.startsWith("acn:")) { accionHandler.callback(v, empresaId, data.substring(4));   return true; }
        return false;
    }

    /** Texto libre cuando hay un borrador activo. El router ya filtró comandos (/cancelar, /menu…). */
    public void manejarTexto(TelegramVinculacion v, Long empresaId, String texto) {
        TelegramFlujoEstado e = support.estadoVigente(v);
        if (e == null) return;
        if (FLUJO_VENTA.equals(e.getF()))        ventaHandler.texto(v, empresaId, e, texto);
        else if (FLUJO_PRODUCTO.equals(e.getF())) productoHandler.texto(v, empresaId, e, texto);
        else if (FLUJO_ACCION.equals(e.getF())) {
            bot.enviarMensaje(v.getChatId(), "Tocá *Confirmar* o *Cancelar* arriba, o escribí /cancelar.");
        }
    }

    /**
     * Foto entrante — como foto comprimida (`photo`) o como archivo/documento de
     * imagen (`document` con mime_type image/*, común al mandar desde Telegram
     * Desktop sin comprimir). @return true si se consumió (estábamos en el paso
     * FOTOS del alta de producto); false para que el router aplique el rechazo
     * estándar.
     */
    public boolean manejarFoto(TelegramVinculacion v, Long empresaId, JsonNode msg) {
        return productoHandler.manejarFoto(v, empresaId, msg);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Pedido crearVentaTx(VentaRequestDTO dto, String correoOperador, Long empresaId) {
        return ventaService.crearVenta(dto, correoOperador, empresaId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Usuario crearClienteTx(String nombre, String telefono, Empresa empresa) {
        return usuarioService.crearClienteRapido(nombre, telefono, null, empresa);
    }

    /**
     * Crea el producto + imágenes en una transacción propia (REQUIRES_NEW):
     * si falla, la transacción del webhook sobrevive para responder al usuario
     * con el borrador intacto.
     *
     * Mismo gobierno que el panel (ProductoController.crearProducto): si el
     * negocio ya está aprobado y visible, el producto nace publicado; si sigue
     * pendiente, queda oculto y EmpresaAprobacionService lo publica en bloque
     * al aprobar la empresa. Ya no existe aprobación producto por producto.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Producto crearProductoTx(TelegramFlujoEstado.ProductoBorrador d, Long empresaId, Usuario usuario) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalStateException("Empresa no encontrada"));
        boolean empresaPublicada = "ACTIVO".equals(empresa.getEstadoEmpresa())
            && Boolean.TRUE.equals(empresa.getVisibilidadPublica());

        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setNombreProducto(d.getNom());
        dto.setDescripcionCorta(d.getDesc());
        dto.setPrecioVenta(d.getPv());
        dto.setPrecioCompra(d.getPc());
        dto.setStockActual(d.getStk() != null ? d.getStk() : 0);
        dto.setCategoriaId(d.getCat());
        dto.setMarcaId(d.getMarca());
        dto.setMarcaTexto(d.getMarcaTxt());
        dto.setVisibleCatalogo(empresaPublicada);
        dto.setImagenPrincipalUrl(d.getFotos().isEmpty() ? null : d.getFotos().get(0));

        Producto producto = productoService.crearProducto(dto, usuario.getCorreo(), empresa);
        productoImagenService.sincronizar(producto.getId(), d.getFotos());

        return producto;
    }

    /**
     * Cross-sell con IA fuera del hilo del webhook (la IA puede tardar hasta 25s).
     * Si el proveedor está caído cae al fallback SQL: productos con stock de las
     * categorías que el cliente ya compró y que aún no tiene.
     */
    @Async
    public void sugerirCrossSellAsync(Long chatId, Long empresaId, Long clienteId) {
        clientesHandler.ejecutarCrossSell(chatId, empresaId, clienteId);
    }

    /**
     * Registra una acción propuesta por el chat de IA como el borrador pendiente del
     * chat (mismo slot único que venta/producto/ajuste) y la muestra con botones
     * Confirmar/Cancelar. Nunca la ejecuta — eso solo pasa si el usuario confirma.
     */
    public void proponerAccion(TelegramVinculacion v, AccionPropuestaTelegram accion) {
        accionHandler.proponerAccion(v, accion);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Pedido cambiarEstadoPedidoTx(Long pedidoId, String nuevoEstado, String nota) {
        return pedidoService.cambiarEstado(pedidoId, nuevoEstado, nota);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Pedido asignarGuiaTx(Long pedidoId, String numeroGuia) {
        return pedidoService.asignarGuia(pedidoId, numeroGuia);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ajustarStockTx(Long productoId, int cantidadReal, String operadorCorreo) {
        stockService.ajustarAExistencia(productoId, cantidadReal, "telegram-ia", operadorCorreo);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void aplicarOfertaTx(Long productoId, boolean enOferta, Integer porcentajeDescuento, Integer precioOferta) {
        productoService.aplicarOferta(productoId, enOferta, porcentajeDescuento, precioOferta);
    }
}
