package com.hotclick.controller;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.controller.crm.CrmAccessGuard;
import com.hotclick.controller.crm.CrmClienteMapper;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.WaMensajeLogRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.UsuarioService;
import com.hotclick.service.WhatsAppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/crm/clientes")
public class CrmController {

    @Autowired private UsuarioRepository    usuarioRepository;
    @Autowired private PedidoRepository    pedidoRepository;
    @Autowired private WaMensajeLogRepository waLogRepository;
    @Autowired private CompanyScope         companyScope;
    @Autowired private WhatsAppService      whatsAppService;
    @Autowired private EmpresaRepository    empresaRepository;
    @Autowired private UsuarioService       usuarioService;
    @Autowired private CrmAccessGuard       crmAccessGuard;
    @Autowired private CrmClienteMapper     crmClienteMapper;

    private static final String MSG_REQUIERE_CRM =
        "El CRM de clientes requiere el plan NEGOCIO_PLUS. Ve a Configuración → Suscripción para mejorar tu plan.";

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
            clientes.stream().map(crmClienteMapper::toClienteMap).toList()));
    }

    /**
     * Registra manualmente un cliente (contacto) — nombre y teléfono son lo mínimo requerido.
     * Decisión de producto: crear cliente es gratis en todo plan (parte del flujo básico de
     * venta); lo que queda exclusivo de NEGOCIO_PLUS son las funciones avanzadas del CRM
     * (segmentación, puntos, IA de comportamiento).
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

        Usuario saved = usuarioService.crearClienteRapido(nombre, telefono, correo, empresa);
        return ResponseEntity.ok(ResponseDTO.success("Cliente registrado", crmClienteMapper.toClienteMapSimple(saved)));
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
            clientes.stream().limit(20).map(crmClienteMapper::toClienteMapSimple).toList()));
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
        if (!crmAccessGuard.clientePerteneceAEmpresa(u, empresaId))
            return ResponseEntity.status(403).body(ResponseDTO.error("Cliente no pertenece a esta empresa"));
        Map<String, Object> data = crmClienteMapper.toClienteMap(u);
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
        try {
            Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
            Long empresaId = companyScope.getCurrentEmpresaId();
            if (!crmAccessGuard.clientePerteneceAEmpresa(u, empresaId))
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
            return ResponseEntity.ok(ResponseDTO.success("Cliente actualizado", crmClienteMapper.toClienteMapSimple(u)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Suma o resta puntos de fidelidad — valida que el cliente sea de la empresa. */
    @PostMapping("/{id}/puntos")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    @Transactional
    public ResponseEntity<?> ajustarPuntos(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
            if (!crmAccessGuard.clientePerteneceAEmpresa(u, empresaId))
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
        if (crmAccessGuard.sinAccesoCrm()) return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        try {
            Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
            Long empresaId = companyScope.getCurrentEmpresaId();
            if (!crmAccessGuard.clientePerteneceAEmpresa(u, empresaId))
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
        if (crmAccessGuard.sinAccesoCrm()) return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId != null && !pedidoRepository.existsByUsuarioFinalIdAndEmpresaId(id, empresaId))
            return ResponseEntity.status(403).body(ResponseDTO.error("Cliente no pertenece a esta empresa"));

        var historial = waLogRepository.findByUsuarioIdOrderByFechaEnvioDesc(
            id, PageRequest.of(0, 20));
        return ResponseEntity.ok(ResponseDTO.success("OK", historial));
    }
}
