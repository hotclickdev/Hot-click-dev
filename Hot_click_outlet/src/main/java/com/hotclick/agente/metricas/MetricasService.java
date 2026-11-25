package com.hotclick.agente.metricas;

import com.hotclick.agente.metricas.MetricasDtos.Costos;
import com.hotclick.agente.metricas.MetricasDtos.Embudo;
import com.hotclick.agente.metricas.MetricasDtos.Metricas;
import com.hotclick.agente.metricas.MetricasDtos.Perdidas;
import com.hotclick.agente.metricas.MetricasDtos.Segmento;
import com.hotclick.agente.metricas.MetricasDtos.VentaCanal;
import com.hotclick.agente.metricas.MetricasDtos.Ventas;
import com.hotclick.agente.metricas.MetricasRepositorio.Alcance;
import com.hotclick.agente.metricas.MetricasRepositorio.Costo;
import com.hotclick.agente.metricas.MetricasRepositorio.FilaConversaciones;
import com.hotclick.agente.metricas.MetricasRepositorio.FilaEnlaces;
import com.hotclick.agente.metricas.MetricasRepositorio.FilaVentas;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Métricas del bot (AG-32). El alcance lo decide quien llama con el usuario autenticado, nunca un parámetro:
 * un negocio ve lo suyo; el ADMIN ve el bot de HotClick y, aparte, el total de la plataforma.
 * Las fechas son días de Costa Rica; el rango es [desde, hasta] inclusivo.
 */
@Service
public class MetricasService {

    static final int MAX_DIAS = 366;
    static final int DIAS_POR_DEFECTO = 30;
    static final int ALERTAS_RECIENTES = 10;

    private final MetricasRepositorio repo;
    private final AlertaMetaRepositorio alertas;
    private final Clock clock;

    @Autowired
    public MetricasService(MetricasRepositorio repo, AlertaMetaRepositorio alertas) {
        this(repo, alertas, Clock.system(Constants.ZONA_CR));
    }

    MetricasService(MetricasRepositorio repo, AlertaMetaRepositorio alertas, Clock clock) {
        this.repo = repo;
        this.alertas = alertas;
        this.clock = clock;
    }

    /**
     * @param empresaId empresa del llamador, o null solo para el ADMIN de plataforma
     */
    @Transactional(readOnly = true)
    public MetricasDtos.Respuesta consultar(Long empresaId, LocalDate desde, LocalDate hasta) {
        LocalDate fin = hasta == null ? LocalDate.now(clock) : hasta;
        LocalDate inicio = desde == null ? fin.minusDays(DIAS_POR_DEFECTO - 1L) : desde;
        if (inicio.isAfter(fin)) throw new IllegalArgumentException("La fecha inicial no puede ser posterior a la final");
        if (inicio.plusDays(MAX_DIAS).isBefore(fin)) {
            throw new IllegalArgumentException("El rango máximo es de " + MAX_DIAS + " días");
        }
        if (empresaId != null) {
            return new MetricasDtos.Respuesta(inicio, fin, "NEGOCIO",
                calcular(Alcance.negocio(empresaId), inicio, fin), null, null);
        }
        return new MetricasDtos.Respuesta(inicio, fin, "HOTCLICK",
            calcular(Alcance.hotclick(), inicio, fin), calcular(Alcance.todaLaPlataforma(), inicio, fin),
            alertas.recientes(ALERTAS_RECIENTES));
    }

    private Metricas calcular(Alcance alcance, LocalDate desde, LocalDate hasta) {
        LocalDateTime d = desde.atStartOfDay();
        LocalDateTime h = hasta.plusDays(1).atStartOfDay();
        OffsetDateTime dz = d.atZone(Constants.ZONA_CR).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime hz = h.atZone(Constants.ZONA_CR).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
        List<FilaConversaciones> convs = repo.conversaciones(alcance, dz, hz);
        List<FilaEnlaces> enlaces = repo.enlaces(alcance, d, h);
        List<FilaVentas> ventas = repo.ventas(alcance, d, h);
        Costo costo = repo.costo(alcance, desde, hasta);
        return armar(convs, enlaces, ventas, costo);
    }

    static Metricas armar(List<FilaConversaciones> convs, List<FilaEnlaces> enlaces, List<FilaVentas> ventas,
                          Costo costo) {
        long totalConvs = convs.stream().mapToLong(FilaConversaciones::conversaciones).sum();
        long traspasos = convs.stream().mapToLong(FilaConversaciones::aPersona).sum();
        Embudo embudo = new Embudo(totalConvs,
            enlaces.stream().mapToLong(FilaEnlaces::creados).sum(),
            enlaces.stream().mapToLong(FilaEnlaces::abiertos).sum(),
            enlaces.stream().mapToLong(FilaEnlaces::pagados).sum());
        Perdidas perdidas = new Perdidas(enlaces.stream().mapToLong(FilaEnlaces::vencidos).sum(),
            enlaces.stream().mapToLong(FilaEnlaces::totalVencidos).sum());

        long cantidadVentas = ventas.stream().mapToLong(FilaVentas::cantidad).sum();
        long totalVentas = ventas.stream().mapToLong(FilaVentas::totalColones).sum();
        List<VentaCanal> porCanalVentas = ventas.stream()
            .map(v -> new VentaCanal(v.canal(), v.cantidad(), v.totalColones()))
            .sorted(Comparator.comparing(VentaCanal::canal)).toList();

        BigDecimal costoUsd = costo.costoUsd() == null ? BigDecimal.ZERO : costo.costoUsd();
        BigDecimal porVenta = cantidadVentas == 0 ? null
            : costoUsd.divide(BigDecimal.valueOf(cantidadVentas), 6, RoundingMode.HALF_UP);

        return new Metricas(embudo,
            segmentos(convs, enlaces, true), segmentos(convs, enlaces, false),
            new Ventas(cantidadVentas, totalVentas, porCanalVentas), traspasos, perdidas,
            new Costos(costoUsd, porVenta, costo.conversaciones()));
    }

    /** Agrupa por bot (perfil) o por canal sumando las filas ya agregadas por la base. */
    private static List<Segmento> segmentos(List<FilaConversaciones> convs, List<FilaEnlaces> enlaces, boolean porBot) {
        Map<String, long[]> acum = new TreeMap<>(); // [conversaciones, creados, pagados]
        for (FilaConversaciones c : convs) {
            acum.computeIfAbsent(porBot ? c.perfil() : c.canal(), k -> new long[3])[0] += c.conversaciones();
        }
        for (FilaEnlaces e : enlaces) {
            long[] a = acum.computeIfAbsent(porBot ? e.perfil() : e.canal(), k -> new long[3]);
            a[1] += e.creados();
            a[2] += e.pagados();
        }
        return acum.entrySet().stream()
            .map(x -> new Segmento(x.getKey(), x.getValue()[0], x.getValue()[1], x.getValue()[2],
                porcentaje(x.getValue()[2], x.getValue()[0])))
            .toList();
    }

    /** Porcentaje con un decimal; 0 si el denominador es 0. */
    static double porcentaje(long parte, long total) {
        if (total <= 0) return 0.0;
        return BigDecimal.valueOf(parte * 100.0 / total).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
