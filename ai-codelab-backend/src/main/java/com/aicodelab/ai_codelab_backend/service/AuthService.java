package com.aicodelab.ai_codelab_backend.service;

import com.aicodelab.ai_codelab_backend.dto.auth.*;
import com.aicodelab.ai_codelab_backend.model.User;
import com.aicodelab.ai_codelab_backend.repository.SubmissionRepository;
import com.aicodelab.ai_codelab_backend.repository.UserRepository;
import com.aicodelab.ai_codelab_backend.security.JwtService;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AuthService {

    private final UserRepository       userRepository;
    private final PasswordEncoder      passwordEncoder;
    private final JwtService           jwtService;
    private final SubmissionRepository submissionRepository;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       SubmissionRepository submissionRepository) {
        this.userRepository       = userRepository;
        this.passwordEncoder      = passwordEncoder;
        this.jwtService           = jwtService;
        this.submissionRepository = submissionRepository;
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
        // New user has no solved problems
        return new AuthResponse(token, user.getUsername(), new ArrayList<>());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        String token = jwtService.generateToken(user.getId());

        // ── FIX: derive solvedSlugs from ACTUAL Accepted submissions ──────────
        // user.getSolvedSlugs() may hold stale/test data written during development.
        // Instead, query real Accepted submissions for this username so the
        // frontend always shows the correct count — not a stale MongoDB value.
        List<String> solvedSlugs = submissionRepository
            .findAcceptedSlugsByUsername(user.getUsername());

        return new AuthResponse(token, user.getUsername(),
            solvedSlugs != null ? solvedSlugs : new ArrayList<>());
    }
}