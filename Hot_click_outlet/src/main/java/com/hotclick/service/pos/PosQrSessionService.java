package com.hotclick.service.pos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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

    private final ObjectMapper mapper = new ObjectMapper();

    @Transactional
    public PosQrSesion crearSesion(Long usuarioId, Long empresaId, Long turnoId,
                            String metodoPago, List<Map<String, Object>> items,
                            String notas) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("El carrito no puede estar vacío");
        }
        if (!"SINPE".equals(metodoPago) && !"TARJETA".equals(metodoPago)) {
            throw new IllegalArgumentException("Método de pago debe ser SINPE o TARJETA");
        }
        exigirItemsDelNegocio(empresaId, items);

        Usuario usuario  = usuarioRepo.findById(usuarioId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));
        Empresa empresa  = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));

        int total = items.stream()
            .mapToInt(i -> ((Number) i.getOrDefault("precioUnitario", 0)).intValue()
                        * ((Number) i.getOrDefault("cantidad", 1)).intValue())
            .sum();

        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken(UUID.randomUUID().toString().replace("-", ""));
        sesion.setEmpresa(empresa);
        sesion.setUsuario(usuario);
        sesion.setTotal(total);
        sesion.setMetodoPago(metodoPago);
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

        String sinpeNumero = numeroSinpe(empresa);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("token",        sesion.getToken());
        r.put("estado",       sesion.getEstado());
        r.put("metodoPago",   sesion.getMetodoPago());
        r.put("total",        sesion.getTotal());
        r.put("items",        items);
        r.put("expiracion",   sesion.getFechaExpiracion().toString());
        r.put("empresaNombre", empresa.getNombreComercial() != null
            ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        r.put("logoUrl",      empresa.getLogoUrl());
        r.put("colorPrimario", empresa.getColorPrimario());
        // SINPE: número de teléfono y referencia (primeros 8 chars del token)
        r.put("sinpeNumero",  sinpeNumero);
        r.put("sinpeRef",     sesion.getToken().substring(0, 8).toUpperCase());
        return r;
    }

    public Map<String, Object> respuestaCajero(PosQrSesion sesion) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("token", sesion.getToken());
        r.put("total", sesion.getTotal());
        r.put("metodoPago", sesion.getMetodoPago());
        r.put("expiracion", sesion.getFechaExpiracion().toString());
        r.put("sinpeNumero", numeroSinpe(exigirEmpresa(sesion)));
        return r;
    }

    static Empresa exigirEmpresa(PosQrSesion sesion) {
        Empresa empresa = sesion.getEmpresa();
        if (empresa == null) {
            throw new RecursoNoEncontradoException("Empresa de la sesión QR", sesion.getToken());
        }
        return empresa;
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

    private static Long productoIdDe(Map<String, Object> item) {
        Object raw = item.get("productoId");
        if (raw instanceof Number n) return n.longValue();
        throw new IllegalArgumentException("Cada ítem necesita productoId");
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
