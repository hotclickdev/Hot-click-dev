package com.hotclick.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Borrador de un flujo multi-paso del bot de Telegram, serializado como JSON en
 * TelegramVinculacion.contexto (columna TEXT desde V98).
 *
 * Convención: un contexto que empieza con "{" es un borrador de flujo; cualquier
 * otro valor es un contexto legado (ej. "AJUSTE:123" del chequeo semanal).
 *
 * Los nombres de campo son cortos a propósito — el borrador viaja en cada
 * transición de paso y se guarda en BD en cada mensaje del usuario.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class TelegramFlujoEstado {

    public static final String FLUJO_VENTA    = "VENTA";
    public static final String FLUJO_PRODUCTO = "PROD";
    public static final String FLUJO_ACCION   = "ACCION";

    // Pasos del flujo VENTA
    public static final String P_VTA_PRODUCTO       = "PROD";
    public static final String P_VTA_CANTIDAD       = "CANT";
    public static final String P_VTA_PAGO           = "PAGO";
    public static final String P_VTA_CLIENTE        = "CLIENTE";
    public static final String P_VTA_CLIENTE_BUSCAR = "CLI_Q";
    public static final String P_VTA_CLIENTE_NUEVO  = "CLI_NEW";
    public static final String P_VTA_CONFIRMAR      = "CONFIRMAR";

    // Pasos del flujo PRODUCTO
    public static final String P_PRD_NOMBRE        = "NOMBRE";
    public static final String P_PRD_DESCRIPCION   = "DESC";
    public static final String P_PRD_PRECIO_VENTA  = "PV";
    public static final String P_PRD_PRECIO_COMPRA = "PC";
    public static final String P_PRD_STOCK         = "STOCK";
    public static final String P_PRD_CATEGORIA     = "CAT";
    public static final String P_PRD_MARCA         = "MARCA";
    public static final String P_PRD_MARCA_TEXTO   = "MARCA_TXT";
    public static final String P_PRD_FOTOS         = "FOTOS";
    public static final String P_PRD_CONFIRMAR     = "CONFIRMAR";

    // Paso del flujo ACCION (siempre esperando confirmación por botón)
    public static final String P_ACC_CONFIRMAR = "CONFIRMAR";

    private static final long TTL_HORAS = 24;
    /** TTL corto para acciones pendientes de confirmación — una mutación vieja no debería poder confirmarse. */
    private static final long TTL_MINUTOS_ACCION = 30;

    /** Flujo activo: VENTA | PROD */
    private String f;
    /** Paso actual dentro del flujo */
    private String p;
    /** Momento de creación del borrador (para el TTL de 24 h) */
    private LocalDateTime ts;

    // ── Flujo VENTA ──────────────────────────────────────────────────────────
    /** Items ya agregados a la venta */
    private List<ItemBorrador> items;
    /** Producto pendiente de cantidad (paso CANT) */
    private Long pid;
    /** Método de pago elegido: SINPE | EFECTIVO | TARJETA */
    private String pago;
    /** Cliente asociado (opcional) */
    private Long cli;

    // ── Flujo PRODUCTO ───────────────────────────────────────────────────────
    private ProductoBorrador d;

    // ── Flujo ACCION (propuesta de mutación pendiente de confirmación) ─────────
    /** Tipo de acción: uno de AccionPropuestaTelegram.PEDIDO_ESTADO/PEDIDO_GUIA/STOCK_AJUSTE/PRODUCTO_OFERTA */
    private String acc;
    /** Id de la entidad objetivo (pedidoId o productoId, según acc) */
    private Long eid;
    /** Parámetros resueltos y validados de la acción */
    private java.util.Map<String, Object> par;
    /** Resumen humano en español, mostrado junto a los botones Confirmar/Cancelar */
    private String res;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ItemBorrador {
        private Long pid;
        private Integer c;

        public ItemBorrador() { }
        public ItemBorrador(Long pid, Integer c) { this.pid = pid; this.c = c; }

        public Long getPid() { return pid; }
        public void setPid(Long pid) { this.pid = pid; }
        public Integer getC() { return c; }
        public void setC(Integer c) { this.c = c; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ProductoBorrador {
        private String nom;
        private String desc;
        private Integer pv;
        private Integer pc;
        private Integer stk;
        private Long cat;
        private Long marca;
        private String marcaTxt;
        private List<String> fotos;

        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }
        public String getDesc() { return desc; }
        public void setDesc(String desc) { this.desc = desc; }
        public Integer getPv() { return pv; }
        public void setPv(Integer pv) { this.pv = pv; }
        public Integer getPc() { return pc; }
        public void setPc(Integer pc) { this.pc = pc; }
        public Integer getStk() { return stk; }
        public void setStk(Integer stk) { this.stk = stk; }
        public Long getCat() { return cat; }
        public void setCat(Long cat) { this.cat = cat; }
        public Long getMarca() { return marca; }
        public void setMarca(Long marca) { this.marca = marca; }
        public String getMarcaTxt() { return marcaTxt; }
        public void setMarcaTxt(String marcaTxt) { this.marcaTxt = marcaTxt; }
        public List<String> getFotos() {
            if (fotos == null) fotos = new ArrayList<>();
            return fotos;
        }
        public void setFotos(List<String> fotos) { this.fotos = fotos; }
    }

    // ── Fábricas y (de)serialización ─────────────────────────────────────────

    public static TelegramFlujoEstado nuevaVenta(LocalDateTime ahora) {
        TelegramFlujoEstado e = new TelegramFlujoEstado();
        e.f = FLUJO_VENTA;
        e.p = P_VTA_PRODUCTO;
        e.ts = ahora;
        e.items = new ArrayList<>();
        return e;
    }

    public static TelegramFlujoEstado nuevoProducto(LocalDateTime ahora) {
        TelegramFlujoEstado e = new TelegramFlujoEstado();
        e.f = FLUJO_PRODUCTO;
        e.p = P_PRD_NOMBRE;
        e.ts = ahora;
        e.d = new ProductoBorrador();
        return e;
    }

    public static TelegramFlujoEstado nuevaAccion(LocalDateTime ahora, String acc, Long eid,
                                                    java.util.Map<String, Object> par, String res) {
        TelegramFlujoEstado e = new TelegramFlujoEstado();
        e.f = FLUJO_ACCION;
        e.p = P_ACC_CONFIRMAR;
        e.ts = ahora;
        e.acc = acc;
        e.eid = eid;
        e.par = par;
        e.res = res;
        return e;
    }

    /** true si el contexto guardado es un borrador de flujo (vs. legado "AJUSTE:..."). */
    public static boolean esBorrador(String contexto) {
        return contexto != null && contexto.startsWith("{");
    }

    /**
     * Deserializa el borrador. Devuelve vacío si el contexto no es un borrador,
     * no parsea o su flujo/paso es desconocido — nunca lanza: un borrador corrupto
     * simplemente reinicia la conversación.
     */
    public static Optional<TelegramFlujoEstado> deserializar(String contexto, ObjectMapper mapper) {
        if (!esBorrador(contexto)) return Optional.empty();
        try {
            TelegramFlujoEstado e = mapper.readValue(contexto, TelegramFlujoEstado.class);
            if (e.f == null || e.p == null) return Optional.empty();
            return Optional.of(e);
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    /** Serializa el borrador; si Jackson fallara (no debería), devuelve null → contexto limpio. */
    public String serializar(ObjectMapper mapper) {
        try {
            return mapper.writeValueAsString(this);
        } catch (Exception ex) {
            return null;
        }
    }

    public boolean vencido(LocalDateTime ahora) {
        if (ts == null) return true;
        if (FLUJO_ACCION.equals(f)) return ts.plusMinutes(TTL_MINUTOS_ACCION).isBefore(ahora);
        return ts.plusHours(TTL_HORAS).isBefore(ahora);
    }

    public List<ItemBorrador> getItemsSeguro() {
        if (items == null) items = new ArrayList<>();
        return items;
    }

    public ProductoBorrador getDraftSeguro() {
        if (d == null) d = new ProductoBorrador();
        return d;
    }

    // ── Getters/Setters ──────────────────────────────────────────────────────

    public String getF() { return f; }
    public void setF(String f) { this.f = f; }
    public String getP() { return p; }
    public void setP(String p) { this.p = p; }
    public LocalDateTime getTs() { return ts; }
    public void setTs(LocalDateTime ts) { this.ts = ts; }
    public List<ItemBorrador> getItems() { return items; }
    public void setItems(List<ItemBorrador> items) { this.items = items; }
    public Long getPid() { return pid; }
    public void setPid(Long pid) { this.pid = pid; }
    public String getPago() { return pago; }
    public void setPago(String pago) { this.pago = pago; }
    public Long getCli() { return cli; }
    public void setCli(Long cli) { this.cli = cli; }
    public ProductoBorrador getD() { return d; }
    public void setD(ProductoBorrador d) { this.d = d; }
    public String getAcc() { return acc; }
    public void setAcc(String acc) { this.acc = acc; }
    public Long getEid() { return eid; }
    public void setEid(Long eid) { this.eid = eid; }
    public java.util.Map<String, Object> getPar() { return par; }
    public void setPar(java.util.Map<String, Object> par) { this.par = par; }
    public String getRes() { return res; }
    public void setRes(String res) { this.res = res; }
}
