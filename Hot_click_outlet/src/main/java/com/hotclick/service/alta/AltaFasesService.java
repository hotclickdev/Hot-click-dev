package com.hotclick.service.alta;

import com.hotclick.exception.AltaFasesException;
import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Alta de negocios por fases. Fases (derivadas, no guardadas): 1 REGISTRO, 2 PRODUCTOS, 3 ONVO,
 * 4 REVISION_HOTCLICK, 5 PUBLICADA. Se apoyan en estados que ya existían: {@code estado_empresa}
 * (PENDIENTE_APROBACION → ACTIVO por {@code EmpresaAprobacionService}) y la cuenta ONVO
 * ({@link EmpresaCuentaOnvo}). Lo nuevo es el predicado {@code venta_online_habilitada} (único para publicar y cobrar)
 * y {@code alta_por_fases} (distingue negocios nuevos de los existentes, que no cambian).
 */
@Service
public class AltaFasesService {

    private static final Logger log = LoggerFactory.getLogger(AltaFasesService.class);

    public enum Fase {
        REGISTRO(1), PRODUCTOS(2), ONVO(3), REVISION_HOTCLICK(4), PUBLICADA(5);
        private final int numero;
        Fase(int numero) { this.numero = numero; }
        public int numero() { return numero; }
    }

    public static final String MSG_SIN_COBRO_ONLINE =
        "Este negocio todavía no acepta pagos en línea. Elija otra forma de pago.";

    private final EmpresaRepository empresaRepository;
    private final EmpresaCuentaOnvoRepository cuentaRepository;
    private final ProductoRepository productoRepository;
    private final ObjectProvider<CacheManager> cacheManager;
    private final boolean exigirFases;

    public AltaFasesService(EmpresaRepository empresaRepository, EmpresaCuentaOnvoRepository cuentaRepository,
                            ProductoRepository productoRepository, ObjectProvider<CacheManager> cacheManager,
                            @Value("${hotclick.alta-fases.enabled:true}") boolean exigirFases) {
        this.empresaRepository = empresaRepository;
        this.cuentaRepository = cuentaRepository;
        this.productoRepository = productoRepository;
        this.cacheManager = cacheManager;
        this.exigirFases = exigirFases;
    }

    /** Flag {@code hotclick.alta-fases.enabled} (por defecto true): ¿los negocios NUEVOS entran por fases? */
    public boolean exigirFasesAlNuevos() { return exigirFases; }

    /**
     * Se llama en la transacción del registro. Un negocio nuevo queda en borrador: alta_por_fases y sin venta en línea
     * hasta que su cuenta ONVO quede ACTIVA (y HotClick lo apruebe). Con el flag apagado se comporta como antes.
     */
    public void alRegistrar(Empresa empresa) {
        if (empresa == null || !exigirFases) return;
        empresa.setAltaPorFases(true);
        empresa.setVentaOnlineHabilitada(false);
        empresaRepository.save(empresa);
    }

    /**
     * Regla única: la cuenta ACTIVA habilita. Sin cuenta activa: un negocio por fases no vende; uno existente solo
     * queda bloqueado si alguna vez estuvo ACTIVA y la perdió (nunca se vuelve a cobrar a la plataforma en silencio).
     */
    public static boolean ventaOnlineEsperada(boolean altaPorFases, EmpresaCuentaOnvo cuenta) {
        if (cuenta != null && cuenta.isActiva()) return true;
        if (altaPorFases) return false;
        return cuenta == null || cuenta.getActivadaEn() == null;
    }

    /** Recalcula y guarda {@code venta_online_habilitada}. Devuelve true si cambió. Para llamar dentro de una transacción. */
    public boolean sincronizar(Long empresaId, EmpresaCuentaOnvo cuenta) {
        Empresa e = empresaRepository.findById(empresaId).orElse(null);
        if (e == null) return false;
        boolean esperado = ventaOnlineEsperada(e.isAltaPorFases(), cuenta);
        if (e.isVentaOnlineHabilitada() == esperado) return false;
        e.setVentaOnlineHabilitada(esperado);
        empresaRepository.save(e);
        limpiarCaches(empresaId);
        log.info("[alta-fases] empresa={} venta_online_habilitada={}", empresaId, esperado);
        return true;
    }

    /** Aprobar/publicar un negocio por fases exige cuenta ONVO ACTIVA. Los existentes no se tocan. */
    public void exigirListoParaAprobar(Empresa e) {
        if (e == null || !e.isAltaPorFases()) return;
        EmpresaCuentaOnvo c = cuentaRepository.findByEmpresaId(e.getId()).orElse(null);
        if (c == null || !c.isActiva()) throw AltaFasesException.cuentaNoActiva();
    }

    /** Alinea el predicado con la cuenta (se usa al aprobar, en la misma transacción). */
    public void aplicarEnEmpresa(Empresa e) {
        if (e == null || e.getId() == null) return;
        EmpresaCuentaOnvo c = cuentaRepository.findByEmpresaId(e.getId()).orElse(null);
        e.setVentaOnlineHabilitada(ventaOnlineEsperada(e.isAltaPorFases(), c));
    }

    /**
     * Fail-closed del cobro en línea (checkout web, Telegram del comprador, cualquier cobro ONVO del negocio):
     * pausado por HotClick, sin venta en línea habilitada o, en negocios por fases, sin cuenta ACTIVA vigente.
     * El POS en efectivo y la gestión interna no pasan por acá.
     */
    public void exigirCobroEnLinea(Empresa e) {
        if (e == null) return;
        if (e.isCobrosPausados()) {
            throw new IllegalArgumentException("Este negocio no acepta pagos en línea por ahora. Elija otra forma de pago.");
        }
        if (!e.isVentaOnlineHabilitada()) throw new IllegalArgumentException(MSG_SIN_COBRO_ONLINE);
        if (e.isAltaPorFases() && e.getId() != null) {
            // Negocio por fases: además de la cuenta ACTIVA, tiene que estar aprobado (ACTIVO). Nada de cobrar en borrador.
            if (!"ACTIVO".equals(e.getEstadoEmpresa())) throw new IllegalArgumentException(MSG_SIN_COBRO_ONLINE);
            EmpresaCuentaOnvo cuenta = cuentaRepository.findByEmpresaId(e.getId()).orElse(null);
            boolean activa = cuenta != null && cuenta.isActiva();
            if (!activa) throw new IllegalArgumentException(MSG_SIN_COBRO_ONLINE);
        }
    }

    /** Igual que {@link #exigirCobroEnLinea} pero como booleano (POS con ONVO: mantiene su propio mensaje). */
    public boolean puedeCobrarEnLinea(Empresa e) {
        try {
            exigirCobroEnLinea(e);
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    public static Fase faseDe(boolean altaPorFases, String estadoEmpresa, boolean ventaOnline,
                              boolean cuentaActiva, long productosActivos) {
        if (!altaPorFases) return null;
        if ("ACTIVO".equals(estadoEmpresa)) return ventaOnline ? Fase.PUBLICADA : Fase.ONVO;
        if (!"PENDIENTE_APROBACION".equals(estadoEmpresa)) return null;
        if (cuentaActiva) return Fase.REVISION_HOTCLICK;
        return productosActivos <= 0 ? Fase.PRODUCTOS : Fase.ONVO;
    }

    /** Estado para el panel del dueño. Sin datos personales: solo estados y contadores. */
    public Map<String, Object> estadoDe(Long empresaId) {
        Empresa e = empresaRepository.findById(empresaId).orElseThrow();
        EmpresaCuentaOnvo c = cuentaRepository.findByEmpresaId(empresaId).orElse(null);
        return armarEstado(e, c, productoRepository.countProductosActivosByEmpresaId(empresaId));
    }

    /** Arma el estado a partir de datos ya leídos (lo comparten el panel del dueño y la cola admin en lote). */
    static Map<String, Object> armarEstado(Empresa e, EmpresaCuentaOnvo c, long productos) {
        boolean activa = c != null && c.isActiva();
        Fase fase = faseDe(e.isAltaPorFases(), e.getEstadoEmpresa(), e.isVentaOnlineHabilitada(), activa, productos);
        boolean perdida = c != null && c.getPerdidaDesde() != null && !activa;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("altaPorFases", e.isAltaPorFases());
        m.put("estadoEmpresa", e.getEstadoEmpresa());
        m.put("fase", fase == null ? null : fase.name());
        m.put("faseNumero", fase == null ? null : fase.numero());
        m.put("publicada", e.isVentaOnlineHabilitada() && "ACTIVO".equals(e.getEstadoEmpresa()));
        m.put("ventaOnlineHabilitada", e.isVentaOnlineHabilitada());
        m.put("rechazada", "RECHAZADO".equals(e.getEstadoEmpresa()));
        m.put("productosActivos", productos);
        m.put("cuentaOnvo", c == null ? "SIN_CUENTA" : c.getEstado());
        m.put("cuentaActiva", activa);
        m.put("cuentaPerdida", perdida);
        m.put("cuentaPerdidaDesde", perdida ? c.getPerdidaDesde().toString() : null);
        return m;
    }

    void limpiarCaches(Long empresaId) {
        CacheManager cm = cacheManager.getIfAvailable();
        if (cm == null) return;
        try {
            Cache tenant = cm.getCache("tenantInfo");
            if (tenant != null) { if (empresaId == null) tenant.clear(); else tenant.evict(empresaId); }
            Cache pub = cm.getCache("productos-publicos");
            if (pub != null) pub.clear();
        } catch (RuntimeException ex) {
            log.warn("[alta-fases] no se pudo limpiar cache: {}", ex.getClass().getSimpleName());
        }
    }
}
