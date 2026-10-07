package com.hotclick.service.consola;

import com.hotclick.model.MetodoCobro;
import com.hotclick.model.Pedido;
import com.hotclick.model.PayoutRequest;
import com.hotclick.model.SolicitudRecoleccion;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.repository.PayoutRequestRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.SolicitudRecoleccionRepository;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.AggregatorService.Liquidacion;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class QuincenaAdminService {

    static final List<String> ESTADOS = List.of("PAGADO", "ENVIADO", "ENTREGADO", "LISTO");

    private final PedidoRepository pedidoRepo;
    private final AggregatorService aggregator;
    private final MetodoCobroRepository metodoRepo;
    private final PayoutRequestRepository payoutRepo;
    private final SolicitudRecoleccionRepository recoleccionRepo;

    public QuincenaAdminService(PedidoRepository pedidoRepo,
                                AggregatorService aggregator,
                                MetodoCobroRepository metodoRepo,
                                PayoutRequestRepository payoutRepo,
                                SolicitudRecoleccionRepository recoleccionRepo) {
        this.pedidoRepo = pedidoRepo;
        this.aggregator = aggregator;
        this.metodoRepo = metodoRepo;
        this.payoutRepo = payoutRepo;
        this.recoleccionRepo = recoleccionRepo;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> periodo(LocalDate desde, LocalDate hasta) {
        LocalDateTime ini = desde.atStartOfDay();
        LocalDateTime finExclusivo = hasta.plusDays(1).atStartOfDay();
        List<Pedido> pedidos = pedidoRepo.findConEmpresaEnPeriodo(ini, finExclusivo, ESTADOS);
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("desde", desde);
        salida.put("hasta", hasta);
        salida.put("lineas", lineas(pedidos, ini, finExclusivo));
        return salida;
    }

    public static LocalDate inicioHoy() {
        return QuincenaCalculo.inicio(LocalDate.now(Constants.ZONA_CR));
    }

    public static LocalDate finHoy() {
        return QuincenaCalculo.fin(LocalDate.now(Constants.ZONA_CR));
    }

    private List<Map<String, Object>> lineas(List<Pedido> pedidos, LocalDateTime ini, LocalDateTime fin) {
        Map<Long, Long> efectivo = efectivoPorEmpresa(ini, fin);
        Map<Long, Boolean> girado = giradoPorEmpresa(ini, fin);
        Map<String, Acumulado> grupos = new LinkedHashMap<>();
        for (Pedido pedido : pedidos) {
            sumar(grupos, pedido, efectivo);
        }
        List<Map<String, Object>> filas = new ArrayList<>();
        grupos.forEach((clave, acumulado) -> filas.add(fila(acumulado, girado.getOrDefault(acumulado.empresaId, false))));
        return filas;
    }

    private void sumar(Map<String, Acumulado> grupos, Pedido pedido, Map<Long, Long> efectivo) {
        if (pedido.getEmpresaId() == null || pedido.getFechaPedido() == null) return;
        String clave = pedido.getEmpresaId() + "|" + pedido.getFechaPedido().toLocalDate();
        Acumulado acumulado = grupos.computeIfAbsent(clave, k -> nuevo(pedido, efectivo));
        long total = pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0L;
        long envio = pedido.getCostoEnvio() != null ? pedido.getCostoEnvio() : 0L;
        Liquidacion liquidacion = aggregator.liquidar(pedido.getEmpresaId(), total, envio);
        boolean esEfectivo = esEfectivo(pedido.getMetodoPago());
        acumulado.productos += Math.max(0L, total - liquidacion.envio());
        acumulado.comision += liquidacion.detalle().resultado().totalComision();
        acumulado.envio += liquidacion.envio();
        acumulado.neto += liquidacion.neto();
        acumulado.pasarela += liquidacion.detalle().resultado().comisionGw();
        acumulado.operar += liquidacion.detalle().resultado().comisionSaas();
        if (esEfectivo) acumulado.efectivoPedidos += total;
        else acumulado.netoBanco += liquidacion.neto();
        acumulado.plan = liquidacion.detalle().plan();
        acumulado.porcentaje = liquidacion.detalle().porcentaje();
    }

    private Acumulado nuevo(Pedido pedido, Map<Long, Long> efectivo) {
        Acumulado acumulado = new Acumulado();
        acumulado.empresaId = pedido.getEmpresaId();
        acumulado.nombre = pedido.getNombreNegocio();
        acumulado.dia = pedido.getFechaPedido().toLocalDate();
        acumulado.efectivoAnotado = efectivo.get(pedido.getEmpresaId());
        acumulado.cuenta = cuentaDe(pedido.getEmpresaId(), acumulado.dia);
        return acumulado;
    }

    private Map<String, Object> fila(Acumulado acumulado, boolean girado) {
        boolean efectivo = acumulado.efectivoPedidos > 0;
        boolean cuadra = !efectivo || (acumulado.efectivoAnotado != null
            && acumulado.efectivoAnotado == acumulado.efectivoPedidos);
        boolean sale = QuincenaCalculo.saleDelBanco(false, acumulado.cuenta.aprobada(),
            acumulado.cuenta.nueva(), cuadra, acumulado.netoBanco);
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("empresaId", acumulado.empresaId);
        mapa.put("nombre", acumulado.nombre);
        mapa.put("dia", acumulado.dia);
        mapa.put("plan", acumulado.plan);
        mapa.put("porcentaje", acumulado.porcentaje);
        mapa.put("productos", acumulado.productos);
        mapa.put("comision", acumulado.comision);
        mapa.put("envio", acumulado.envio);
        mapa.put("neto", acumulado.neto);
        mapa.put("pasarela", acumulado.pasarela);
        mapa.put("operar", acumulado.operar);
        mapa.put("aGirar", sale && !girado ? acumulado.netoBanco : 0);
        mapa.put("saleDelBanco", sale && !girado);
        mapa.put("girado", girado);
        mapa.put("marcado", efectivo && !cuadra);
        mapa.put("cuentaNueva", acumulado.cuenta.nueva());
        mapa.put("cuentaAprobada", acumulado.cuenta.aprobada());
        return mapa;
    }

    private Cuenta cuentaDe(Long empresaId, LocalDate dia) {
        List<MetodoCobro> activos = metodoRepo.findActivosByEmpresaId(empresaId);
        MetodoCobro cuenta = activos.stream().filter(m -> !m.isEnRevision()).findFirst().orElse(null);
        if (cuenta == null) return new Cuenta(false, false);
        return new Cuenta(true, QuincenaCalculo.registradaEnQuincena(cuenta.getFechaCreacion(), dia));
    }

    private Map<Long, Long> efectivoPorEmpresa(LocalDateTime ini, LocalDateTime fin) {
        Map<Long, Long> totales = new LinkedHashMap<>();
        for (SolicitudRecoleccion fila : recoleccionRepo.findAllConEmpresa()) {
            if (fila.getEmpresa() == null || fila.getEfectivoAnotado() == null || fila.getFechaCreacion() == null) continue;
            if (fila.getFechaCreacion().isBefore(ini) || !fila.getFechaCreacion().isBefore(fin)) continue;
            totales.merge(fila.getEmpresa().getId(), fila.getEfectivoAnotado().longValue(), Long::sum);
        }
        return totales;
    }

    private Map<Long, Boolean> giradoPorEmpresa(LocalDateTime ini, LocalDateTime fin) {
        Map<Long, Boolean> girado = new LinkedHashMap<>();
        for (PayoutRequest fila : payoutRepo.findByEstadoOrderByFechaSolicitudAsc(PayoutRequest.PAGADO)) {
            if (fila.getFechaPago() == null) continue;
            if (!fila.getFechaPago().isBefore(ini) && fila.getFechaPago().isBefore(fin)) {
                girado.put(fila.getEmpresaId(), true);
            }
        }
        return girado;
    }

    static boolean esEfectivo(String metodo) {
        if (metodo == null) return false;
        String normal = metodo.trim().toUpperCase();
        return "EFECTIVO".equals(normal) || "CONTRA_ENTREGA".equals(normal) || "CONTRAENTREGA".equals(normal);
    }

    private static final class Acumulado {
        private Long empresaId;
        private String nombre;
        private LocalDate dia;
        private String plan;
        private Object porcentaje;
        private long productos;
        private long comision;
        private long envio;
        private long neto;
        private long pasarela;
        private long operar;
        private long efectivoPedidos;
        private long netoBanco;
        private Long efectivoAnotado;
        private Cuenta cuenta = new Cuenta(false, false);
    }

    private record Cuenta(boolean aprobada, boolean nueva) {}
}
