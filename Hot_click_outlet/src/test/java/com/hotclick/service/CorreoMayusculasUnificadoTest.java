package com.hotclick.service;

import com.hotclick.controller.storefront.StorefrontGuestOrderService;
import com.hotclick.dto.StorefrontPedidoDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.auth.ClerkSyncService;
import com.hotclick.service.payment.GuestUserResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Re-auditoría área 2 (MED-5): las vías que buscan o crean usuarios por correo (checkout de invitado, pedido de
 * tienda, Clerk) no normalizaban el correo como el registro y el login (trim + minúsculas): un invitado
 * «Ana@Test.CR» creaba una cuenta distinta de «ana@test.cr» y el login normalizado no la encontraba.
 * Datos ficticios. Solo usa API pública que ya existía, para correr igual contra el código anterior.
 */
@DisplayName("[MEDIO] Correo con mayúsculas se normaliza en invitado, tienda y Clerk")
class CorreoMayusculasUnificadoTest {

    private static final String MIXTO = "  Cliente.Mixto@Test.CR ";
    private static final String NORMAL = "cliente.mixto@test.cr";

    @Test
    @DisplayName("GuestUserResolver: busca y crea al invitado con el correo normalizado")
    void guestUserResolver() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        when(repo.findByCorreo(anyString())).thenReturn(Optional.empty());
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        PasswordEncoder enc = mock(PasswordEncoder.class);
        when(enc.encode(any())).thenReturn("hash-fict");
        GuestUserResolver r = new GuestUserResolver();
        ReflectionTestUtils.setField(r, "usuarioRepository", repo);
        ReflectionTestUtils.setField(r, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(r, "passwordEncoder", enc);

        Usuario u = r.resolve(MIXTO, "8888-0000");

        verify(repo).findByCorreo(NORMAL);
        assertThat(u.getCorreo()).isEqualTo(NORMAL);
    }

    @Test
    @DisplayName("GuestUserResolver: reutiliza la cuenta existente aunque el comprador escriba mayúsculas")
    void guestUserResolverReutiliza() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        Usuario existente = new Usuario();
        existente.setCorreo(NORMAL);
        when(repo.findByCorreo(NORMAL)).thenReturn(Optional.of(existente));
        PasswordEncoder enc = mock(PasswordEncoder.class);
        when(enc.encode(any())).thenReturn("hash-fict");
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        GuestUserResolver r = new GuestUserResolver();
        ReflectionTestUtils.setField(r, "usuarioRepository", repo);
        ReflectionTestUtils.setField(r, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(r, "passwordEncoder", enc);

        assertThat(r.resolve(MIXTO, null)).isSameAs(existente);
    }

    @Test
    @DisplayName("StorefrontGuestOrderService: el invitado de la tienda se busca y se crea con el correo normalizado")
    void storefrontInvitado() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        when(repo.findByCorreo(anyString())).thenReturn(Optional.empty());
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        BodegaRepository bodegas = mock(BodegaRepository.class);
        when(bodegas.findByEmpresaIdAndEstado(anyLong(), any())).thenReturn(List.of(new Bodega()));
        ProductoRepository productos = mock(ProductoRepository.class);
        when(productos.findByIdForUpdate(anyLong())).thenReturn(Optional.empty()); // corta después de crear al invitado
        PasswordEncoder enc = mock(PasswordEncoder.class);
        when(enc.encode(any())).thenReturn("hash-fict");
        StorefrontGuestOrderService svc = new StorefrontGuestOrderService(bodegas, mock(PedidoRepository.class),
            productos, repo, mock(RolRepository.class), mock(StockService.class), enc,
            mock(N8nWebhookService.class), mock(NotificacionEmailService.class));
        Empresa e = new Empresa();
        e.setId(7L);
        e.setSlug("tienda-fict");
        StorefrontPedidoDTO dto = new StorefrontPedidoDTO();
        dto.setCorreoCliente(MIXTO);
        dto.setTelefonoCliente("8888-0000");
        dto.setItems(List.of(new StorefrontPedidoDTO.ItemDTO(1L, 1)));

        try {
            svc.crearPedido(e, dto);
        } catch (IllegalArgumentException esperado) {
            // producto inexistente: el invitado ya se resolvió antes de construir el pedido
        }

        verify(repo).findByCorreo(NORMAL);
        ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
        verify(repo).save(guardado.capture());
        assertThat(guardado.getValue().getCorreo()).isEqualTo(NORMAL);
    }

    @Test
    @DisplayName("ClerkSyncService: busca y crea la cuenta con el correo normalizado")
    void clerkSync() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        java.util.concurrent.atomic.AtomicReference<Usuario> guardado = new java.util.concurrent.atomic.AtomicReference<>();
        when(repo.findByClerkUserId(anyString())).thenReturn(Optional.empty());
        // Antes del alta no hay cuenta; después del alta, sync recarga por el correo del usuario guardado.
        when(repo.findByCorreo(anyString())).thenAnswer(i -> Optional.ofNullable(guardado.get()));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> {
            Usuario u = i.getArgument(0);
            if (u.getId() == null) u.setId(1L);
            u.setEstado(1);
            guardado.set(u);
            return u;
        });
        PasswordEncoder enc = mock(PasswordEncoder.class);
        when(enc.encode(any())).thenReturn("hash-fict");
        ClerkSyncService s = new ClerkSyncService();
        ReflectionTestUtils.setField(s, "usuarioRepository", repo);
        ReflectionTestUtils.setField(s, "rolRepository", mock(RolRepository.class));
        ReflectionTestUtils.setField(s, "passwordEncoder", enc);
        ReflectionTestUtils.setField(s, "authSupport", mock(AuthSupport.class));
        s.sync("user_fict123", MIXTO, "Cliente", "Mixto", "", true);

        ArgumentCaptor<Usuario> creado = ArgumentCaptor.forClass(Usuario.class);
        verify(repo, org.mockito.Mockito.atLeastOnce()).save(creado.capture());
        assertThat(creado.getAllValues().get(0).getCorreo()).isEqualTo(NORMAL);
        assertThat(creado.getAllValues().get(0).getClerkUserId()).isEqualTo("user_fict123");
    }
}
