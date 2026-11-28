package com.hotclick.service.contador;

import com.hotclick.service.contador.ComprasFiscalesProvider.ResumenCompras;
import com.hotclick.service.contador.VentasFiscalesService.VentasMes;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;

/**
 * Cifras del Contador IA: "Este mes", borradores de declaracion y calendario. Todo sale de los comprobantes aceptados,
 * de las facturas de los negocios (via {@link ComprasFiscalesProvider}) y de los parametros que el dueno configuro.
 * No presenta ni paga nada: solo calcula y muestra.
 */
@Service
public class ContadorFiscalService {

    public static final String VERIFICAR = "Verificar con contador";
    public static final String CASILLA = "Casilla a confirmar en el instructivo de TRIBU-CR";

    private final ConfiguracionFiscalService config;
    private final ContadorAjustesService ajustes;
    private final ContadorParametrosService parametros;
    private final VentasFiscalesService ventas;
    private final ComprasFiscalesProvider compras;
    private final RecargosCobradosProvider recargos;

    public ContadorFiscalService(ConfiguracionFiscalService config, ContadorAjustesService ajustes,
                                 ContadorParametrosService parametros, VentasFiscalesService ventas,
                                 ComprasFiscalesProvider compras, RecargosCobradosProvider recargos) {
        this.config = config;
        this.ajustes = ajustes;
        this.parametros = parametros;
        this.ventas = ventas;
        this.compras = compras;
        this.recargos = recargos;
    }

    public Map<String, Object> esteMes(LocalDate hoy) {
        var reglas = config.reglas();
        var aj = ajustes.ajustes();
        Map<String, String> par = parametros.todos();
        boolean trad = ContadorCalendario.TRADICIONAL.equals(reglas.regimen());
        int anio = hoy.getYear();

        List<VentasMes> v = ventas.delAnio(anio);
        ResumenCompras[] c = compras.anio(anio);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("regimen", reglas.regimen());
        m.put("hoy", hoy.toString());
        m.put("anio", anio);
        m.put("avisoLegal", ContadorTextos.AVISO_LEGAL);
        m.put("comprasConDatos", Arrays.stream(c).anyMatch(ResumenCompras::hayDatos));
        List<ContadorCalendario.Evento> cal = ContadorCalendario.eventos(reglas.regimen(), hoy, reglas.diasEnviarFactura(), par);

        if (trad) {
            YearMonth periodo = YearMonth.from(hoy).minusMonths(1);
            m.put("iva", ivaDelPeriodo(periodo, anio, v, c, recargos.cobradoEnMes(periodo), reglas.extraNoInscritoPct()));
            ContadorCalendario.Evento prox = ContadorCalendario.proximo(cal, "F150");
            m.put("proximoVencimiento", prox == null ? null : evento(prox));
        } else {
            m.put("rts", rts(hoy, aj, par, c));
            ContadorCalendario.Evento prox = ContadorCalendario.proximo(cal, "RTS_TRIMESTRAL");
            m.put("proximoVencimiento", prox == null ? null : evento(prox));
        }
        m.put("renta", renta(par, v));
        m.put("etiquetaVerificar", VERIFICAR);
        return m;
    }

    private Map<String, Object> ivaDelPeriodo(YearMonth periodo, int anioHoy, List<VentasMes> v, ResumenCompras[] c,
                                              OptionalLong recargo, BigDecimal extraPct) {
        VentasMes vm;
        ResumenCompras cm;
        if (periodo.getYear() == anioHoy) {
            vm = v.stream().filter(x -> x.mes() == periodo.getMonthValue()).findFirst().orElse(new VentasMes(0, 0, 0, 0));
            cm = c[periodo.getMonthValue() - 1];
        } else {
            vm = ventas.mes(periodo.getYear(), periodo.getMonthValue());
            cm = compras.mes(periodo);
        }
        ContadorCalculos.Iva150 r = ContadorCalculos.iva150(vm.base(), vm.iva(), cm);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("periodo", periodo.toString());
        m.put("ventasBase", r.ventasBase());
        m.put("ivaVentas", r.ivaVentas());
        m.put("comprasConCredito", r.comprasConCredito());
        m.put("comprasSinCredito", r.comprasSinCredito());
        m.put("ivaAcreditable", r.ivaAcreditable());
        m.put("ivaAPagar", r.ivaAPagar());
        m.put("saldoAFavor", r.saldoAFavor());
        m.put("recargoPct", extraPct);
        if (recargo.isPresent()) {
            m.put("recargoCobrado", recargo.getAsLong());
            m.put("recargoCubreIvaPct", r.ivaAPagar() == 0 ? null
                : BigDecimal.valueOf(recargo.getAsLong()).multiply(new BigDecimal("100"))
                    .divide(BigDecimal.valueOf(r.ivaAPagar()), 1, RoundingMode.HALF_UP));
        } else {
            m.put("recargoCobrado", null);
            m.put("recargoCubreIvaPct", null);
        }
        return m;
    }

    private Map<String, Object> rts(LocalDate hoy, ContadorAjustesService.Ajustes aj, Map<String, String> par, ResumenCompras[] c) {
        int anio = hoy.getYear();
        long anual = Arrays.stream(c).mapToLong(ResumenCompras::total).sum();
        long tope = ContadorCalculos.topeAnualRts(aj.salarioBaseCrc());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("comprasAnio", anual);
        m.put("salarioBaseCrc", aj.salarioBaseCrc());
        m.put("progresoTope", prog(ContadorCalculos.progreso(anual, tope)));
        m.put("topeIvaIncluido", true);
        int tActual = ContadorCalculos.trimestre(hoy.getMonthValue());
        int tCerrado = tActual - 1;
        int anioT = anio;
        if (tCerrado == 0) {
            tCerrado = 4;
            anioT = anio - 1;
        }
        m.put("trimestreADeclarar", trimestre(anioT, tCerrado, par));
        m.put("trimestreEnCurso", trimestre(anio, tActual, par));
        m.put("formulario", par.get(ContadorParametrosService.RTS_FORMULARIO));
        return m;
    }

    /** Compras del trimestre y cuota (null si faltan los factores de la actividad). */
    Map<String, Object> trimestre(int anio, int t, Map<String, String> par) {
        // Una sola lectura del año (el proveedor agrega en SQL); se suman los 3 meses del trimestre.
        ResumenCompras[] delAnio = compras.anio(anio);
        long total = 0;
        for (int mes = (t - 1) * 3 + 1; mes <= t * 3; mes++) total += delAnio[mes - 1].total();
        BigDecimal[] f = ContadorParametrosService.factoresRts(par);
        ContadorCalculos.CuotaRts q = f == null ? null : ContadorCalculos.cuotaRts(total, f[0], f[1]);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("anio", anio);
        m.put("trimestre", t);
        m.put("compras", total);
        m.put("cuotaIva", q == null ? null : q.iva());
        m.put("cuotaRenta", q == null ? null : q.renta());
        m.put("cuotaTotal", q == null ? null : q.total());
        m.put("mensaje", q == null ? "Configurá el factor (Decreto 25514-H)" : null);
        return m;
    }

    private Map<String, Object> renta(Map<String, String> par, List<VentasMes> v) {
        long umbral = Long.parseLong(par.get(ContadorParametrosService.RENTA_UMBRAL));
        long brutos = VentasFiscalesService.totalBase(v);
        boolean fisica = "FISICA".equals(par.get(ContadorParametrosService.TIPO_PERSONA));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ingresosBrutosAnio", brutos);
        m.put("umbral", umbral);
        m.put("progreso", prog(ContadorCalculos.progreso(brutos, umbral)));
        m.put("tipoPersona", par.get(ContadorParametrosService.TIPO_PERSONA));
        m.put("tasaSobreUmbralPct", par.get(ContadorParametrosService.RENTA_TASA_SOBRE_UMBRAL));
        String tramosTexto = par.get(fisica ? ContadorParametrosService.RENTA_TRAMOS_FISICA : ContadorParametrosService.RENTA_TRAMOS_JURIDICA);
        m.put("tramos", tramosTexto);
        List<Map<String, Object>> detalle = new ArrayList<>();
        List<ContadorParametrosService.Tramo> tramos = ContadorParametrosService.parseTramos(tramosTexto);
        if (tramos != null) {
            for (ContadorParametrosService.Tramo t : tramos) {
                Map<String, Object> f = new LinkedHashMap<>();
                f.put("hasta", t.hasta());
                f.put("tasaPct", t.tasaPct());
                detalle.add(f);
            }
        }
        m.put("tramosDetalle", detalle);
        // Persona juridica: por encima del umbral de ingresos brutos ya no aplican los tramos reducidos.
        m.put("superaUmbral", !fisica && brutos > umbral);
        m.put("periodoFiscal", par.get(ContadorParametrosService.PERIODO_RENTA));
        return m;
    }

    public Map<String, Object> calendario(LocalDate hoy) {
        var reglas = config.reglas();
        List<Map<String, Object>> evs = new ArrayList<>();
        for (ContadorCalendario.Evento e : ContadorCalendario.eventos(reglas.regimen(), hoy, reglas.diasEnviarFactura(), parametros.todos())) {
            evs.add(evento(e));
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("regimen", reglas.regimen());
        m.put("eventos", evs);
        m.put("etiquetaVerificar", VERIFICAR);
        return m;
    }

    /** Borrador del formulario 150 de un periodo (por defecto el mes anterior). */
    public Map<String, Object> borradorIva(LocalDate hoy, Integer anio, Integer mes) {
        if ((anio == null) != (mes == null)) throw new IllegalArgumentException("período incompleto");
        YearMonth p = anio == null ? YearMonth.from(hoy).minusMonths(1) : YearMonth.of(anio, mes);
        if (p.getYear() < 2020 || p.getYear() > hoy.getYear()) throw new IllegalArgumentException("período fuera de rango");
        VentasMes vm = ventas.mes(p.getYear(), p.getMonthValue());
        ResumenCompras cm = compras.mes(p);
        ContadorCalculos.Iva150 r = ContadorCalculos.iva150(vm.base(), vm.iva(), cm);
        List<Map<String, Object>> cajas = List.of(
            caja("ventas_gravadas", "Ventas gravadas (base sin IVA)", r.ventasBase()),
            caja("iva_ventas", "IVA cobrado en ventas (débito)", r.ivaVentas()),
            caja("compras_con_credito", "Compras con crédito (base)", r.comprasConCredito()),
            caja("iva_acreditable", "IVA de compras acreditable (crédito)", r.ivaAcreditable()),
            caja("compras_sin_credito", "Compras sin crédito", r.comprasSinCredito()),
            caja("iva_a_pagar", "IVA a pagar", r.ivaAPagar()),
            caja("saldo_a_favor", "Saldo a favor", r.saldoAFavor()));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tipo", "IVA_150");
        m.put("periodo", p.toString());
        m.put("regimen", config.reglas().regimen());
        m.put("cajas", cajas);
        m.put("comprasConDatos", cm.hayDatos());
        m.put("avisos", List.of(ContadorTextos.AVISO_BORRADOR,
            "No se inventan números de casilla: copiá cada monto a la casilla que indique el instructivo de TRIBU-CR."));
        return m;
    }

    /** Borrador de la declaracion trimestral del RTS (trimestre 1 a 4). */
    public Map<String, Object> borradorRts(LocalDate hoy, Integer anio, Integer trimestre) {
        if ((anio == null) != (trimestre == null)) throw new IllegalArgumentException("trimestre incompleto");
        int t;
        int a;
        if (anio == null) {
            t = ContadorCalculos.trimestre(hoy.getMonthValue()) - 1;
            a = hoy.getYear();
            if (t == 0) {
                t = 4;
                a--;
            }
        } else {
            t = trimestre;
            a = anio;
        }
        if (t < 1 || t > 4 || a < 2020 || a > hoy.getYear()) throw new IllegalArgumentException("trimestre fuera de rango");
        Map<String, String> par = parametros.todos();
        Map<String, Object> tri = trimestre(a, t, par);
        String form = par.get(ContadorParametrosService.RTS_FORMULARIO);
        List<Map<String, Object>> cajas = List.of(
            caja("compras_trimestre", "Compras del trimestre (IVA incluido)", (Long) tri.get("compras")),
            caja("cuota_iva", "Cuota de IVA", (Long) tri.get("cuotaIva")),
            caja("cuota_renta", "Cuota de renta", (Long) tri.get("cuotaRenta")),
            caja("cuota_total", "Total a pagar del trimestre", (Long) tri.get("cuotaTotal")));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tipo", "RTS_TRIMESTRAL");
        m.put("periodo", a + "-T" + t);
        m.put("formulario", form == null || form.isBlank() ? "Formulario por confirmar en TRIBU-CR" : form);
        m.put("cajas", cajas);
        m.put("mensaje", tri.get("mensaje"));
        m.put("avisos", List.of(ContadorTextos.AVISO_BORRADOR, VERIFICAR + ": los factores y el formulario los configurás vos."));
        return m;
    }

    private static Map<String, Object> caja(String id, String etiqueta, Long valor) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("id", id);
        c.put("etiqueta", etiqueta);
        c.put("valor", valor);
        c.put("nota", CASILLA);
        return c;
    }

    private static Map<String, Object> prog(ContadorCalculos.Progreso p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("valor", p.valor());
        m.put("tope", p.tope());
        m.put("pct", p.pct());
        m.put("superado", p.superado());
        m.put("restante", p.restante());
        return m;
    }

    static Map<String, Object> evento(ContadorCalendario.Evento e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("clave", e.clave());
        m.put("tipo", e.tipo());
        m.put("titulo", e.titulo());
        m.put("detalle", e.detalle());
        m.put("fecha", e.fecha().toString());
        m.put("fechaNominal", e.fechaNominal().toString());
        m.put("corridoPorFinDeSemana", e.corridoPorFinDeSemana());
        m.put("diasRestantes", e.diasRestantes());
        m.put("verificar", e.verificar());
        return m;
    }
}
