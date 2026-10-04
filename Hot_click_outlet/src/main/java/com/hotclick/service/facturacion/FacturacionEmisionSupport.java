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

    private static final List<String> ESTADOS_ACTIVOS = List.of(
        ComprobanteFiscal.ESTADO_PENDIENTE,
        ComprobanteFiscal.ESTADO_ENVIADO,
        ComprobanteFiscal.ESTADO_ACEPTADO);

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
        Empresa empresa = pedido.getEmpresa();
        if (empresa == null) {
            throw new IllegalStateException("El pedido no tiene empresa asociada");
        }
        companyScope.assertCanAccess(empresa.getId());

        Long pedidoId = pedido.getId();
        if (comprobanteRepo.existsByPedidoIdAndEstadoIn(pedidoId, ESTADOS_ACTIVOS)) {
            throw new IllegalStateException("Ya existe un comprobante activo para el pedido " + pedidoId);
        }

        String tipoFinal = (tipo != null && !tipo.isBlank()) ? tipo : ComprobanteFiscal.TIPO_TIQUETE;

        long numSeq = consecutivoService.siguienteNumero(empresa.getId(), tipoFinal);
        String numConsecutivo = ClaveNumericaService.buildNumeroConsecutivo(tipoFinal, numSeq);

        String cedulaEmisor = empresa.getCedulaJuridica() != null
            ? empresa.getCedulaJuridica() : "000000000000";
        String clave = claveService.generar(cedulaEmisor, numConsecutivo, LocalDateTime.now(Constants.ZONA_CR));

        ComprobanteFiscal cf = new ComprobanteFiscal();
        cf.setEmpresa(empresa);
        cf.setPedido(pedido);
        cf.setTipo(tipoFinal);
        cf.setClaveNumerica(clave);
        cf.setNumeroConsecutivo(numConsecutivo);
        cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE);
        cf.setAmbiente(empresa.getAmbienteHacienda());
        cf.setTotalFactura(pedido.getTotalPedido());
        cf = comprobanteRepo.save(cf);

        log.info("[facturacion] Comprobante creado id={} clave={} tipo={} empresa={} ambiente={}",
            cf.getId(), clave, tipoFinal, empresa.getId(), empresa.getAmbienteHacienda());

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
        if (pedidos == null || pedidos.isEmpty() || !lineasListas(pedidos)) {
            log.warn("[facturacion] compra={} sin líneas con CAByS — no se emite el tiquete", compraId);
            return null;
        }

        Empresa emisor = empresaRepository.findById(Constants.EMPRESA_PLATAFORMA_ID)
            .orElseThrow(() -> new IllegalStateException(
                "No existe la empresa plataforma para emitir el tiquete"));

        long numSeq = consecutivoService.siguienteNumero(emisor.getId(), ComprobanteFiscal.TIPO_TIQUETE);
        String numConsecutivo = ClaveNumericaService.buildNumeroConsecutivo(
            ComprobanteFiscal.TIPO_TIQUETE, numSeq);
        String cedulaEmisor = emisor.getCedulaJuridica() != null ? emisor.getCedulaJuridica() : "000000000000";
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
            cf.getId(), compraId, clave);
        return cf;
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

    private static void aplicarTotales(ComprobanteFiscal cf, List<Pedido> pedidos) {
        long base = 0;
        long impuesto = 0;
        for (Pedido pedido : pedidos) {
            for (PedidoItem item : pedido.getItems()) {
                long precio = item.getPrecioUnitarioMomento() != null ? item.getPrecioUnitarioMomento() : 0L;
                ImpuestoLinea.Montos montos = ImpuestoLinea.de(
                    precio, item.getCantidad(), item.getProducto().getPorcentajeIva());
                base += montos.base();
                impuesto += montos.impuesto();
            }
        }
        cf.setTotalNeto(Math.toIntExact(base));
        cf.setTotalImpuesto(Math.toIntExact(impuesto));
        cf.setTotalFactura(Math.toIntExact(base + impuesto));
    }

    private static void copiarReceptor(ComprobanteFiscal cf, Usuario usuario) {
        if (usuario == null || usuario.getIdentificacion() == null) return;
        String cedula = usuario.getIdentificacion().replaceAll("[^0-9]", "");
        if (!cedula.matches("\\d{9,12}")) return;
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
