package com.hotclick.service.pos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class PosQrSessionService {

    private static final Logger log = LoggerFactory.getLogger(PosQrSessionService.class);

    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired private UsuarioRepository     usuarioRepo;
    @Autowired private EmpresaRepository     empresaRepo;
    @Autowired private ProductoRepository    productoRepo;
    @Autowired private TurnoCajaRepository   turnoCajaRepo;
    @Autowired private BodegaRepository      bodegaRepo;

    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${onvo.sinpe-destino:+50670196686}")
    private String onvoSinpeDestino;

    @Transactional
    public PosQrSesion crearSesion(Long usuarioId, Long empresaId, Long turnoId,
                            String metodoPago, List<Map<String, Object>> items,
                            String notas, Long clienteId, Long bodegaId) {
        return crearSesion(usuarioId, empresaId, turnoId, metodoPago, null, items, notas, clienteId, bodegaId);
    }

    /**
     * @param metodosPago métodos que la caja deja elegir al cliente (null = solo {@code metodoPago}).
     */
    @Transactional
    @SuppressWarnings("java:S107") // parámetros del cobro POS; un DTO no aporta para un solo llamador
    public PosQrSesion crearSesion(Long usuarioId, Long empresaId, Long turnoId,
                            String metodoPago, Object metodosPago, List<Map<String, Object>> items,
                            String notas, Long clienteId, Long bodegaId) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("El carrito no puede estar vacío");
        }
        if (!PosQrMetodos.SINPE.equals(metodoPago) && !PosQrMetodos.TARJETA.equals(metodoPago)) {
            throw new IllegalArgumentException("Método de pago debe ser SINPE o TARJETA");
        }
        List<String> habilitados = PosQrMetodos.normalizar(metodosPago, metodoPago);
        exigirItemsDelNegocio(empresaId, items);

        Usuario usuario  = usuarioRepo.findById(usuarioId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));
        Empresa empresa  = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));

        int total = 0;
        for (Map<String, Object> item : items) {
            Long productoId = productoIdDe(item);
            int cantidad = enteroDe(item, "cantidad", 1);
            var producto = productoRepo.findById(productoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));
            Integer precioObj = producto.getPrecioEfectivo();
            if (precioObj == null) {
                throw new IllegalStateException("Producto sin precio de venta: " + productoId);
            }
            int precio = precioObj;
            item.put("precioUnitario", precio);
            total += precio * cantidad;
        }

        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken(UUID.randomUUID().toString().replace("-", ""));
        sesion.setEmpresa(empresa);
        sesion.setUsuario(usuario);
        sesion.setClienteId(clienteId);
        sesion.setBodegaId(bodegaId);
        sesion.setTotal(total);
        sesion.setMetodoPago(metodoPago);
        sesion.setMetodosHabilitados(PosQrMetodos.aCsv(habilitados));
        sesion.setEstado("PENDIENTE");
        sesion.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        sesion.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(30));
        sesion.setNotas(notas);

        if (turnoId != null) {
            turnoCajaRepo.findById(turnoId).ifPresent(sesion::setTurno);
        }

        try {
            sesion.setItemsJson(mapper.writeValueAsString(items));
        } catch (Exception e) {
            throw new IllegalStateException("Error serializando items", e);
        }

        PosQrSesion saved = posQrRepo.save(sesion);
        // open-in-view=false: respuestaCajero lee empresa LAZY en el mismo request.
        Hibernate.initialize(saved.getEmpresa());
        log.info("[POS-QR] Sesión {} creada por usuario={} empresa={} método={} total={}",
            saved.getToken(), usuarioId, empresaId, metodoPago, total);
        return saved;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getInfoPublica(String token) {
        PosQrSesion sesion = findSesionActiva(token);
        Empresa empresa = exigirEmpresa(sesion);

        List<Map<String, Object>> items;
        try {
            items = mapper.readValue(sesion.getItemsJson(), new TypeReference<>() {});
        } catch (Exception e) {
            items = List.of();
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("token",        sesion.getToken());
        r.put("estado",       sesion.getEstado());
        r.put("metodoPago",   sesion.getMetodoPago());
        r.put("metodosHabilitados", PosQrMetodos.deSesion(sesion));
        r.put("numeroCobro",  PosQrMetodos.numeroCobro(sesion));
        r.put("caja",         nombreCaja(sesion));
        r.put("total",        sesion.getTotal());
        r.put("items",        items);
        r.put("expiracion",   sesion.getFechaExpiracion().toString());
        r.put("empresaNombre", empresa.getNombreComercial() != null
            ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        r.put("logoUrl",      empresa.getLogoUrl());
        r.put("colorPrimario", empresa.getColorPrimario());
        // SINPE: número de teléfono y referencia (primeros 8 chars del token)
        r.put("sinpeNumero",  destinoSinpe(sesion, empresa));
        r.put("sinpeRef",     sesion.getToken().substring(0, 8).toUpperCase());
        return r;
    }

    /**
     * Comprobante del cobro ya pagado (Figma `29:1888` "Ver comprobante").
     * Solo existe con estado PAGADO; el token es el mismo secreto del QR.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getComprobante(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("QR no encontrado"));
        if (!"PAGADO".equals(sesion.getEstado())) {
            throw new IllegalStateException("El cobro todavía no está pagado");
        }
        Empresa empresa = exigirEmpresa(sesion);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("numeroCobro",   PosQrMetodos.numeroCobro(sesion));
        r.put("empresaNombre", empresa.getNombreComercial() != null
            ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        r.put("logoUrl",       empresa.getLogoUrl());
        r.put("caja",          nombreCaja(sesion));
        r.put("metodoPago",    sesion.getMetodoPago());
        r.put("total",         sesion.getTotal());
        r.put("items",         itemsDe(sesion));
        LocalDateTime fecha = sesion.getFechaPago() != null ? sesion.getFechaPago() : sesion.getFechaCreacion();
        r.put("fechaPago",     fecha != null ? fecha.toString() : null);
        r.put("referencia",    sesion.getToken().substring(0, 8).toUpperCase());
        return r;
    }

    private List<Map<String, Object>> itemsDe(PosQrSesion sesion) {
        try {
            return mapper.readValue(sesion.getItemsJson(), new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    /** Nombre de la caja que cobra: la bodega/sucursal del POS, si la hay. */
    String nombreCaja(PosQrSesion sesion) {
        if (sesion == null || sesion.getBodegaId() == null || bodegaRepo == null) return null;
        Long empresaId = sesion.getEmpresa() != null ? sesion.getEmpresa().getId() : null;
        return bodegaRepo.findById(sesion.getBodegaId())
            .filter(b -> empresaId == null || empresaId.equals(b.getEmpresaId()))
            .map(Bodega::getNombreBodega)
            .filter(PosQrSessionService::tieneTexto)
            .orElse(null);
    }

    public Map<String, Object> respuestaCajero(PosQrSesion sesion) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("token", sesion.getToken());
        r.put("total", sesion.getTotal());
        r.put("metodoPago", sesion.getMetodoPago());
        r.put("metodosHabilitados", PosQrMetodos.deSesion(sesion));
        r.put("expiracion", sesion.getFechaExpiracion().toString());
        r.put("sinpeNumero", destinoSinpe(sesion, exigirEmpresa(sesion)));
        return r;
    }

    static Empresa exigirEmpresa(PosQrSesion sesion) {
        Empresa empresa = sesion.getEmpresa();
        if (empresa == null) {
            throw new RecursoNoEncontradoException("Empresa de la sesión QR", sesion.getToken());
        }
        return empresa;
    }

    String destinoSinpe(PosQrSesion sesion, Empresa empresa) {
        if (PosQrMetodos.habilitado(sesion, PosQrMetodos.SINPE)) {
            if (onvoSinpeDestino != null && !onvoSinpeDestino.isBlank()) {
                return onvoSinpeDestino;
            }
            return "+50670196686";
        }
        return numeroSinpe(empresa);
    }

    static String numeroSinpe(Empresa empresa) {
        if (empresa == null) return "";
        if (tieneTexto(empresa.getNumeroWhatsapp())) return empresa.getNumeroWhatsapp().trim();
        if (tieneTexto(empresa.getTelefonoEmpresa())) return empresa.getTelefonoEmpresa().trim();
        return "";
    }

    private void exigirItemsDelNegocio(Long empresaId, List<Map<String, Object>> items) {
        for (Map<String, Object> item : items) {
            Long productoId = productoIdDe(item);
            Long empresaDueno = productoRepo.findEmpresaIdById(productoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));
            PosProductoDeEmpresa.exigirMismoNegocio(empresaDueno, empresaId);
        }
    }

    static Long productoIdDe(Map<String, Object> item) {
        Object raw = item.get("productoId");
        if (raw instanceof Number n) return n.longValue();
        if (raw instanceof String texto && !texto.isBlank()) {
            try {
                return Long.parseLong(texto.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Cada ítem necesita productoId");
            }
        }
        throw new IllegalArgumentException("Cada ítem necesita productoId");
    }

    static int enteroDe(Map<String, Object> item, String clave, int defecto) {
        Object raw = item.get(clave);
        if (raw == null) return defecto;
        if (raw instanceof Number n) return n.intValue();
        if (raw instanceof String texto && !texto.isBlank()) {
            try {
                return Integer.parseInt(texto.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Valor inválido en " + clave);
            }
        }
        return defecto;
    }

    public static Long longOpcional(Object raw) {
        if (raw instanceof Number n) return n.longValue();
        if (raw instanceof String texto && !texto.isBlank()) {
            try {
                return Long.parseLong(texto.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static boolean tieneTexto(String valor) {
        return valor != null && !valor.isBlank();
    }

    @Transactional
    public void cancelar(String token, Long empresaId) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));
        if (!exigirEmpresa(sesion).getId().equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }
        sesion.setEstado("CANCELADO");
        posQrRepo.save(sesion);
    }

    public PosQrSesion findSesionActiva(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("QR no encontrado"));
        if ("EXPIRADO".equals(sesion.getEstado()) || "CANCELADO".equals(sesion.getEstado())) {
            throw new NoSuchElementException("El QR ha expirado o fue cancelado");
        }
        if (LocalDateTime.now(Constants.ZONA_CR).isAfter(sesion.getFechaExpiracion()) && "PENDIENTE".equals(sesion.getEstado())) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            throw new NoSuchElementException("El QR ha expirado");
        }
        return sesion;
    }

    public ObjectMapper getMapper() {
        return mapper;
    }
}
