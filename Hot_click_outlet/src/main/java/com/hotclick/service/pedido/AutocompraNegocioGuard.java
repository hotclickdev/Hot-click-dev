package com.hotclick.service.pedido;

import com.hotclick.exception.AutocompraNegocioException;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Objects;

/**
 * G1b: impide que el comprador sea del negocio vendedor. Un usuario es "del negocio" si su
 * {@code empresa} (fk_id_empresa) es esa empresa o es miembro activo de ella (MiembroEmpresa).
 * Un invitado se identifica solo por su correo (GuestUserResolver reutiliza el usuario existente).
 */
@Component
public class AutocompraNegocioGuard {

    private static final int MIEMBRO_ACTIVO = 1;

    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    public boolean esDelNegocio(Usuario usuario, Long empresaId) {
        if (usuario == null || empresaId == null) return false;
        if (Objects.equals(usuario.getEmpresaId(), empresaId)) return true;
        return usuario.getId() != null
            && miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(usuario.getId(), empresaId, MIEMBRO_ACTIVO);
    }

    public void exigirNoEsDelNegocio(Usuario usuario, Long empresaId) {
        if (esDelNegocio(usuario, empresaId)) throw new AutocompraNegocioException();
    }

    /** Invitado: ademas del usuario resuelto, revisa toda cuenta cuyo correo coincida sin distinguir mayusculas. */
    public void exigirCorreoNoEsDelNegocio(String correo, Collection<Pedido> pedidos) {
        if (correo == null || correo.isBlank()) return;
        for (Usuario u : usuarioRepository.findAllByCorreoIgnoreCase(correo.trim())) {
            exigirNoEsDelNegocio(u, pedidos);
        }
    }

    public void exigirNoEsDelNegocio(Usuario usuario, Collection<Pedido> pedidos) {
        for (Pedido p : pedidos) exigirNoEsDelNegocio(usuario, p.getEmpresaId());
    }
}
