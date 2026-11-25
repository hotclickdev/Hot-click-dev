package com.hotclick.agente.catalogo;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.catalogo.CatalogoRepositorio.Conexion;
import com.hotclick.agente.catalogo.CatalogoRepositorio.Item;
import com.hotclick.agente.catalogo.CatalogoRepositorio.ProductoFila;
import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Catálogo del negocio sincronizado con su catálogo de Meta (AG-37), con el token de la cuenta conectada. Solo se
 * suben productos VISIBLES (regla del catálogo público: empresa aprobada, pública, producto activo y visible). Altas,
 * cambios y bajas son incrementales: al guardar un producto ({@link #sincronizarProducto}) y con un barrido diario
 * ({@link #barrer}) que también atrapa lo que el evento no ve (empresa suspendida, producto vendido o agotado).
 *
 * <p>Sin catálogo conectado no se hace nada. Si Meta cae, el error queda en {@code ultimo_error} y el barrido del día
 * siguiente reintenta: nunca se pierde un cambio porque la huella de lo ya sincronizado solo se guarda tras el éxito.
 * Nunca registra tokens ni cuerpos de Meta.
 */
@Service
public class CatalogoMetaService {

    private static final Logger log = LoggerFactory.getLogger(CatalogoMetaService.class);
    static final Pattern ID_CATALOGO = Pattern.compile("\\d{5,25}");
    static final int PAGINA = 500;
    static final int LOTE_META = 500;
    static final int MAX_PRODUCTOS = 10_000;

    /** Estado para el panel. */
    public record Estado(boolean conectado, String catalogoId, Instant ultimaSync, String ultimoError,
                         int sincronizados) { }

    private final CatalogoRepositorio repo;
    private final MetaGraphCliente graph;
    private final CanalCuentaService cuentas;
    private final String urlBase;
    private final Clock reloj;

    @Autowired // con dos constructores Spring no elige solo
    public CatalogoMetaService(CatalogoRepositorio repo, MetaGraphCliente graph, CanalCuentaService cuentas,
                               @Value("${app.url:https://hotclick.lat}") String urlBase) {
        this(repo, graph, cuentas, urlBase, Clock.system(Constants.ZONA_CR));
    }

    CatalogoMetaService(CatalogoRepositorio repo, MetaGraphCliente graph, CanalCuentaService cuentas, String urlBase,
                        Clock reloj) {
        this.repo = repo;
        this.graph = graph;
        this.cuentas = cuentas;
        this.urlBase = urlBase.endsWith("/") ? urlBase.substring(0, urlBase.length() - 1) : urlBase;
        this.reloj = reloj;
    }

    private Instant ahora() {
        return Instant.now(reloj);
    }

    // ── conexión ────────────────────────────────────────────────────────────

    public Estado estado(Long empresaId) {
        return repo.conexion(empresaId)
            .map(c -> new Estado(true, c.catalogoId(), c.ultimaSync(), c.ultimoError(), repo.contarSincronizados(empresaId)))
            .orElse(new Estado(false, null, null, null, 0));
    }

    /**
     * Conecta el catálogo creado en Commerce Manager. Prueba que el token de la cuenta conectada lo administra (el
     * token necesita el permiso {@code catalog_management}); si Meta lo rechaza no se guarda nada.
     */
    public Estado conectar(Long empresaId, String catalogoId) {
        String id = catalogoId == null ? "" : catalogoId.strip();
        if (!ID_CATALOGO.matcher(id).matches()) throw new IllegalArgumentException("El id del catálogo son solo números");
        CanalCuenta cuenta = cuentaConToken(empresaId)
            .orElseThrow(() -> new IllegalStateException("Conectá primero tu WhatsApp, Instagram o Facebook"));
        graph.nombreCatalogo(id, cuentas.tokenDe(cuenta));
        repo.guardarConexion(empresaId, id, ahora());
        log.info("[catalogo-meta] catálogo conectado empresa={}", empresaId);
        return estado(empresaId);
    }

    public void desconectar(Long empresaId) {
        repo.desconectar(empresaId);
    }

    /** WhatsApp primero (es el canal de las tarjetas), luego Instagram y Messenger. */
    private Optional<CanalCuenta> cuentaConToken(Long empresaId) {
        for (Canal tipo : List.of(Canal.WHATSAPP, Canal.INSTAGRAM, Canal.MESSENGER)) {
            Optional<CanalCuenta> c = cuentas.activaDe(empresaId, tipo);
            if (c.isPresent()) return c;
        }
        return Optional.empty();
    }

    public List<Long> empresasConCatalogo() {
        return repo.empresasConCatalogoActivo();
    }

    // ── evento: un producto ─────────────────────────────────────────────────

    /** Sube, actualiza o da de baja UN producto. Sin catálogo conectado no hace nada y no consulta el producto. */
    public void sincronizarProducto(Long empresaId, Long productoId) {
        if (empresaId == null || productoId == null) return;
        Optional<Conexion> cx = repo.conexionActiva(empresaId);
        if (cx.isEmpty()) return;
        Optional<CanalCuenta> cuenta = cuentaConToken(empresaId);
        if (cuenta.isEmpty()) return;
        Optional<Item> previo = repo.item(empresaId, productoId);
        Optional<Map<String, Object>> item = repo.visible(empresaId, productoId)
            .flatMap(p -> ItemCatalogo.aItem(p, urlBase));
        List<Map<String, Object>> pedidos = new ArrayList<>();
        Map<Long, String> altas = new HashMap<>();
        Set<Long> bajas = new HashSet<>();
        if (item.isPresent()) {
            String huella = ItemCatalogo.huella(item.get());
            boolean igual = previo.isPresent() && "SINCRONIZADO".equals(previo.get().estado())
                && huella.equals(previo.get().huella());
            if (igual) return; // nada cambió: no se llama a Meta
            pedidos.add(ItemCatalogo.pedidoUpdate(item.get()));
            altas.put(productoId, huella);
        } else if (previo.isPresent() && "SINCRONIZADO".equals(previo.get().estado())) {
            pedidos.add(ItemCatalogo.pedidoDelete(productoId));
            bajas.add(productoId);
        } else {
            return; // no es visible y nunca estuvo en Meta
        }
        enviar(empresaId, cx.get().catalogoId(), cuenta.get(), pedidos, altas, bajas);
    }

    // ── barrido diario: todo el catálogo del negocio ────────────────────────

    /** @return cuántos pedidos (altas, cambios y bajas) se mandaron a Meta */
    public int barrer(Long empresaId) {
        Optional<Conexion> cx = repo.conexionActiva(empresaId);
        Optional<CanalCuenta> cuenta = cx.isEmpty() ? Optional.empty() : cuentaConToken(empresaId);
        if (cx.isEmpty() || cuenta.isEmpty()) return 0;

        Map<Long, Item> existentes = repo.items(empresaId);
        Set<Long> visiblesIds = new HashSet<>();
        Map<Long, String> altas = new LinkedHashMap<>();
        List<Map<String, Object>> pedidos = new ArrayList<>();
        long despuesDe = 0;
        int leidos = 0;
        while (leidos < MAX_PRODUCTOS) {
            List<ProductoFila> pagina = repo.visibles(empresaId, despuesDe, PAGINA);
            if (pagina.isEmpty()) break;
            for (ProductoFila p : pagina) {
                despuesDe = p.id();
                Optional<Map<String, Object>> item = ItemCatalogo.aItem(p, urlBase);
                if (item.isEmpty()) continue; // sin imagen https u otro dato que Meta exige: no se sube
                visiblesIds.add(p.id());
                String huella = ItemCatalogo.huella(item.get());
                Item previo = existentes.get(p.id());
                if (previo == null || !"SINCRONIZADO".equals(previo.estado()) || !huella.equals(previo.huella())) {
                    pedidos.add(ItemCatalogo.pedidoUpdate(item.get()));
                    altas.put(p.id(), huella);
                }
            }
            leidos += pagina.size();
        }
        Set<Long> bajas = new HashSet<>();
        for (Map.Entry<Long, Item> e : existentes.entrySet()) {
            if ("SINCRONIZADO".equals(e.getValue().estado()) && !visiblesIds.contains(e.getKey())) {
                pedidos.add(ItemCatalogo.pedidoDelete(e.getKey()));
                bajas.add(e.getKey());
            }
        }
        if (pedidos.isEmpty()) {
            repo.registrarSync(empresaId, null, ahora());
            return 0;
        }
        enviar(empresaId, cx.get().catalogoId(), cuenta.get(), pedidos, altas, bajas);
        return pedidos.size();
    }

    /**
     * Manda los pedidos en lotes. Cada lote guarda su resultado solo si Meta respondió bien, así un corte a mitad no
     * marca como sincronizado lo que no llegó. Los productos con error de validación quedan sin sincronizar.
     */
    private void enviar(Long empresaId, String catalogoId, CanalCuenta cuenta, List<Map<String, Object>> pedidos,
                        Map<Long, String> altas, Set<Long> bajas) {
        String token = cuentas.tokenDe(cuenta);
        try {
            for (int i = 0; i < pedidos.size(); i += LOTE_META) {
                List<Map<String, Object>> lote = pedidos.subList(i, Math.min(pedidos.size(), i + LOTE_META));
                MetaGraphCliente.ResultadoLote r = graph.itemsBatch(catalogoId, token, lote);
                guardarLote(empresaId, lote, r.conError(), altas, bajas);
            }
            repo.registrarSync(empresaId, null, ahora());
        } catch (MetaRechazoException e) {
            repo.registrarSync(empresaId, "META_" + e.codigoMeta(), ahora());
            log.warn("[catalogo-meta] Meta rechazó la sincronización empresa={} código={}", empresaId, e.codigoMeta());
        } catch (IntegracionExternaException e) {
            repo.registrarSync(empresaId, "META_CAIDA", ahora());
            log.warn("[catalogo-meta] Meta no respondió empresa={}: {}", empresaId, e.getTipo());
        }
    }

    @SuppressWarnings("unchecked")
    private void guardarLote(Long empresaId, List<Map<String, Object>> lote, Set<String> conError,
                             Map<Long, String> altas, Set<Long> bajas) {
        Map<Long, String> altasOk = new HashMap<>();
        List<Long> bajasOk = new ArrayList<>();
        for (Map<String, Object> req : lote) {
            Map<String, Object> data = (Map<String, Object>) req.get("data");
            String retailer = String.valueOf(data.get("id"));
            if (conError.contains(retailer)) continue;
            long id = Long.parseLong(retailer);
            if ("DELETE".equals(req.get("method"))) {
                if (bajas.contains(id)) bajasOk.add(id);
            } else if (altas.containsKey(id)) {
                altasOk.put(id, altas.get(id));
            }
        }
        Instant t = ahora();
        repo.guardarItems(empresaId, altasOk, t);
        repo.marcarEliminados(empresaId, bajasOk, t);
    }
}
