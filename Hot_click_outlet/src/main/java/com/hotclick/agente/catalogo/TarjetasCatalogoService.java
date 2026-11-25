package com.hotclick.agente.catalogo;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.CanalMensajeria.ReferenciaCatalogo;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.TarjetaProducto;
import com.hotclick.agente.catalogo.CatalogoRepositorio.Conexion;
import com.hotclick.agente.catalogo.CatalogoRepositorio.Item;
import com.hotclick.agente.catalogo.CatalogoRepositorio.ProductoFila;
import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Tarjetas NATIVAS de producto del catálogo de Meta para el bot de ventas (AG-37): {@code product} (uno) o
 * {@code product_list} (varios) en WhatsApp y plantilla {@code product} en Instagram y Messenger. Solo si el negocio
 * tiene catálogo conectado y el producto ya está sincronizado; si no, o si Meta rechaza la tarjeta, cae a la tarjeta
 * normal ({@link CanalMensajeria#enviarProducto}). Un producto no visible nunca se muestra. Nunca lanza hacia el bot.
 */
@Service
public class TarjetasCatalogoService {

    private static final Logger log = LoggerFactory.getLogger(TarjetasCatalogoService.class);
    public static final int MAX_TARJETAS = 3;

    private final CatalogoRepositorio repo;
    private final CanalMensajeria canal;
    private final CanalCuentaService cuentas;
    private final MetaGraphCliente graph;

    public TarjetasCatalogoService(CatalogoRepositorio repo, CanalMensajeria canal, CanalCuentaService cuentas,
                                   MetaGraphCliente graph) {
        this.repo = repo;
        this.canal = canal;
        this.cuentas = cuentas;
        this.graph = graph;
    }

    /** El negocio tiene catálogo de Meta conectado y activo. */
    public boolean disponible(Long empresaId) {
        return empresaId != null && repo.conexionActiva(empresaId).isPresent();
    }

    /** Productos VISIBLES del negocio entre los ids (los demás se descartan), en orden de id y con tope. */
    public List<ProductoFila> visiblesDe(Long empresaId, List<Long> ids) {
        List<Long> limitados = ids.size() > MAX_TARJETAS ? ids.subList(0, MAX_TARJETAS) : ids;
        return repo.visiblesEntre(empresaId, limitados);
    }

    /** @return true si se envió alguna tarjeta (nativa o normal). */
    public boolean enviar(CanalCuenta cuenta, String destinatario, List<Long> productoIds) {
        if (cuenta == null || cuenta.getEmpresaId() == null || destinatario == null || productoIds == null
                || productoIds.isEmpty()) return false;
        Long empresaId = cuenta.getEmpresaId();
        try {
            Optional<Conexion> cx = repo.conexionActiva(empresaId);
            List<ProductoFila> productos = visiblesDe(empresaId, productoIds);
            if (productos.isEmpty()) return false;
            List<TarjetaProducto> respaldos = productos.stream().map(TarjetasCatalogoService::tarjeta).toList();
            if (cx.isEmpty()) return false; // sin catálogo conectado no se hace nada
            Map<Long, Item> sincronizados = repo.items(empresaId);
            boolean todosEnMeta = productos.stream().allMatch(p -> estaSincronizado(sincronizados.get(p.id())));
            if (todosEnMeta && productos.size() > 1 && cuenta.getTipo() == Canal.WHATSAPP) {
                canal.enviarListaProductosCatalogo(cuenta, destinatario, cx.get().catalogoId(), "Productos para vos",
                    "Estas opciones pueden servirte", productos.stream().map(p -> ItemCatalogo.retailerId(p.id())).toList(),
                    respaldos);
                return true;
            }
            for (int i = 0; i < productos.size(); i++) {
                enviarUno(cuenta, destinatario, cx.get(), productos.get(i), respaldos.get(i), sincronizados.get(productos.get(i).id()));
            }
            return true;
        } catch (RuntimeException e) {
            log.warn("[catalogo-meta] no se pudieron enviar las tarjetas empresa={}: {}", empresaId, e.getClass().getSimpleName());
            return false;
        }
    }

    private void enviarUno(CanalCuenta cuenta, String destinatario, Conexion cx, ProductoFila p, TarjetaProducto respaldo,
                           Item item) {
        if (!estaSincronizado(item)) {
            canal.enviarProducto(cuenta, destinatario, respaldo);
            return;
        }
        String metaId = item.metaProductoId();
        if (metaId == null && cuenta.getTipo() != Canal.WHATSAPP) metaId = resolverMetaId(cuenta, cx, p.id());
        canal.enviarProductoCatalogo(cuenta, destinatario,
            new ReferenciaCatalogo(cx.catalogoId(), ItemCatalogo.retailerId(p.id()), metaId), respaldo);
    }

    /** Instagram y Messenger piden el id del producto en Meta, no el retailer id; se busca una vez y se guarda. */
    private String resolverMetaId(CanalCuenta cuenta, Conexion cx, long productoId) {
        try {
            String id = graph.productoMetaId(cx.catalogoId(), cuentas.tokenDe(cuenta), ItemCatalogo.retailerId(productoId));
            if (id != null) repo.guardarMetaProductoId(cx.empresaId(), productoId, id);
            return id;
        } catch (RuntimeException e) {
            return null; // sin id no hay tarjeta nativa en IG/Messenger: se usa la normal
        }
    }

    private static boolean estaSincronizado(Item i) {
        return i != null && "SINCRONIZADO".equals(i.estado());
    }

    static TarjetaProducto tarjeta(ProductoFila p) {
        return new TarjetaProducto(p.id(), p.nombre(), BigDecimal.valueOf(p.precio()), p.imagenUrl(), p.descripcion(), null);
    }
}
