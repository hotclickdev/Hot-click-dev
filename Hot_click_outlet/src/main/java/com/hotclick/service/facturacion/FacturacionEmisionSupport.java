package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ClaveNumericaService;
import com.hotclick.service.ConsecutivoFiscalService;
import com.hotclick.service.hacienda.CodigoCabys;
import com.hotclick.service.hacienda.CalculadoraIva;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.HaciendaLogSanitizer;
import com.hotclick.service.hacienda.ImpuestoLinea;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FacturacionEmisionSupport {

    private static final Logger log = LoggerFactory.getLogger(FacturacionEmisionSupport.class);

    /**
     * Estados que bloquean otra emisión para el mismo pedido o compra. ERROR cuenta: el comprobante
     * ya tiene clave y consecutivo y la contingencia lo sigue reenviando; emitir otro duplicaría la venta.
     */
    static final List<String> ESTADOS_ACTIVOS = List.of(
        ComprobanteFiscal.ESTADO_PENDIENTE,
        ComprobanteFiscal.ESTADO_PENDIENTE_CONFIG,
        ComprobanteFiscal.ESTADO_ENVIADO,
        ComprobanteFiscal.ESTADO_ACEPTADO,
        ComprobanteFiscal.ESTADO_ERROR);

    private final ComprobanteFiscalRepository comprobanteRepo;
    private final ConsecutivoFiscalService consecutivoService;
    private final ClaveNumericaService claveService;
    private final CompanyScope companyScope;
    private final PedidoRepository pedidoRepository;
    private final EmpresaRepository empresaRepository;

    public FacturacionEmisionSupport(ComprobanteFiscalRepository comprobanteRepo,
                                     ConsecutivoFiscalService consecutivoService,
                                     ClaveNumericaService claveService,
                                     CompanyScope companyScope,
                                     PedidoRepository pedidoRepository,
                                     EmpresaRepository empresaRepository) {
        this.comprobanteRepo    = comprobanteRepo;
        this.consecutivoService = consecutivoService;
        this.claveService       = claveService;
        this.companyScope       = companyScope;
        this.pedidoRepository   = pedidoRepository;
        this.empresaRepository  = empresaRepository;
    }

    @Transactional
    public ComprobanteFiscal emitir(Pedido pedido, String tipo) {
        com.hotclick.service.FacturacionService.exigirNoPrueba(pedido);
        // Área 7 N1: solo el admin de HotClick emite, siempre a nombre de HotClick.
        if (!companyScope.isAdminIT()) {
            throw new org.springframework.security.access.AccessDeniedException(
                "Solo el admin de HotClick puede emitir comprobantes.");
        }
        if (pedido.getEmpresa() == null) {
            throw new IllegalStateException("El pedido no tiene empresa asociada");
        }

        Long pedidoId = pedido.getId();
        if (comprobanteRepo.existsByPedidoIdAndEstadoIn(pedidoId, ESTADOS_ACTIVOS)) {
            throw new IllegalStateException("Ya existe un comprobante activo para el pedido " + pedidoId);
        }

        Empresa empresa = empresaPlataforma();
        String tipoFinal = (tipo != null && !tipo.isBlank()) ? tipo : ComprobanteFiscal.TIPO_TIQUETE;
        exigirTipoCoherenteConCobro(pedido, empresa, tipoFinal);
        String cedulaEmisor = exigirCedulaEmisor(empresa);

        long numSeq = consecutivoService.siguienteNumero(empresa.getId(), tipoFinal);
        String numConsecutivo = ClaveNumericaService.buildNumeroConsecutivo(tipoFinal, numSeq);

        String clave = claveService.generar(cedulaEmisor, numConsecutivo, LocalDateTime.now(Constants.ZONA_CR));

        ComprobanteFiscal cf = new ComprobanteFiscal();
        cf.setEmpresa(empresa);
        cf.setPedido(pedido);
        cf.setTipo(tipoFinal);
        cf.setClaveNumerica(clave);
        cf.setNumeroConsecutivo(numConsecutivo);
        cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE);
        cf.setAmbiente(empresa.getAmbienteHacienda());
        // M4: el total sale de la misma regla que arma el XML (CalculadoraIva), no de totalPedido.
        aplicarTotales(cf, List.of(pedido), empresa, ComprobanteFiscal.TIPO_FACTURA.equals(tipoFinal));
        cf = comprobanteRepo.save(cf);

        log.info("[facturacion] Comprobante creado id={} clave={} tipo={} empresa={} ambiente={}",
            cf.getId(), HaciendaLogSanitizer.clave(clave), tipoFinal, empresa.getId(), empresa.getAmbienteHacienda());

        return cf;
    }

    /**
     * Un tiquete (tipo 04) de la empresa plataforma por compra confirmada.
     * No reserva consecutivo si falta CAByS. Si ya hay un comprobante activo, lo devuelve.
     * El llamador de sistema no pasa por CompanyScope: el pago ya fue autorizado.
     */
    @Transactional
    public ComprobanteFiscal emitirTiqueteDeCompra(Long compraId) {
        Optional<ComprobanteFiscal> existente =
            comprobanteRepo.findFirstByCompra_IdAndEstadoIn(compraId, ESTADOS_ACTIVOS);
        if (existente.isPresent()) {
            return existente.get();
        }

        List<Pedido> pedidos = pedidoRepository.findByCompra_IdOrderByNumeroPaqueteAsc(compraId);
        // Área 7 N2: un pedido cobrado en modo prueba nunca se factura ante Hacienda.
        if (pedidos != null && pedidos.stream().anyMatch(Pedido::isEsPrueba)) {
            log.info("[facturacion] compra={} es de prueba — no se emite el tiquete", compraId);
            return null;
        }

        if (pedidos == null || pedidos.isEmpty() || !lineasListas(pedidos)) {
            log.warn("[facturacion] compra={} sin líneas con CAByS — no se emite el tiquete", compraId);
            return null;
        }

        Empresa emisor = empresaPlataforma();
        String cedulaEmisor = exigirCedulaEmisor(emisor);

        long numSeq = consecutivoService.siguienteNumero(emisor.getId(), ComprobanteFiscal.TIPO_TIQUETE);
        String numConsecutivo = ClaveNumericaService.buildNumeroConsecutivo(
            ComprobanteFiscal.TIPO_TIQUETE, numSeq);
        String clave = claveService.generar(cedulaEmisor, numConsecutivo, LocalDateTime.now(Constants.ZONA_CR));

        ComprobanteFiscal cf = new ComprobanteFiscal();
        cf.setEmpresa(emisor);
        cf.setCompra(pedidos.get(0).getCompra());
        cf.setTipo(ComprobanteFiscal.TIPO_TIQUETE);
        cf.setClaveNumerica(clave);
        cf.setNumeroConsecutivo(numConsecutivo);
        cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE);
        cf.setAmbiente(emisor.getAmbienteHacienda());
        copiarReceptor(cf, pedidos.get(0).getUsuarioFinal());
        aplicarTotales(cf, pedidos);
        cf = comprobanteRepo.save(cf);

        log.info("[facturacion] Tiquete de compra creado id={} compra={} clave={}",
            cf.getId(), compraId, HaciendaLogSanitizer.clave(clave));
        return cf;
    }

    private Empresa empresaPlataforma() {
        return empresaRepository.findById(Constants.EMPRESA_PLATAFORMA_ID)
            .orElseThrow(() -> new IllegalStateException(
                "No existe la empresa plataforma para emitir el comprobante"));
    }

    /** Área 7 BAJO: sin cédula del emisor no se reserva consecutivo ni se arma una clave de relleno. */
    static String exigirCedulaEmisor(Empresa emisor) {
        return com.hotclick.service.hacienda.CedulaEmisor.normalizar(emisor.getCedulaJuridica());
    }

    private boolean lineasListas(List<Pedido> pedidos) {
        boolean alguna = false;
        for (Pedido pedido : pedidos) {
            Hibernate.initialize(pedido.getItems());
            if (pedido.getItems() == null) return false;
            for (PedidoItem item : pedido.getItems()) {
                alguna = true;
                Hibernate.initialize(item.getProducto());
                Producto producto = item.getProducto();
                if (producto == null || !CodigoCabys.valido(producto.getCodigoCabys())) return false;
            }
        }
        return alguna;
    }

    /**
     * M4: en régimen simplificado la factura cobra precio + IVA y el tiquete cobra el precio tal cual.
     * Si el tipo pedido no coincide con lo que se le cobró al cliente, el XML no cuadraría con el cobro.
     */
    static void exigirTipoCoherenteConCobro(Pedido pedido, Empresa empresa, String tipo) {
        if (!CalculadoraIva.SIMPLIFICADO.equals(CalculadoraIva.regimen(empresa))) return;
        long ivaCobrado = pedido.getMontoImpuesto() != null ? pedido.getMontoImpuesto() : 0;
        boolean esFactura = ComprobanteFiscal.TIPO_FACTURA.equals(tipo);
        long ivaFactura = CalculadoraIva.ivaACobrar(empresa, true,
            CalculadoraIva.lineasDe(pedido), CalculadoraIva.descuentoDe(pedido));
        if (esFactura && ivaCobrado != ivaFactura) {
            throw new IllegalStateException(
                "Esta venta se cobró sin el IVA de la factura. En régimen simplificado solo podés emitirle tiquete electrónico.");
        }
        if (!esFactura && ivaCobrado > 0) {
            throw new IllegalStateException(
                "Esta venta se cobró con IVA para factura electrónica. Emití la factura (tipo 01), no un tiquete.");
        }
    }

    private static void aplicarTotales(ComprobanteFiscal cf, List<Pedido> pedidos) {
        aplicarTotales(cf, pedidos, cf.getEmpresa(), ComprobanteFiscal.TIPO_FACTURA.equals(cf.getTipo()));
    }

    private static void aplicarTotales(ComprobanteFiscal cf, List<Pedido> pedidos, Empresa empresa, boolean esFactura) {
        CalculadoraIva.Resumen r = CalculadoraIva.resumen(empresa, esFactura, pedidos);
        cf.setTotalNeto(Math.toIntExact(r.ventaNeta()));
        cf.setTotalImpuesto(Math.toIntExact(r.impuesto()));
        cf.setTotalFactura(Math.toIntExact(r.totalComprobante()));
    }

    static void copiarReceptor(ComprobanteFiscal cf, Usuario usuario) {
        if (usuario == null) return;
        String cedula = com.hotclick.utils.CedulaCr.realONulo(usuario.getIdentificacion());
        if (cedula == null) return; // #318: identificación interna (REG-/EMP-/…) ≠ receptor
        cf.setReceptorCedula(cedula);
        cf.setReceptorTipo(tipoIdentificacion(cedula));
        cf.setReceptorNombre(nombreReceptor(usuario));
        cf.setReceptorCorreo(usuario.getCorreo());
    }

    private static String tipoIdentificacion(String cedula) {
        return switch (cedula.length()) {
            case 9 -> "01";
            case 10 -> "02";
            default -> "03";
        };
    }

    private static String nombreReceptor(Usuario usuario) {
        String nombre = usuario.getNombre() != null ? usuario.getNombre() : "";
        String apellido = usuario.getApellidoPaterno() != null ? " " + usuario.getApellidoPaterno() : "";
        String completo = (nombre + apellido).trim();
        return completo.isEmpty() ? "Consumidor final" : completo;
    }
}
