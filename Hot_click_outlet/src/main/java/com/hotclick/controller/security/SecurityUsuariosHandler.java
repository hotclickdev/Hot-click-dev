package com.hotclick.controller.security;

import com.hotclick.model.SecurityAuditLog;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Perfiles de usuario y eventos por email del Security Center.
 * Extraído bit-idéntico de SecurityController — no cambia comportamiento.
 */
@Component
class SecurityUsuariosHandler {

    @Autowired private SecurityAuditLogRepository auditRepo;
    @Autowired private UsuarioRepository          usuarioRepo;

    @Transactional(readOnly = true)
    ResponseEntity<Map<String, Object>> getUsuariosSeguridadLista(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(size, 50);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by("fechaUltimoAcceso").descending());
        var usuarios = usuarioRepo.findAll(pageable);

        List<Map<String, Object>> result = usuarios.getContent().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",                u.getId());
            m.put("nombre",            u.getNombre() + " " + (u.getApellidoPaterno() != null ? u.getApellidoPaterno() : ""));
            m.put("correo",            u.getCorreo());
            m.put("fechaRegistro",     u.getFechaRegistro());
            m.put("fechaUltimoAcceso", u.getFechaUltimoAcceso());
            m.put("intentosFallidos",  u.getIntentosFallidos());
            m.put("bloqueadoHasta",    u.getBloqueadoHasta());
            m.put("twoFactorEnabled",  Boolean.TRUE.equals(u.getTwoFactorEnabled()));
            m.put("twoFactorMethods",  u.getTwoFactorMethods());
            m.put("roles",             u.getRoles().stream().map(r -> r.getNombreRol()).collect(Collectors.toList()));
            long loginsOk   = auditRepo.countByEmailAndEventType(u.getCorreo(), "LOGIN_SUCCESS");
            long loginsFail = auditRepo.countByEmailAndEventType(u.getCorreo(), "LOGIN_FAILED");
            m.put("loginsExitosos",  loginsOk);
            m.put("loginsFallidos",  loginsFail);
            m.put("ipsDistintas",    auditRepo.findDistinctIpsByEmail(u.getCorreo()).size());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content",       result);
        resp.put("totalElements", usuarios.getTotalElements());
        resp.put("totalPages",    usuarios.getTotalPages());
        resp.put("page",          usuarios.getNumber());
        return ResponseEntity.ok(resp);
    }

    ResponseEntity<Map<String, Object>> getEventosPorUsuario(String email) {
        List<SecurityAuditLog> eventos = auditRepo.findTop50ByEmailOrderByTimestampDesc(email);
        List<String>           ips     = auditRepo.findDistinctIpsByEmail(email);

        Map<String, Long> porTipo = new LinkedHashMap<>();
        for (Object[] row : auditRepo.countByEventTypeForEmail(email)) {
            porTipo.put((String) row[0], (Long) row[1]);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("eventos",    eventos);
        resp.put("ips",        ips);
        resp.put("porTipo",    porTipo);
        resp.put("total",      auditRepo.countByEmail(email));
        return ResponseEntity.ok(resp);
    }
}
