package com.hotclick.controller;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.utils.Constants;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.model.WaMensajeLog;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.WaMensajeLogRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import com.hotclick.service.WhatsAppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/crm/clientes")
public class CrmController {

    @Autowired private UsuarioRepository    usuarioRepository;
    @Autowired private PedidoRepository    pedidoRepository;
    @Autowired private WaMensajeLogRepository waLogRepository;
    @Autowired private CompanyScope         companyScope;
    @Autowired private TenantService        tenantService;
    @Autowired private WhatsAppService      whatsAppService;
    @Autowired private EmpresaRepository    empresaRepository;
    @Autowired private RolRepository        rolRepository;
    @Autowired private PasswordEncoder      passwordEncoder;

    private static final String MSG_REQUIERE_CRM =
        "El CRM de clientes requiere el plan NEGOCIO_PLUS. Ve a Configuración → Suscripción para mejorar tu plan.";

    private boolean sinAccesoCrm() {
        return !companyScope.isAdminIT() && !tenantService.tieneFeature("crm");
    }

    /** Un cliente "pertenece" a la empresa si compró ahí, o si la empresa lo registró manualmente (CRM). */
    private boolean clientePerteneceAEmpresa(Usuario u, Long empresaId) {
        if (empresaId == null) return true;
        if (u.getEmpresaRegistro() != null && empresaId.equals(u.getEmpresaRegistro().getId())) return true;
        return pedidoRepository.existsByUsuarioFinalIdAndEmpresaId(u.getId(), empresaId);
    }

    /** Lista clientes (USUARIO_FINAL) que han comprado en esta empresa. ADMIN ve todos. */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','SOPORTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listar() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        List<Usuario> clientes = empresaId != null
            ? usuarioRepository.findClientesByEmpresa(empresaId)
            : usuarioRepository.findClientes();
        return ResponseEntity.ok(ResponseDTO.success("OK",
            clientes.stream().map(this::toClienteMap).toList()));
    }

    /**
     * Registra manualmente un cliente (contacto) — nombre y teléfono son lo mínimo requerido.
     * No requiere plan pago: es la libreta de contactos básica, distinta al CRM avanzado.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','CAJERO')")
    @Transactional
    public ResponseEntity<?> crear(@RequestBody Map<String, String> body) {
        String nombre   = body.get("nombre");
        String telefono = body.get("telefono");
        String correo   = body.get("correo");
        if (nombre == null || nombre.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));

        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        Empresa empresa = empresaId != null ? empresaRepository.findById(empresaId).orElse(null) : null;

        String[] partes = nombre.trim().split("\\s+", 2);
        Usuario u = new Usuario();
        u.setNombre(partes[0]);
        u.setApellidoPaterno(partes.length > 1 ? partes[1] : "");
        u.setIdentificacion("CLI-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        u.setCorreo(correo != null && !correo.isBlank()
            ? correo.trim().toLowerCase()
            : "cliente-" + UUID.randomUUID() + "@sinemail.hotclick.lat");
        u.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        u.setTelefono(telefono != null && !telefono.isBlank() ? telefono.trim() : "00000000");
        u.setEstado(Constants.ESTADO_ACTIVO);
        u.setIntentosFallidos(0);
        u.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        u.setEmpresaRegistro(empresa);
        rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL).ifPresent(rol -> u.getRoles().add(rol));

        Usuario saved = usuarioRepository.save(u);
        return ResponseEntity.ok(ResponseDTO.success("Cliente registrado", toClienteMapSimple(saved)));
    }

    /** Búsqueda por nombre, correo o teléfono — acotada a la empresa del caller. */
    @GetMapping("/buscar")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','CAJERO','SUPERVISOR','SOPORTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> buscar(@RequestParam String q) {
        if (q == null || q.trim().length() < 2)
            return ResponseEntity.ok(ResponseDTO.success("OK", List.of()));
        Long empresaId = companyScope.getCurrentEmpresaId();
        List<Usuario> clientes = empresaId != null
            ? usuarioRepository.buscarClientesByEmpresa(q.trim(), empresaId)
            : usuarioRepository.buscarClientes(q.trim());
        return ResponseEntity.ok(ResponseDTO.success("OK",
            clientes.stream().limit(20).map(this::toClienteMapSimple).toList()));
    }

    /** Detalle de un cliente — valida que haya comprado en la empresa del caller. */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','SOPORTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Usuario u = usuarioRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
        // Tenant check: EMPRENDEDOR solo puede ver clientes que hayan comprado o que él registró
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (!clientePerteneceAEmpresa(u, empresaId))
            return ResponseEntity.status(403).body(ResponseDTO.error("Cliente no pertenece a esta empresa"));
        Map<String, Object> data = toClienteMap(u);
        List<Pedido> pedidos = pedidoRepository
            .findByUsuarioFinalIdOrderByFechaPedidoDesc(id, PageRequest.of(0, 10))
            .getContent();
        data.put("pedidos", pedidos);
        return ResponseEntity.ok(ResponseDTO.success("OK", data));
    }

    /** Actualiza campos CRM — valida que el cliente pertenezca a la empresa. */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    @Transactional
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (sinAccesoCrm()) return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        try {
            Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
            Long empresaId = companyScope.getCurrentEmpresaId();
            if (!clientePerteneceAEmpresa(u, empresaId))
                return ResponseEntity.status(403).body(ResponseDTO.error("Cliente no pertenece a esta empresa"));

            if (body.containsKey("segmento"))
                u.setSegmento((String) body.get("segmento"));
            if (body.containsKey("notasInternas"))
                u.setNotasInternas((String) body.get("notasInternas"));
            if (body.containsKey("limiteCredito"))
                u.setLimiteCredito(Integer.parseInt(body.get("limiteCredito").toString()));
            if (body.containsKey("puntosFidelidad"))
                u.setPuntosFidelidad(Integer.parseInt(body.get("puntosFidelidad").toString()));

            usuarioRepository.save(u);
            return ResponseEntity.ok(ResponseDTO.success("Cliente actualizado", toClienteMapSimple(u)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Suma o resta puntos de fidelidad — valida que el cliente sea de la empresa. */
    @PostMapping("/{id}/puntos")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    @Transactional
    public ResponseEntity<?> ajustarPuntos(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (sinAccesoCrm()) return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
            if (!clientePerteneceAEmpresa(u, empresaId))
                return ResponseEntity.status(403).body(ResponseDTO.error("Cliente no pertenece a esta empresa"));
            int delta = Integer.parseInt(body.getOrDefault("delta", "0").toString());
            int nuevos = Math.max(0, u.getPuntosFidelidad() + delta);
            u.setPuntosFidelidad(nuevos);
            usuarioRepository.save(u);
            return ResponseEntity.ok(ResponseDTO.success("Puntos actualizados",
                Map.of("puntosFidelidad", nuevos)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── WhatsApp ──────────────────────────────────────────────────────────────

    /**
     * Envía un mensaje de WA personalizado al cliente desde el CRM.
     * Body: { "escenario": "CONFIRMACION_PEDIDO"|"REACTIVACION"|..., "ctx": {...} }
     */
    @PostMapping("/{id}/wa")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> enviarWhatsApp(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        if (sinAccesoCrm()) return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        try {
            Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
            Long empresaId = companyScope.getCurrentEmpresaId();
            if (!clientePerteneceAEmpresa(u, empresaId))
                return ResponseEntity.status(403).body(ResponseDTO.error("Cliente no pertenece a esta empresa"));

            String escenario = (String) body.getOrDefault("escenario", "REACTIVACION");
            @SuppressWarnings("unchecked")
            Map<String, String> ctxExtra = (Map<String, String>) body.getOrDefault("ctx", Map.of());

            String textoEnviado = whatsAppService.enviarDesdecrm(u, empresaId, escenario, ctxExtra);
            return ResponseEntity.ok(ResponseDTO.success("Mensaje enviado",
                Map.of("texto", textoEnviado, "telefono", u.getTelefono() != null ? u.getTelefono() : "")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Historial de mensajes WA enviados a un cliente — para el timeline del CRM. */
    @GetMapping("/{id}/wa/historial")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','SOPORTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> historialWa(@PathVariable Long id) {
        if (sinAccesoCrm()) return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId != null && !pedidoRepository.existsByUsuarioFinalIdAndEmpresaId(id, empresaId))
            return ResponseEntity.status(403).body(ResponseDTO.error("Cliente no pertenece a esta empresa"));

        var historial = waLogRepository.findByUsuarioIdOrderByFechaEnvioDesc(
            id, PageRequest.of(0, 20));
        return ResponseEntity.ok(ResponseDTO.success("OK", historial));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> toClienteMap(Usuario u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",               u.getId());
        m.put("nombre",           u.getNombre());
        m.put("apellidoPaterno",  u.getApellidoPaterno());
        m.put("correo",           u.getCorreo());
        m.put("telefono",         u.getTelefono());
        m.put("fechaRegistro",    u.getFechaRegistro());
        m.put("fechaUltimoAcceso",u.getFechaUltimoAcceso());
        m.put("puntosFidelidad",  u.getPuntosFidelidad());
        m.put("limiteCredito",    u.getLimiteCredito());
        m.put("saldoCredito",     u.getSaldoCredito());
        m.put("notasInternas",    u.getNotasInternas());

        // Calcular stats desde pedidos si no están guardados
        int numPedidos = u.getNumPedidosHist();
        int totalCompras = u.getTotalComprasHist();
        if (numPedidos == 0) {
            List<Object[]> stats = pedidoRepository.statsPorUsuario(u.getId());
            if (!stats.isEmpty()) {
                Object[] row = stats.get(0);
                numPedidos   = row[0] != null ? ((Number) row[0]).intValue() : 0;
                totalCompras = row[1] != null ? ((Number) row[1]).intValue() : 0;
            }
        }
        m.put("numPedidosHist",   numPedidos);
        m.put("totalComprasHist", totalCompras);

        // Segmento auto-calculado si no está asignado
        String segmento = u.getSegmento();
        if (segmento == null || segmento.isBlank()) {
            segmento = calcularSegmento(numPedidos, totalCompras, u.getFechaUltimoAcceso());
        }
        m.put("segmento", segmento);
        return m;
    }

    private Map<String, Object> toClienteMapSimple(Usuario u) {
        return Map.of(
            "id",              u.getId(),
            "nombre",          u.getNombre() != null ? u.getNombre() : "",
            "apellidoPaterno", u.getApellidoPaterno() != null ? u.getApellidoPaterno() : "",
            "correo",          u.getCorreo() != null ? u.getCorreo() : "",
            "telefono",        u.getTelefono() != null ? u.getTelefono() : "",
            "puntosFidelidad", u.getPuntosFidelidad(),
            "segmento",        u.getSegmento() != null ? u.getSegmento() : "NUEVO"
        );
    }

    private String calcularSegmento(int numPedidos, int totalCompras, LocalDateTime ultimoAcceso) {
        if (numPedidos == 0) return "NUEVO";
        boolean inactivo = ultimoAcceso != null &&
            ultimoAcceso.isBefore(LocalDateTime.now(Constants.ZONA_CR).minusDays(90));
        if (inactivo && numPedidos < 5) return "INACTIVO";
        if (numPedidos >= 10 || totalCompras >= 500_000) return "VIP";
        if (numPedidos >= 2) return "FRECUENTE";
        return "NUEVO";
    }
}
