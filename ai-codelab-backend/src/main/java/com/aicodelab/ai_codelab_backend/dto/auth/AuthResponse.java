package com.aicodelab.ai_codelab_backend.dto.auth;

public class AuthResponse {

    private String token;
    private String username;

    public AuthResponse(String token, String username) {
        this.token = token;
        this.username = username;
    }

    public String getToken() {
        return token;
    }

    public String getUsername() {
        return username;
    }
}