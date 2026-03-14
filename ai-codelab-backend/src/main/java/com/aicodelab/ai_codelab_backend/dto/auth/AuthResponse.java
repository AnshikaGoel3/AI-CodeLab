package com.aicodelab.ai_codelab_backend.dto.auth;

import java.util.List;

public class AuthResponse {
    private String token;
    private String username;
    private List<String> solvedSlugs; // ← frontend syncs this to localStorage on login

    public AuthResponse(String token, String username, List<String> solvedSlugs) {
        this.token      = token;
        this.username   = username;
        this.solvedSlugs = solvedSlugs;
    }

    public String getToken()                          { return token; }
    public String getUsername()                       { return username; }
    public List<String> getSolvedSlugs()              { return solvedSlugs; }
}