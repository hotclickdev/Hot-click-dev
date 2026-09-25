package com.hotclick.service.analytics;

import com.hotclick.model.AdsGastoDiario;
import com.hotclick.model.AdsInsightDiario;
import com.hotclick.model.AtribucionPedido;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.AdsGastoDiarioRepository;
import com.hotclick.repository.AdsInsightDiarioRepository;
import com.hotclick.repository.AtribucionPedidoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * ROAS / CAC / LTV y alertas de fatiga creativa a partir de atribución + gasto.
 */
@Service
public class AdsMetricasService {

    private static final Set<String> ESTADOS_PAGADOS = Set.of(
        Constants.PEDIDO_PAGADO,
        Constants.PEDIDO_CONFIRMADO,
        Constants.PEDIDO_PREPARANDO,
        Constants.PEDIDO_EN_PREPARACION,
        Constants.PEDIDO_ENVIADO,
        Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENTREGADO,
        Constants.PEDIDO_COMPLETADO
    );

    private static final BigDecimal FRECUENCIA_FATIGA = new BigDecimal("2.5");
    private static final BigDecimal SHARE_DOMINANTE = new BigDecimal("0.70");

    private final AtribucionPedidoRepository atribucionRepo;
    private final AdsGastoDiarioRepository gastoRepo;
    private final AdsInsightDiarioRepository insightRepo;
    private final PedidoRepository pedidoRepository;
    private final EmpresaRepository empresaRepository;

    public AdsMetricasService(
            AtribucionPedidoRepository atribucionRepo,
            AdsGastoDiarioRepository gastoRepo,
            AdsInsightDiarioRepository insightRepo,
            PedidoRepository pedidoRepository,
            EmpresaRepository empresaRepository) {
        this.atribucionRepo = atribucionRepo;
        this.gastoRepo = gastoRepo;
        this.insightRepo = insightRepo;
        this.pedidoRepository = pedidoRepository;
        this.empresaRepository = empresaRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> resumen(Long empresaId, LocalDate desde, LocalDate hasta, int ventanaDias) {
        LocalDateTime desdeDt = desde.atStartOfDay();
        LocalDateTime hastaDt = hasta.plusDays(1).atStartOfDay();
        List<AtribucionPedido> atribs = atribucionRepo.findPagadosEnPeriodo(empresaId, desdeDt, hastaDt);

        int ingresosAtribuidos = 0;
        int utilidadAtribuida = 0;
        int pedidosAtribuidos = 0;
        Map<String, CampanaAgg> porCampana = new LinkedHashMap<>();
        Set<Long> clientesPrimerPedido = new HashSet<>();

        for (AtribucionPedido a : atribs) {
            Pedido p = a.getPedido();
            if (p == null || !ESTADOS_PAGADOS.contains(p.getEstadoPedido())) continue;
            if (!dentroVentana(a, p.getFechaPedido(), ventanaDias)) continue;

            int total = nz(p.getTotalPedido());
            int utilidad = nz(p.getUtilidadBruta());
            ingresosAtribuidos += total;
            utilidadAtribuida += utilidad;
            pedidosAtribuidos++;

            String campana = a.campanaEfectiva();
            CampanaAgg agg = porCampana.computeIfAbsent(campana, CampanaAgg::new);
            agg.ingresos += total;
            agg.utilidad += utilidad;
            agg.pedidos++;

            Usuario u = p.getUsuarioFinal();
            if (u != null && esPrimerPedidoPagado(u.getId(), p.getId(), p.getEmpresa() != null ? p.getEmpresa().getId() : null, p.getFechaPedido())) {
                clientesPrimerPedido.add(u.getId());
                agg.nuevosClientes++;
            }
        }

        List<AdsGastoDiario> gastos = gastoRepo.findParaMetricas(empresaId, desde, hasta);
        int gastoTotal = 0;
        Map<String, Integer> gastoPorCampana = new HashMap<>();
        for (AdsGastoDiario g : gastos) {
            int m = nz(g.getMontoCrc());
            gastoTotal += m;
            gastoPorCampana.merge(g.getCampana(), m, Integer::sum);
        }

        Integer roasIngresos = gastoTotal > 0 ? ratio(ingresosAtribuidos, gastoTotal) : null;
        Integer roasUtilidad = gastoTotal > 0 ? ratio(utilidadAtribuida, gastoTotal) : null;
        Integer cac = (gastoTotal > 0 && !clientesPrimerPedido.isEmpty())
            ? gastoTotal / clientesPrimerPedido.size()
            : null;

        int ltv90 = calcularLtv90(clientesPrimerPedido, empresaId);

        // Control sin atribución: ingresos totales del período ÷ gasto
        int ingresosTotales = sumarIngresosPeriodo(empresaId, desdeDt, hastaDt);
        Integer roasBlended = gastoTotal > 0 ? ratio(ingresosTotales, gastoTotal) : null;

        List<Map<String, Object>> campanas = new ArrayList<>();
        for (CampanaAgg agg : porCampana.values()) {
            int gastoC = gastoPorCampana.getOrDefault(agg.nombre, 0);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("campana", agg.nombre);
            row.put("pedidos", agg.pedidos);
            row.put("ingresos", agg.ingresos);
            row.put("utilidad", agg.utilidad);
            row.put("nuevosClientes", agg.nuevosClientes);
            row.put("gasto", gastoC > 0 ? gastoC : null);
            row.put("roasIngresos", gastoC > 0 ? ratio(agg.ingresos, gastoC) : null);
            row.put("roasUtilidad", gastoC > 0 ? ratio(agg.utilidad, gastoC) : null);
            campanas.add(row);
        }
        for (Map.Entry<String, Integer> e : gastoPorCampana.entrySet()) {
            if (porCampana.containsKey(e.getKey())) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("campana", e.getKey());
            row.put("pedidos", 0);
            row.put("ingresos", 0);
            row.put("utilidad", 0);
            row.put("nuevosClientes", 0);
            row.put("gasto", e.getValue());
            row.put("roasIngresos", null);
            row.put("roasUtilidad", null);
            campanas.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("desde", desde.toString());
        out.put("hasta", hasta.toString());
        out.put("ventanaDias", ventanaDias);
        out.put("empresaId", empresaId);
        out.put("ingresosAtribuidos", ingresosAtribuidos);
        out.put("utilidadAtribuida", utilidadAtribuida);
        out.put("pedidosAtribuidos", pedidosAtribuidos);
        out.put("gastoTotal", gastoTotal > 0 ? gastoTotal : null);
        out.put("roasIngresos", roasIngresos);
        out.put("roasUtilidad", roasUtilidad);
        out.put("roasBlended", roasBlended);
        out.put("ingresosTotalesPeriodo", ingresosTotales);
        out.put("cac", cac);
        out.put("nuevosClientes", clientesPrimerPedido.size());
        out.put("ltv90", ltv90);
        out.put("campanas", campanas);
        Map<String, Object> cpmCpc = calcularCpmCpc(empresaId, desde, hasta);
        if (gastoTotal > 0 && pedidosAtribuidos > 0) {
            cpmCpc.put("cpr", ratio(gastoTotal, pedidosAtribuidos));
        }
        out.put("cpmCpc", cpmCpc);
        out.put("alertas", alertasFatiga(empresaId, desde, hasta));
        return out;
    }

    @Transactional
    public AdsGastoDiario upsertGasto(Long empresaId, LocalDate fecha, String canal, String campana,
                                      int montoCrc, String notas, String fuente) {
        String canalN = canal == null || canal.isBlank() ? "meta" : canal.trim().toLowerCase(Locale.ROOT);
        String campanaN = campana == null || campana.isBlank() ? "sin_campana" : campana.trim();
        AdsGastoDiario g = (empresaId == null
            ? gastoRepo.findPlataformaByFechaAndCanalAndCampana(fecha, canalN, campanaN)
            : gastoRepo.findByEmpresa_IdAndFechaAndCanalAndCampana(empresaId, fecha, canalN, campanaN))
            .orElseGet(AdsGastoDiario::new);
        if (g.getId() == null) {
            g.setFecha(fecha);
            g.setCanal(canalN);
            g.setCampana(campanaN);
            if (empresaId != null) {
                empresaRepository.findById(empresaId).ifPresent(g::setEmpresa);
            }
            g.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        }
        g.setMontoCrc(Math.max(0, montoCrc));
        g.setNotas(notas);
        g.setFuente(fuente == null || fuente.isBlank() ? "manual" : fuente);
        return gastoRepo.save(g);
    }

    @Transactional(readOnly = true)
    public List<AdsGastoDiario> listarGastos(Long empresaId, LocalDate desde, LocalDate hasta) {
        return gastoRepo.findEnPeriodo(empresaId, desde, hasta);
    }

    @Transactional
    public void eliminarGasto(Long id, Long empresaId) {
        AdsGastoDiario g = gastoRepo.findById(id).orElseThrow();
        if (empresaId != null) {
            Empresa e = g.getEmpresa();
            if (e == null || !empresaId.equals(e.getId())) {
                throw new IllegalArgumentException("Gasto no pertenece a esta empresa");
            }
        }
        gastoRepo.delete(g);
    }

    private Map<String, Object> calcularCpmCpc(Long empresaId, LocalDate desde, LocalDate hasta) {
        List<AdsInsightDiario> insights = insightRepo.findEnPeriodo(empresaId, desde, hasta);
        long impresiones = 0;
        long clics = 0;
        int gasto = 0;
        for (AdsInsightDiario i : insights) {
            impresiones += i.getImpresiones() != null ? i.getImpresiones() : 0;
            clics += i.getClics() != null ? i.getClics() : 0;
            gasto += nz(i.getGastoCrc());
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("impresiones", impresiones);
        m.put("clics", clics);
        m.put("gasto", gasto);
        m.put("cpm", impresiones > 0 ? ratio(gasto * 1000L, impresiones) : null);
        m.put("cpc", clics > 0 ? ratio(gasto, clics) : null);
        m.put("cpr", null);
        return m;
    }

    private List<Map<String, Object>> alertasFatiga(Long empresaId, LocalDate desde, LocalDate hasta) {
        List<Map<String, Object>> alertas = new ArrayList<>();
        LocalDate semanaAntDesde = desde.minusDays(7);
        LocalDate semanaAntHasta = desde.minusDays(1);
        List<AdsInsightDiario> actual = insightRepo.findEnPeriodo(empresaId, desde, hasta);
        List<AdsInsightDiario> previa = insightRepo.findEnPeriodo(empresaId, semanaAntDesde, semanaAntHasta);

        Map<String, InsightAgg> actMap = agregarPorAnuncio(actual);
        Map<String, InsightAgg> prevMap = agregarPorAnuncio(previa);

        Map<String, Integer> anunciosPorCampana = new HashMap<>();
        Map<String, Integer> gastoPorAnuncio = new HashMap<>();
        Map<String, Integer> gastoPorCampana = new HashMap<>();

        for (Map.Entry<String, InsightAgg> e : actMap.entrySet()) {
            InsightAgg a = e.getValue();
            anunciosPorCampana.merge(a.campana, 1, Integer::sum);
            gastoPorAnuncio.put(e.getKey(), a.gasto);
            gastoPorCampana.merge(a.campana, a.gasto, Integer::sum);

            if (a.frecuencia != null && a.frecuencia.compareTo(FRECUENCIA_FATIGA) >= 0) {
                InsightAgg prev = prevMap.get(e.getKey());
                boolean ctrCae = prev != null && prev.ctr != null && a.ctr != null
                    && a.ctr.compareTo(prev.ctr) < 0;
                if (ctrCae || a.frecuencia.compareTo(FRECUENCIA_FATIGA) >= 0) {
                    Map<String, Object> al = new LinkedHashMap<>();
                    al.put("tipo", "fatiga_creativa");
                    al.put("campana", a.campana);
                    al.put("anuncio", a.nombre);
                    al.put("frecuencia", a.frecuencia);
                    al.put("ctr", a.ctr);
                    al.put("mensaje", "Frecuencia alta" + (ctrCae ? " y CTR en baja" : "") + " en " + a.nombre);
                    alertas.add(al);
                }
            }
        }

        for (Map.Entry<String, Integer> e : anunciosPorCampana.entrySet()) {
            if (e.getValue() < 3) {
                Map<String, Object> al = new LinkedHashMap<>();
                al.put("tipo", "diversidad_creativa");
                al.put("campana", e.getKey());
                al.put("anunciosActivos", e.getValue());
                al.put("mensaje", "Campaña " + e.getKey() + " con menos de 3 anuncios activos");
                alertas.add(al);
            }
            int gastoC = gastoPorCampana.getOrDefault(e.getKey(), 0);
            if (gastoC <= 0) continue;
            for (Map.Entry<String, Integer> an : gastoPorAnuncio.entrySet()) {
                InsightAgg agg = actMap.get(an.getKey());
                if (agg == null || !e.getKey().equals(agg.campana)) continue;
                BigDecimal share = BigDecimal.valueOf(an.getValue())
                    .divide(BigDecimal.valueOf(gastoC), 4, RoundingMode.HALF_UP);
                if (share.compareTo(SHARE_DOMINANTE) >= 0) {
                    Map<String, Object> al = new LinkedHashMap<>();
                    al.put("tipo", "diversidad_creativa");
                    al.put("campana", e.getKey());
                    al.put("anuncio", agg.nombre);
                    al.put("shareGasto", share);
                    al.put("mensaje", "Un anuncio concentra más del 70% del gasto en " + e.getKey());
                    alertas.add(al);
                }
            }
        }
        return alertas;
    }

    private static Map<String, InsightAgg> agregarPorAnuncio(List<AdsInsightDiario> list) {
        Map<String, InsightAgg> map = new HashMap<>();
        for (AdsInsightDiario i : list) {
            String key = i.getCampana() + "|" + (i.getAnuncioId() != null ? i.getAnuncioId() : i.getAnuncioNombre());
            InsightAgg a = map.computeIfAbsent(key, k -> new InsightAgg(i.getCampana(),
                i.getAnuncioNombre() != null ? i.getAnuncioNombre() : key));
            a.gasto += nz(i.getGastoCrc());
            a.impresiones += i.getImpresiones() != null ? i.getImpresiones() : 0;
            a.clics += i.getClics() != null ? i.getClics() : 0;
            if (i.getFrecuencia() != null) {
                a.frecuencia = a.frecuencia == null ? i.getFrecuencia()
                    : a.frecuencia.max(i.getFrecuencia());
            }
            if (i.getCtr() != null) {
                a.ctr = i.getCtr();
            }
        }
        return map;
    }

    private boolean esPrimerPedidoPagado(Long usuarioId, Long pedidoId, Long empresaId, LocalDateTime fechaPedido) {
        if (usuarioId == null || fechaPedido == null) return false;
        List<Pedido> previos = pedidoRepository.findByUsuarioFinalIdWithItems(usuarioId);
        LocalDateTime min = null;
        Long minId = null;
        for (Pedido p : previos) {
            if (!ESTADOS_PAGADOS.contains(p.getEstadoPedido())) continue;
            if (empresaId != null && (p.getEmpresa() == null || !empresaId.equals(p.getEmpresa().getId()))) continue;
            if (min == null || p.getFechaPedido().isBefore(min)
                || (p.getFechaPedido().equals(min) && p.getId() < minId)) {
                min = p.getFechaPedido();
                minId = p.getId();
            }
        }
        return Objects.equals(minId, pedidoId);
    }

    private int calcularLtv90(Set<Long> clienteIds, Long empresaId) {
        if (clienteIds.isEmpty()) return 0;
        int total = 0;
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        for (Long uid : clienteIds) {
            List<Pedido> pedidos = pedidoRepository.findByUsuarioFinalIdWithItems(uid);
            LocalDateTime primera = null;
            for (Pedido p : pedidos) {
                if (!ESTADOS_PAGADOS.contains(p.getEstadoPedido())) continue;
                if (empresaId != null && (p.getEmpresa() == null || !empresaId.equals(p.getEmpresa().getId()))) continue;
                if (primera == null || p.getFechaPedido().isBefore(primera)) primera = p.getFechaPedido();
            }
            if (primera == null) continue;
            LocalDateTime limite = primera.plusDays(90);
            for (Pedido p : pedidos) {
                if (!ESTADOS_PAGADOS.contains(p.getEstadoPedido())) continue;
                if (empresaId != null && (p.getEmpresa() == null || !empresaId.equals(p.getEmpresa().getId()))) continue;
                if (!p.getFechaPedido().isBefore(primera) && !p.getFechaPedido().isAfter(limite)
                    && !p.getFechaPedido().isAfter(ahora)) {
                    total += nz(p.getTotalPedido());
                }
            }
        }
        return clienteIds.isEmpty() ? 0 : total / clienteIds.size();
    }

    private int sumarIngresosPeriodo(Long empresaId, LocalDateTime desde, LocalDateTime hasta) {
        return (int) pedidoRepository.sumTotalEnPeriodo(empresaId, desde, hasta, ESTADOS_PAGADOS);
    }

    private static boolean dentroVentana(AtribucionPedido a, LocalDateTime fechaPedido, int ventanaDias) {
        if (fechaPedido == null || ventanaDias <= 0) return true;
        LocalDateTime touch = a.getLastTouchedAt() != null ? a.getLastTouchedAt() : a.getFirstTouchedAt();
        if (touch == null) return true;
        return !touch.isBefore(fechaPedido.minusDays(ventanaDias)) && !touch.isAfter(fechaPedido);
    }

    private static int nz(Integer v) { return v != null ? v : 0; }

    private static int ratio(long numerador, long denominador) {
        if (denominador <= 0) return 0;
        return (int) Math.round((numerador * 100.0) / denominador);
    }

    private static final class CampanaAgg {
        final String nombre;
        int ingresos;
        int utilidad;
        int pedidos;
        int nuevosClientes;
        CampanaAgg(String nombre) { this.nombre = nombre; }
    }

    private static final class InsightAgg {
        final String campana;
        final String nombre;
        int gasto;
        long impresiones;
        long clics;
        BigDecimal frecuencia;
        BigDecimal ctr;
        InsightAgg(String campana, String nombre) {
            this.campana = campana;
            this.nombre = nombre;
        }
    }
}
