package com.aicodelab.ai_codelab_backend.service;

import com.aicodelab.ai_codelab_backend.dto.auth.*;
import com.aicodelab.ai_codelab_backend.model.User;
import com.aicodelab.ai_codelab_backend.repository.UserRepository;
import com.aicodelab.ai_codelab_backend.security.JwtService;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService      = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        User user = new User(
            request.getUsername(),
            request.getEmail(),
            passwordEncoder.encode(request.getPassword())
        );
        userRepository.save(user);
        String token = jwtService.generateToken(user.getId());
        return new AuthResponse(token, user.getUsername(), new ArrayList<>());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }
        String token = jwtService.generateToken(user.getId());
        // Return solved slugs so frontend can restore solved state immediately
        return new AuthResponse(token, user.getUsername(),
            user.getSolvedSlugs() != null ? user.getSolvedSlugs() : new ArrayList<>());
    }
}