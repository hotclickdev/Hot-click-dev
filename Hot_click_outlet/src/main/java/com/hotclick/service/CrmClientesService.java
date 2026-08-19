package com.hotclick.service;

import com.hotclick.controller.crm.CrmAccessGuard;
import com.hotclick.controller.crm.CrmClienteMapper;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.WaMensajeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class CrmClientesService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private WaMensajeLogRepository waLogRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private UsuarioService usuarioService;
    @Autowired private WhatsAppService whatsAppService;
    @Autowired private CrmAccessGuard crmAccessGuard;
    @Autowired private CrmClienteMapper crmClienteMapper;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(Long empresaId) {
        List<Usuario> clientes = empresaId != null
            ? usuarioRepository.findClientesByEmpresa(empresaId)
            : usuarioRepository.findClientes();
        return clientes.stream().map(crmClienteMapper::toClienteMap).toList();
    }

    @Transactional
    public Map<String, Object> crear(String nombre, String telefono, String correo, Long empresaId) {
        Empresa empresa = empresaId != null ? empresaRepository.findById(empresaId).orElse(null) : null;
        Usuario saved = usuarioService.crearClienteRapido(nombre, telefono, correo, empresa);
        return crmClienteMapper.toClienteMapSimple(saved);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> buscar(String q, Long empresaId) {
        if (q == null || q.trim().length() < 2) return List.of();
        List<Usuario> clientes = empresaId != null
            ? usuarioRepository.buscarClientesByEmpresa(q.trim(), empresaId)
            : usuarioRepository.buscarClientes(q.trim());
        return clientes.stream().limit(20).map(crmClienteMapper::toClienteMapSimple).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long id, Long empresaId) {
        Usuario u = clienteDeEmpresa(id, empresaId);
        Map<String, Object> data = crmClienteMapper.toClienteMap(u);
        data.put("pedidos", pedidoRepository
            .findByUsuarioFinalIdOrderByFechaPedidoDesc(id, PageRequest.of(0, 10))
            .getContent());
        return data;
    }

    @Transactional
    public Map<String, Object> actualizar(Long id, Long empresaId, Map<String, Object> body) {
        Usuario u = clienteDeEmpresa(id, empresaId);
        if (body.containsKey("segmento")) u.setSegmento((String) body.get("segmento"));
        if (body.containsKey("notasInternas")) u.setNotasInternas((String) body.get("notasInternas"));
        if (body.containsKey("limiteCredito")) {
            u.setLimiteCredito(Integer.parseInt(body.get("limiteCredito").toString()));
        }
        if (body.containsKey("puntosFidelidad")) {
            u.setPuntosFidelidad(Integer.parseInt(body.get("puntosFidelidad").toString()));
        }
        usuarioRepository.save(u);
        return crmClienteMapper.toClienteMapSimple(u);
    }

    @Transactional
    public int ajustarPuntos(Long id, Long empresaId, int delta) {
        Usuario u = clienteDeEmpresa(id, empresaId);
        int nuevos = Math.max(0, u.getPuntosFidelidad() + delta);
        u.setPuntosFidelidad(nuevos);
        usuarioRepository.save(u);
        return nuevos;
    }

    @Transactional(readOnly = true)
    public Map<String, String> enviarWhatsApp(Long id, Long empresaId, String escenario, Map<String, String> ctxExtra) {
        Usuario u = clienteDeEmpresa(id, empresaId);
        String textoEnviado = whatsAppService.enviarDesdecrm(u, empresaId, escenario, ctxExtra);
        return Map.of("texto", textoEnviado, "telefono", u.getTelefono() != null ? u.getTelefono() : "");
    }

    @Transactional(readOnly = true)
    public Object historialWa(Long id, Long empresaId) {
        if (empresaId != null && !pedidoRepository.existsByUsuarioFinalIdAndEmpresaId(id, empresaId)) {
            throw new TenantAccessDeniedException("Cliente no pertenece a esta empresa");
        }
        return waLogRepository.findByUsuarioIdOrderByFechaEnvioDesc(id, PageRequest.of(0, 20));
    }

    private Usuario clienteDeEmpresa(Long id, Long empresaId) {
        Usuario u = usuarioRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado"));
        if (!crmAccessGuard.clientePerteneceAEmpresa(u, empresaId)) {
            throw new TenantAccessDeniedException("Cliente no pertenece a esta empresa");
        }
        return u;
    }
}
