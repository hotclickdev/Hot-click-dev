package com.hotclick.legal;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.SesionesUsuarioService;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Derechos ARCO del titular: acceso y cierre de cuenta.
 * Los pedidos se conservan 5 años por Hacienda, desvinculados del contacto.
 */
@Service
public class CuentaTitularService {

    private final UsuarioRepository usuarioRepository;
    private final PedidoRepository pedidoRepository;
    private final SesionesUsuarioService sesionesUsuarioService;

    public CuentaTitularService(UsuarioRepository usuarioRepository,
                                PedidoRepository pedidoRepository,
                                SesionesUsuarioService sesionesUsuarioService) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
        this.sesionesUsuarioService = sesionesUsuarioService;
    }

    public Map<String, Object> exportar(Usuario usuario) {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("id", usuario.getId());
        datos.put("nombre", usuario.getNombre());
        datos.put("apellidoPaterno", usuario.getApellidoPaterno());
        datos.put("apellidoMaterno", usuario.getApellidoMaterno());
        datos.put("correo", usuario.getCorreo());
        datos.put("telefono", usuario.getTelefono());
        datos.put("identificacion", com.hotclick.utils.CedulaCr.realONulo(usuario.getIdentificacion()));
        datos.put("fechaRegistro", usuario.getFechaRegistro());
        datos.put("pedidos", resumenPedidos(usuario.getId()));
        return datos;
    }

    @Transactional
    public void cerrar(Usuario usuario) {
        if (usuario.getEstado() != null && usuario.getEstado() == Constants.ESTADO_ELIMINADO) {
            return;
        }
        Long id = usuario.getId();
        // La caché de UserDetails del filtro JWT está indexada por el correo con el que se emitió el token: hay que
        // invalidarla con el correo de antes del cierre, que se renombra enseguida.
        String correoPrevio = usuario.getCorreo();
        usuario.setCorreo("cerrada." + id + "@invalid.hotclick.lat");
        usuario.setTelefono("00000000");
        usuario.setTelefonoAlterno(null);
        usuario.setNombre("Cuenta");
        usuario.setApellidoPaterno("Cerrada");
        usuario.setApellidoMaterno(null);
        usuario.setFotoPerfilUrl(null);
        usuario.setClerkUserId(null);
        usuario.setEstado(Constants.ESTADO_ELIMINADO);
        usuarioRepository.save(usuario);
        // Marca sesionesInvalidadasEn, revoca los refresh tokens e invalida la caché (correo previo y nuevo).
        sesionesUsuarioService.cortarSesiones(usuario, correoPrevio);
    }

    private List<Map<String, Object>> resumenPedidos(Long usuarioId) {
        return pedidoRepository.findByUsuarioFinalIdWithItems(usuarioId).stream()
            .map(CuentaTitularService::resumenPedido)
            .toList();
    }

    private static Map<String, Object> resumenPedido(Pedido p) {
        Map<String, Object> fila = new LinkedHashMap<>();
        fila.put("numero", p.getNumeroPedido());
        fila.put("fecha", p.getFechaPedido());
        fila.put("total", p.getTotalPedido());
        fila.put("estado", p.getEstadoPedido());
        return fila;
    }
}
