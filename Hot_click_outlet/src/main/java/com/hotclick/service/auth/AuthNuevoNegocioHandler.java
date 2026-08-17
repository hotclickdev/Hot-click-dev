package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthNuevoNegocioHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthNuevoNegocioHandler.class);

    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private RolRepository            rolRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private JwtUtil                  jwtUtil;
    @Autowired private RefreshTokenService      refreshTokenService;
    @Autowired private UsuarioService           usuarioService;
    @Autowired private AuthSupport              authSupport;

    public ResponseEntity<?> nuevoNegocio(RegistroEmpresaDTO dto, HttpServletRequest request) {
        try {
            Usuario currentUser = authSupport.usuarioFromRequest(request);
            if (miembroEmpresaRepository.countEmpresasByUsuarioId(currentUser.getId()) >= 20) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Alcanzaste el límite de 20 negocios por cuenta"));
            }

            ResponseEntity<?> validacion = validarDto(dto);
            if (validacion != null) return validacion;

            Empresa empresa = crearEmpresa(dto);
            miembroEmpresaRepository.save(new MiembroEmpresa(currentUser, empresa, "PROPIETARIO"));
            asegurarRolEmprendedor(currentUser);

            notificacionEmailService.enviarBienvenidaEmprendedor(
                currentUser.getCorreo(), currentUser.getNombre(),
                empresa.getNombreComercial());

            return ResponseEntity.ok(ResponseDTO.success("Negocio creado exitosamente", buildAuthResponse(currentUser, empresa)));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[nuevo-negocio] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al crear el negocio"));
        }
    }

    private ResponseEntity<?> validarDto(RegistroEmpresaDTO dto) {
        if (dto.getNombreEmpresa() == null || dto.getNombreEmpresa().isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre del negocio es requerido"));
        }
        if (dto.getCorreoEmpresa() == null || dto.getCorreoEmpresa().isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo oficial del negocio es requerido"));
        }
        String correoEmpresa = dto.getCorreoEmpresa().trim().toLowerCase();
        if (empresaRepository.existsByCorreoEmpresa(correoEmpresa)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Ese correo de negocio ya está en uso"));
        }
        return null;
    }

    private Empresa crearEmpresa(RegistroEmpresaDTO dto) {
        String slug = authSupport.slugify(dto.getNombreEmpresa());
        int i = 2;
        String base = slug;
        while (empresaRepository.existsBySlug(slug)) { slug = base + "-" + i++; }

        String correoEmpresa = dto.getCorreoEmpresa().trim().toLowerCase();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa(dto.getNombreEmpresa().trim());
        empresa.setNombreComercial(dto.getNombreComercial() != null && !dto.getNombreComercial().isBlank()
            ? dto.getNombreComercial().trim() : dto.getNombreEmpresa().trim());
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(correoEmpresa);
        empresa.setTelefonoEmpresa(dto.getTelefonoEmpresa());
        empresa.setPlanSaas("GRATUITO");
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa.setEstado(Constants.ESTADO_ACTIVO);
        return empresaRepository.save(empresa);
    }

    private void asegurarRolEmprendedor(Usuario currentUser) {
        boolean tieneRol = currentUser.getRoles().stream()
            .anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));
        if (!tieneRol) {
            rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
                .ifPresent(r -> { currentUser.getRoles().add(r); usuarioService.guardar(currentUser); });
        }
    }

    private AuthResponse buildAuthResponse(Usuario currentUser, Empresa empresa) {
        String rol         = Constants.ROL_EMPRENDEDOR;
        String accessToken = jwtUtil.generateToken(currentUser.getCorreo(), currentUser.getId(), rol, empresa.getId(), empresa.getSlug());
        RefreshToken rt    = refreshTokenService.crear(currentUser);
        String nombre      = currentUser.getNombre() != null ? currentUser.getNombre() : currentUser.getCorreo().split("@")[0];
        AuthResponse resp  = new AuthResponse(accessToken, rt.getToken(), currentUser.getId(), currentUser.getCorreo(), rol, nombre);
        resp.setEmpresaId(empresa.getId());
        resp.setEmpresaSlug(empresa.getSlug());
        resp.setEmpresaNombre(empresa.getNombreEmpresa());
        return resp;
    }
}
