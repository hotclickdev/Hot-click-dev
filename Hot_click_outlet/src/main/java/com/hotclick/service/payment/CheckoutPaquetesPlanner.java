package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Divide un carrito en paquetes: uno por bodega de origen. Cada paquete se despacha por separado
 * y lleva su propia forma de entrega y su propio costo de envío.
 */
@Service
public class CheckoutPaquetesPlanner {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.repository.BodegaRepository bodegaRepository;

    public CheckoutPaquetesPlanner() {}

    CheckoutPaquetesPlanner(com.hotclick.repository.BodegaRepository bodegaRepository) {
        this.bodegaRepository = bodegaRepository;
    }

    /** Respaldo cuando no hay bodega default: la primera bodega activa del negocio del producto. */
    private Bodega primeraBodegaActivaDeSuTienda(Producto p) {
        if (bodegaRepository == null || p.getEmpresa() == null || p.getEmpresa().getId() == null) return null;
        List<Bodega> activas = bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(
            p.getEmpresa().getId(), Constants.ESTADO_ACTIVO);
        return activas == null || activas.isEmpty() ? null : activas.get(0);
    }

    public record Paquete(Bodega bodega, List<PaymentCheckoutRequest.ItemDTO> items,
                          int subtotal, int costoTotal, String metodoEnvio, String notas,
                          List<com.hotclick.service.hacienda.CalculadoraIva.Linea> lineasIva) {
        public Paquete(Bodega bodega, List<PaymentCheckoutRequest.ItemDTO> items,
                       int subtotal, int costoTotal, String metodoEnvio, String notas) {
            this(bodega, items, subtotal, costoTotal, metodoEnvio, notas, List.of());
        }
    }

    public List<Paquete> planificar(PaymentCheckoutRequest req, Map<Long, Producto> productos, Bodega bodegaDefault) {
        // MED-5: cantón que no es de la provincia (o solo uno de los dos) = 400 antes de cobrar nada.
        // BAJO #447: con envío (no retiro) el destino es obligatorio.
        com.hotclick.service.envio.DestinoEnvio.exigir(req.getProvincia(), req.getCanton(),
            !CheckoutOrderFactory.esRetiro(req.getMetodoEnvio()));
        Map<Long, Bodega> bodegas = new LinkedHashMap<>();
        Map<Long, List<PaymentCheckoutRequest.ItemDTO>> itemsPorBodega = new LinkedHashMap<>();
        // Paquetes cuyo origen no es una bodega propia del producto ni de su tienda (la resolvió el backend).
        java.util.Set<Long> sinBodegaPropia = new java.util.HashSet<>();
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productos.get(item.getProductoId());
            Bodega origen = bodegaDeOrigen(p, bodegaDefault);
            boolean propia = origen != null && (p.getBodega() != null
                || (p.getEmpresa() != null && p.getEmpresa().getBodegaVentaOnline() != null));
            if (origen == null) origen = primeraBodegaActivaDeSuTienda(p);
            if (origen == null) {
                throw new IllegalStateException("El producto " + (p.getNombreProducto() != null ? p.getNombreProducto() : p.getId())
                    + " no tiene bodega de despacho configurada. Escribinos para coordinar tu pedido.");
            }
            bodegas.putIfAbsent(origen.getId(), origen);
            // MED-3 (a) Auditor 3: un producto sin bodega propia que despacha desde la bodega de venta online de su
            // tienda llega del front como "sin-bodega" (bodegaId ausente): también toma ese envío.
            if (!propia || p.getBodega() == null) sinBodegaPropia.add(origen.getId());
            itemsPorBodega.computeIfAbsent(origen.getId(), k -> new ArrayList<>()).add(item);
        }

        List<Paquete> paquetes = new ArrayList<>();
        for (Map.Entry<Long, List<PaymentCheckoutRequest.ItemDTO>> e : itemsPorBodega.entrySet()) {
            int subtotal = 0;
            int costoTotal = 0;
            List<com.hotclick.service.hacienda.CalculadoraIva.Linea> lineasIva = new ArrayList<>();
            for (PaymentCheckoutRequest.ItemDTO item : e.getValue()) {
                Producto p = productos.get(item.getProductoId());
                int precio = item.getPrecioUnitarioOverride() != null ? item.getPrecioUnitarioOverride() : OrderPricingService.precioEfectivo(p);
                int costo = p.getPrecioCompra() != null ? p.getPrecioCompra() : 0;
                subtotal += precio * item.getCantidad();
                costoTotal += costo * item.getCantidad();
                lineasIva.add(new com.hotclick.service.hacienda.CalculadoraIva.Linea(
                    precio, item.getCantidad(), p.getPorcentajeIva()));
            }
            Bodega bodegaPaquete = bodegas.get(e.getKey());
            PaymentCheckoutRequest.EnvioPaqueteDTO envio = envioDe(req, e.getKey(), sinBodegaPropia.contains(e.getKey()));
            String metodo = OrderPricingService.metodoNormalPorDestino(envio != null ? envio.getMetodoEnvio()
                : req.getMetodoEnvio() != null ? req.getMetodoEnvio() : Constants.ENVIO_RETIRO,
                req.getProvincia(), req.getCanton());
            String notas = envio != null && envio.getNotas() != null && !envio.getNotas().isBlank()
                ? envio.getNotas() : req.getNotas();
            paquetes.add(new Paquete(bodegaPaquete, e.getValue(), subtotal, costoTotal, metodo, notas, List.copyOf(lineasIva)));
        }
        // NO APTO #448: el método top-level puede ser retiro/null y algún paquete de envios[] ir a domicilio;
        // si CUALQUIER paquete planificado no es retiro, el destino es obligatorio (no se guarda FUERA_GAM sin cantón).
        if (paquetes.stream().anyMatch(pq -> !CheckoutOrderFactory.esRetiro(pq.metodoEnvio()))) {
            com.hotclick.service.envio.DestinoEnvio.exigir(req.getProvincia(), req.getCanton(), true);
        }
        return paquetes;
    }

    /** Bodega del producto; si no tiene, la de venta online de su tienda; si tampoco, HotClick coordina. */
    public static Bodega bodegaDeOrigen(Producto p, Bodega bodegaDefault) {
        if (p.getBodega() != null) return p.getBodega();
        if (p.getEmpresa() != null && p.getEmpresa().getBodegaVentaOnline() != null) {
            return p.getEmpresa().getBodegaVentaOnline();
        }
        return bodegaDefault;
    }

    /**
     * Envío del paquete: primero el que trae el id de su bodega. Si el paquete no tiene bodega propia (el front lo
     * manda como "sin-bodega", {@code bodegaId} ausente) se usa el envío sin {@code bodegaId}. Un paquete con
     * bodega real nunca toma el envío sin id.
     */
    private static PaymentCheckoutRequest.EnvioPaqueteDTO envioDe(PaymentCheckoutRequest req, Long bodegaId,
                                                                 boolean sinBodegaPropia) {
        if (req.getEnvios() == null) return null;
        PaymentCheckoutRequest.EnvioPaqueteDTO porId = req.getEnvios().stream()
            .filter(en -> en != null && bodegaId.equals(en.getBodegaId()))
            .findFirst().orElse(null);
        if (porId != null || !sinBodegaPropia) return porId;
        return req.getEnvios().stream()
            .filter(en -> en != null && en.getBodegaId() == null)
            .findFirst().orElse(null);
    }
}
