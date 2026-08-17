package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.EmpresaNombre;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuthTenantSwitchHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthTenantSwitchHandler.class);

    @Autowired private UsuarioService              usuarioService;
    @Autowired private JwtUtil                     jwtUtil;
    @Autowired private RefreshTokenService         refreshTokenService;
    @Autowired private MiembroEmpresaRepository    miembroEmpresaRepository;
    @Autowired private EmpresaRepository           empresaRepository;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<?> cambiarNegocio(Map<String, Object> body, HttpServletRequest request) {
        try {
            Usuario currentUser = authSupport.usuarioFromRequest(request);
            Long empresaId = Long.parseLong(body.get("empresaId").toString());
            // La membresía es la única fuente de verdad sobre pertenencia Y rol en
            // ESE negocio — currentUser.getRoles() es el rol global de la cuenta y
            // puede no coincidir con el rol que el usuario tiene en esta empresa.
            MiembroEmpresa membresia = miembroEmpresaRepository
                .findByUsuarioIdAndEmpresaIdAndEstado(currentUser.getId(), empresaId, 1)
                .orElse(null);
            if (membresia == null)
                return ResponseEntity.status(403).body(ResponseDTO.error("No tenés acceso a ese negocio"));
            Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Negocio no encontrado"));
            String rol = rolDeMembresia(membresia, currentUser);
            String accessToken = jwtUtil.generateToken(currentUser.getCorreo(), currentUser.getId(), rol, empresaId, empresa.getSlug());
            RefreshToken rt = refreshTokenService.crear(currentUser);
            String nombre = currentUser.getNombre() != null ? currentUser.getNombre() : currentUser.getCorreo().split("@")[0];
            AuthResponse resp = new AuthResponse(accessToken, rt.getToken(), currentUser.getId(), currentUser.getCorreo(), rol, nombre);
            resp.setEmpresaId(empresaId);
            resp.setEmpresaSlug(empresa.getSlug());
            resp.setEmpresaNombre(empresa.getNombreEmpresa());
            return ResponseEntity.ok(ResponseDTO.success("Negocio cambiado", resp));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[cambiar-negocio] {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al cambiar de negocio"));
        }
    }

    public ResponseEntity<?> misNegocios(HttpServletRequest request) {
        try {
            Usuario currentUser = authSupport.usuarioFromRequest(request);
            List<Map<String, Object>> empresas = miembroEmpresaRepository
                .findByUsuarioIdAndEstado(currentUser.getId(), 1)
                .stream().map(m -> {
                    Map<String, Object> e = new HashMap<>();
                    e.put("id",            m.getEmpresa().getId());
                    e.put("nombre",        EmpresaNombre.mostrar(m.getEmpresa(), m.getEmpresa().getNombreEmpresa()));
                    e.put("logoUrl",       m.getEmpresa().getLogoUrl());
                    e.put("slug",          m.getEmpresa().getSlug());
                    e.put("estadoEmpresa", m.getEmpresa().getEstadoEmpresa());
                    e.put("rol",           m.getRolEnEmpresa());
                    return e;
                }).toList();
            return ResponseEntity.ok(ResponseDTO.success("Negocios", empresas));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al cargar negocios"));
        }
    }

    public ResponseEntity<?> seleccionarEmpresa(Map<String, Object> body) {
        String tempToken = (String) body.get("tempToken");
        Object empresaIdRaw = body.get("empresaId");
        if (tempToken == null || empresaIdRaw == null)
            return ResponseEntity.badRequest().body(ResponseDTO.error("Datos incompletos"));
        try {
            if (!jwtUtil.isEmpresaSelectionToken(tempToken))
                return ResponseEntity.status(401).body(ResponseDTO.error("Token inválido o expirado"));
            Long userId    = jwtUtil.extractUserId(tempToken);
            Long empresaId = Long.parseLong(empresaIdRaw.toString());
            Usuario usuario = usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
            MiembroEmpresa membresia = miembroEmpresaRepository
                .findByUsuarioIdAndEmpresaIdAndEstado(userId, empresaId, 1)
                .orElse(null);
            if (membresia == null)
                return ResponseEntity.status(403).body(ResponseDTO.error("No tenés acceso a ese negocio"));
            Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Negocio no encontrado"));
            // Generar JWT apuntando a la empresa seleccionada, con el rol QUE TIENE
            // en esa empresa (no el rol global de la cuenta)
            String rol          = rolDeMembresia(membresia, usuario);
            String accessToken = jwtUtil.generateToken(usuario.getCorreo(), userId, rol, empresaId, empresa.getSlug());
            RefreshToken rt    = refreshTokenService.crear(usuario);
            String nombre      = usuario.getNombre() != null ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
            AuthResponse resp  = new AuthResponse(accessToken, rt.getToken(), userId, usuario.getCorreo(), rol, nombre);
            resp.setEmpresaId(empresaId);
            resp.setEmpresaSlug(empresa.getSlug());
            resp.setEmpresaNombre(empresa.getNombreEmpresa());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            log.error("[seleccionar-empresa] {}", e.getMessage(), e);
            return ResponseEntity.status(401).body(ResponseDTO.error("Token expirado o inválido"));
        }
    }

    static String rolDeMembresia(MiembroEmpresa membresia, Usuario usuario) {
        if (membresia.getRolEnEmpresa() != null && !membresia.getRolEnEmpresa().isBlank()) {
            return membresia.getRolEnEmpresa();
        }
        if (usuario.getRoles().isEmpty()) return "USUARIO_FINAL";
        return usuario.getRoles().get(0).getNombreRol();
    }
}
