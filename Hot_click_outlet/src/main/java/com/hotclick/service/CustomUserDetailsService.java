package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PermisoRepository permisoRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String correo) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + correo));

        List<GrantedAuthority> authorities = new ArrayList<>();

        usuario.getRoles().forEach(rol ->
            authorities.add(new SimpleGrantedAuthority("ROLE_" + rol.getNombreRol())));

        permisoRepository.findPermisosByUsuarioId(usuario.getId())
            .forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));

        return new User(usuario.getCorreo(), usuario.getContrasenaHash(), authorities);
    }
}
