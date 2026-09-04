package com.hotclick.service;

import com.hotclick.dto.TicketSoporteUpdateRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.TicketSoporte;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TicketSoporteRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class TicketSoporteService {

    private static final Logger log = LoggerFactory.getLogger(TicketSoporteService.class);
    private static final Set<String> ESTADOS_FILTRO = Set.of(
        TicketSoporte.ABIERTO, TicketSoporte.ASIGNADO, TicketSoporte.RESUELTO);
    private static final String ACCION_ASIGNAR = "ASIGNAR";
    private static final String ACCION_RESOLVER = "RESOLVER";

    private final TicketSoporteRepository ticketRepo;
    private final EmpresaRepository empresaRepo;
    private final CompanyScope companyScope;
    private final InputSanitizer sanitizer;
    private final ResendEmailService emailService;

    @Value("${soporte.tickets.email:hotclick.cr@gmail.com}")
    private String soporteTicketsEmail;

    public TicketSoporteService(
            TicketSoporteRepository ticketRepo,
            EmpresaRepository empresaRepo,
            CompanyScope companyScope,
            InputSanitizer sanitizer,
            ResendEmailService emailService) {
        this.ticketRepo = ticketRepo;
        this.empresaRepo = empresaRepo;
        this.companyScope = companyScope;
        this.sanitizer = sanitizer;
        this.emailService = emailService;
    }

    @Transactional
    public Map<String, Object> crear(String titulo, String descripcion, String fotoUrl) {
        if (titulo == null || titulo.isBlank()) {
            throw new IllegalArgumentException("El título es requerido");
        }
        if (descripcion == null || descripcion.isBlank()) {
            throw new IllegalArgumentException("La descripción es requerida");
        }
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            throw new IllegalArgumentException("No se pudo determinar el negocio del usuario");
        }
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new IllegalArgumentException("Negocio no encontrado"));
        Usuario usuario = companyScope.getCurrentUser();

        TicketSoporte t = new TicketSoporte();
        t.setEmpresa(empresa);
        t.setUsuario(usuario);
        t.setTitulo(sanitizer.cleanWithLimit(titulo.trim(), 150));
        t.setDescripcion(sanitizer.cleanWithLimit(descripcion.trim(), 4000));
        if (fotoUrl != null && !fotoUrl.isBlank()) {
            t.setFotoUrl(sanitizer.cleanWithLimit(fotoUrl.trim(), 500));
        }
        TicketSoporte guardado = ticketRepo.save(t);
        notificarPorEmail(guardado, empresa, usuario);
        return toMap(guardado);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarAdmin(Long empresaId, String estado) {
        assertAdminInbox();
        if (empresaId != null) {
            companyScope.assertCanAccess(empresaId);
        }
        String estadoNorm = normalizarEstadoFiltro(estado);
        return ticketRepo.findAdminFiltrado(empresaId, estadoNorm).stream()
            .map(this::toMap)
            .toList();
    }

    @Transactional
    public Map<String, Object> actualizarAdmin(Long id, TicketSoporteUpdateRequest req) {
        assertAdminInbox();
        String accion = req.getAccion() == null ? "" : req.getAccion().trim().toUpperCase(Locale.ROOT);
        if (ACCION_ASIGNAR.equals(accion)) {
            return asignar(id);
        }
        if (ACCION_RESOLVER.equals(accion)) {
            return resolver(id, req.getNotasAdmin());
        }
        throw new IllegalArgumentException("Acción inválida: use ASIGNAR o RESOLVER");
    }

    private Map<String, Object> asignar(Long id) {
        TicketSoporte t = buscar(id);
        if (TicketSoporte.RESUELTO.equals(t.getEstado())) {
            throw new IllegalStateException("El ticket ya está resuelto");
        }
        Usuario admin = companyScope.getCurrentUser();
        if (admin == null) {
            throw new IllegalStateException("No se pudo identificar al administrador");
        }
        t.setAsignado(admin);
        t.setEstado(TicketSoporte.ASIGNADO);
        t.setFechaAsignacion(LocalDateTime.now(Constants.ZONA_CR));
        return toMap(ticketRepo.save(t));
    }

    private Map<String, Object> resolver(Long id, String notasAdmin) {
        TicketSoporte t = buscar(id);
        if (TicketSoporte.RESUELTO.equals(t.getEstado())) {
            throw new IllegalStateException("El ticket ya está resuelto");
        }
        if (t.getAsignado() == null) {
            Usuario admin = companyScope.getCurrentUser();
            if (admin != null) {
                t.setAsignado(admin);
                t.setFechaAsignacion(LocalDateTime.now(Constants.ZONA_CR));
            }
        }
        t.setEstado(TicketSoporte.RESUELTO);
        t.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        if (notasAdmin != null && !notasAdmin.isBlank()) {
            t.setNotasAdmin(sanitizer.cleanWithLimit(notasAdmin.trim(), 2000));
        }
        return toMap(ticketRepo.save(t));
    }

    private TicketSoporte buscar(Long id) {
        TicketSoporte t = ticketRepo.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Ticket", id));
        companyScope.assertCanAccessNullable(
            t.getEmpresa() != null ? t.getEmpresa().getId() : null);
        return t;
    }

    private void assertAdminInbox() {
        if (!companyScope.isAdminIT()) {
            throw new TenantAccessDeniedException("Solo el staff de plataforma puede gestionar tickets");
        }
    }

    private String normalizarEstadoFiltro(String estado) {
        if (estado == null || estado.isBlank() || "ALL".equalsIgnoreCase(estado)) {
            return null;
        }
        String norm = estado.trim().toUpperCase(Locale.ROOT);
        if (!ESTADOS_FILTRO.contains(norm)) {
            throw new IllegalArgumentException("Estado inválido");
        }
        return norm;
    }

    Map<String, Object> toMap(TicketSoporte t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("titulo", t.getTitulo());
        m.put("descripcion", t.getDescripcion());
        m.put("fotoUrl", t.getFotoUrl());
        m.put("estado", t.getEstado());
        m.put("notasAdmin", t.getNotasAdmin());
        m.put("fechaCreacion", t.getFechaCreacion());
        m.put("fechaAsignacion", t.getFechaAsignacion());
        m.put("fechaResolucion", t.getFechaResolucion());
        if (t.getEmpresa() != null) {
            m.put("empresaId", t.getEmpresa().getId());
            m.put("empresaNombre", t.getEmpresa().getNombreComercial() != null
                ? t.getEmpresa().getNombreComercial()
                : t.getEmpresa().getNombreEmpresa());
            m.put("empresaSlug", t.getEmpresa().getSlug());
        }
        Usuario u = t.getUsuario();
        if (u != null) {
            m.put("usuarioId", u.getId());
            m.put("usuarioNombre", u.getNombre());
            m.put("usuarioCorreo", u.getCorreo());
        }
        Usuario a = t.getAsignado();
        if (a != null) {
            m.put("asignadoId", a.getId());
            m.put("asignadoNombre", a.getNombre());
            m.put("asignadoCorreo", a.getCorreo());
        }
        return m;
    }

    private void notificarPorEmail(TicketSoporte t, Empresa empresa, Usuario usuario) {
        Thread.ofVirtual().start(() -> {
            try {
                String asunto = "[HOTCLICK SOPORTE] " + t.getTitulo() + " — " + empresa.getNombreEmpresa();
                String html = "<div style='font-family:sans-serif;max-width:600px'>" +
                    "<h2 style='color:#1747A8'>Nuevo ticket de soporte</h2>" +
                    "<table style='border-collapse:collapse;width:100%'>" +
                    "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Negocio</td>" +
                    "<td style='padding:6px 12px'>" + empresa.getNombreEmpresa() + "</td></tr>" +
                    "<tr style='background:#f9fafb'><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Usuario</td>" +
                    "<td style='padding:6px 12px'>" + (usuario != null ? usuario.getNombre() + " (" + usuario.getCorreo() + ")" : "—") + "</td></tr>" +
                    "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Título</td>" +
                    "<td style='padding:6px 12px'>" + t.getTitulo() + "</td></tr>" +
                    "<tr style='background:#f9fafb'><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Descripción</td>" +
                    "<td style='padding:6px 12px'>" + t.getDescripcion() + "</td></tr>" +
                    (t.getFotoUrl() != null
                        ? "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Foto</td>" +
                          "<td style='padding:6px 12px'><a href='" + t.getFotoUrl() + "'>" + t.getFotoUrl() + "</a></td></tr>"
                        : "") +
                    "</table>" +
                    "</div>";
                emailService.send(soporteTicketsEmail, asunto, html);
            } catch (Exception e) {
                log.warn("[soporte/tickets] No se pudo enviar email de notificación id={}: {}", t.getId(), e.getMessage());
            }
        });
    }
}
